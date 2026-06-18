const {
  WearableDevice,
  DeviceMetrics,
  EverCareEnrollment,
} = require('../models');
const axios = require('axios');
const { Op, sequelize } = require('sequelize');

// Register a new wearable device
async function registerDevice(deviceData) {
  try {
    // Check if patient is enrolled in Ever Care Program
    const enrollment = await EverCareEnrollment.findOne({
      where: { patient_id: deviceData.patient_id, status: 'active' },
    });

    if (!enrollment) {
      throw new Error(
        'Patient must be enrolled in Ever Care Program to register devices',
      );
    }

    const device = await WearableDevice.create(deviceData);
    return device;
  } catch (error) {
    throw new Error(`Failed to register device: ${error.message}`);
  }
}

// Get all devices for a patient
async function getPatientDevices(patientId) {
  try {
    const devices = await WearableDevice.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: DeviceMetrics,
          as: 'metrics',
          limit: 10,
          order: [['recorded_at', 'DESC']],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return devices;
  } catch (error) {
    throw new Error(`Failed to get patient devices: ${error.message}`);
  }
}

// Get a specific device
async function getDeviceById(deviceId, patientId) {
  try {
    const device = await WearableDevice.findOne({
      where: { device_id: deviceId, patient_id: patientId },
      include: [
        {
          model: DeviceMetrics,
          as: 'metrics',
          order: [['recorded_at', 'DESC']],
        },
      ],
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return device;
  } catch (error) {
    throw new Error(`Failed to get device: ${error.message}`);
  }
}

// Update device information
async function updateDevice(deviceId, patientId, updateData) {
  try {
    const device = await WearableDevice.findOne({
      where: { device_id: deviceId, patient_id: patientId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    await device.update(updateData);
    return device;
  } catch (error) {
    throw new Error(`Failed to update device: ${error.message}`);
  }
}

// Remove a device
async function removeDevice(deviceId, patientId) {
  try {
    const device = await WearableDevice.findOne({
      where: { device_id: deviceId, patient_id: patientId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    await device.destroy();
    return { message: 'Device removed successfully' };
  } catch (error) {
    throw new Error(`Failed to remove device: ${error.message}`);
  }
}

// Sync device metrics from external API
async function syncDeviceMetrics(deviceId, patientId) {
  try {
    const device = await WearableDevice.findOne({
      where: { device_id: deviceId, patient_id: patientId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    if (!device.api_endpoint || !device.api_key) {
      throw new Error('Device API configuration not found');
    }

    // Fetch metrics from device API
    const response = await axios.get(device.api_endpoint, {
      headers: {
        Authorization: `Bearer ${device.api_key}`,
      },
      timeout: 10000,
    });

    const metrics = response.data.metrics || [];
    const savedMetrics = [];

    for (const metric of metrics) {
      const savedMetric = await DeviceMetrics.create({
        device_id: deviceId,
        patient_id: patientId,
        metric_type: metric.type,
        metric_value: metric.value,
        unit: metric.unit,
        recorded_at: metric.timestamp || new Date(),
        ehr_sync_status: 'pending',
      });

      savedMetrics.push(savedMetric);
    }

    // Update device last sync time
    await device.update({ last_sync: new Date() });

    return savedMetrics;
  } catch (error) {
    throw new Error(`Failed to sync device metrics: ${error.message}`);
  }
}

// Get device metrics for a specific time period
async function getDeviceMetrics(deviceId, patientId, startDate, endDate) {
  try {
    const whereClause = {
      device_id: deviceId,
      patient_id: patientId,
    };

    if (startDate && endDate) {
      whereClause.recorded_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    const metrics = await DeviceMetrics.findAll({
      where: whereClause,
      order: [['recorded_at', 'DESC']],
    });

    return metrics;
  } catch (error) {
    throw new Error(`Failed to get device metrics: ${error.message}`);
  }
}

// Sync metrics to EHR service
async function syncMetricsToEHR(patientId) {
  try {
    const pendingMetrics = await DeviceMetrics.findAll({
      where: {
        patient_id: patientId,
        ehr_sync_status: 'pending',
      },
      include: [
        {
          model: WearableDevice,
          as: 'device',
          attributes: ['device_name', 'device_type'],
        },
      ],
      order: [['recorded_at', 'ASC']],
    });

    if (pendingMetrics.length === 0) {
      return { message: 'No pending metrics to sync' };
    }

    const { syncHealthDataToEHR } = require('./integrationService');
    const syncedMetrics = [];

    for (const metric of pendingMetrics) {
      try {
        const ehrData = {
          patient_id: metric.patient_id,
          metric_type: metric.metric_type,
          value: metric.metric_value,
          unit: metric.unit,
          recorded_at: metric.recorded_at,
          source: `wearable_device:${metric.device.device_name}`,
          device_type: metric.device.device_type,
        };

        await syncHealthDataToEHR(ehrData);
        await metric.update({ ehr_sync_status: 'synced' });
        syncedMetrics.push(metric);
      } catch (error) {
        console.error(
          `Failed to sync metric ${metric.metric_id}:`,
          error.message,
        );
        await metric.update({ ehr_sync_status: 'failed' });
      }
    }

    return {
      message: `Synced ${syncedMetrics.length} metrics to EHR`,
      synced: syncedMetrics.length,
      failed: pendingMetrics.length - syncedMetrics.length,
    };
  } catch (error) {
    throw new Error(`Failed to sync metrics to EHR: ${error.message}`);
  }
}

// Get aggregated metrics for a patient
async function getAggregatedMetrics(patientId, metricType, period = '7d') {
  try {
    const endDate = new Date();
    let startDate;

    switch (period) {
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const metrics = await DeviceMetrics.findAll({
      where: {
        patient_id: patientId,
        metric_type: metricType,
        recorded_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('metric_value')), 'average'],
        [sequelize.fn('MIN', sequelize.col('metric_value')), 'minimum'],
        [sequelize.fn('MAX', sequelize.col('metric_value')), 'maximum'],
        [sequelize.fn('COUNT', sequelize.col('metric_id')), 'count'],
      ],
    });

    return metrics[0] || null;
  } catch (error) {
    throw new Error(`Failed to get aggregated metrics: ${error.message}`);
  }
}

// Test device connection
async function testDeviceConnection(deviceId, patientId) {
  try {
    const device = await WearableDevice.findOne({
      where: { device_id: deviceId, patient_id: patientId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    if (!device.api_endpoint || !device.api_key) {
      throw new Error('Device API configuration not found');
    }

    // Test API connection
    const response = await axios.get(device.api_endpoint, {
      headers: {
        Authorization: `Bearer ${device.api_key}`,
      },
      timeout: 5000,
    });

    return {
      status: 'connected',
      response_time: response.headers['x-response-time'] || 'unknown',
      api_version: response.data.version || 'unknown',
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
}

// Get device statistics for a patient
async function getDeviceStats(patientId) {
  try {
    const stats = await WearableDevice.findAll({
      where: { patient_id: patientId },
      attributes: [
        'device_type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('device_id')), 'count'],
      ],
      group: ['device_type', 'status'],
    });

    return stats;
  } catch (error) {
    throw new Error(`Failed to get device statistics: ${error.message}`);
  }
}

module.exports = {
  registerDevice,
  getPatientDevices,
  getDeviceById,
  updateDevice,
  removeDevice,
  syncDeviceMetrics,
  getDeviceMetrics,
  syncMetricsToEHR,
  getAggregatedMetrics,
  testDeviceConnection,
  getDeviceStats,
};
