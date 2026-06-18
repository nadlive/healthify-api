const { Prescription, PrescriptionItem } = require('../models');
const {
  generatePrescriptionNumber,
} = require('../utils/prescriptionNumberGenerator');
const { generatePrescriptionPDF } = require('../utils/pdfGenerator');
const { generateSimpleSignature } = require('../utils/digitalSignature');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

const createPrescription = async (prescriptionData, itemsData, providerId) => {
  try {
    // Validate appointment is completed
    const appointment = await validateAppointment(
      prescriptionData.appointment_id,
      providerId,
    );

    // Check if prescription already exists for this appointment
    const existingPrescription = await Prescription.findOne({
      where: { appointment_id: prescriptionData.appointment_id },
    });

    if (existingPrescription) {
      throw new Error('Prescription already exists for this appointment');
    }

    // Generate prescription number
    const prescriptionNumber = generatePrescriptionNumber();

    // Create prescription
    const prescription = await Prescription.create({
      ...prescriptionData,
      prescription_number: prescriptionNumber,
      provider_id: providerId,
      prescription_date: new Date(),
      is_editable: true,
    });

    // Create prescription items
    if (itemsData && itemsData.length > 0) {
      const items = await Promise.all(
        itemsData.map((item) =>
          PrescriptionItem.create({
            ...item,
            prescription_id: prescription.id,
          }),
        ),
      );
      prescription.items = items;
    }

    return prescription;
  } catch (error) {
    throw new Error(`Failed to create prescription: ${error.message}`);
  }
};

const getPrescriptionById = async (prescriptionId) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId },
      include: [
        {
          model: PrescriptionItem,
          as: 'items',
        },
      ],
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    return prescription;
  } catch (error) {
    throw new Error(`Failed to get prescription: ${error.message}`);
  }
};

const getPrescriptionsByPatient = async (patientId) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: PrescriptionItem,
          as: 'items',
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return prescriptions;
  } catch (error) {
    throw new Error(`Failed to get patient prescriptions: ${error.message}`);
  }
};

const getPrescriptionsByProvider = async (providerId) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: { provider_id: providerId },
      include: [
        {
          model: PrescriptionItem,
          as: 'items',
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return prescriptions;
  } catch (error) {
    throw new Error(`Failed to get provider prescriptions: ${error.message}`);
  }
};

const updatePrescription = async (prescriptionId, updateData, providerId) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, provider_id: providerId },
    });

    if (!prescription) {
      throw new Error('Prescription not found or access denied');
    }

    if (!prescription.is_editable) {
      throw new Error('Prescription cannot be edited after signing');
    }

    // Update prescription
    await prescription.update(updateData);

    // Update items if provided
    if (updateData.items) {
      // Remove existing items
      await PrescriptionItem.destroy({
        where: { prescription_id: prescriptionId },
      });

      // Create new items
      await Promise.all(
        updateData.items.map((item) =>
          PrescriptionItem.create({
            ...item,
            prescription_id: prescriptionId,
          }),
        ),
      );
    }

    return await getPrescriptionById(prescriptionId, providerId, 'provider');
  } catch (error) {
    throw new Error(`Failed to update prescription: ${error.message}`);
  }
};

const signPrescription = async (prescriptionId, providerId) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, provider_id: providerId },
      include: [
        {
          model: PrescriptionItem,
          as: 'items',
        },
      ],
    });

    if (!prescription) {
      throw new Error('Prescription not found or access denied');
    }

    if (!prescription.is_editable) {
      throw new Error('Prescription is already signed');
    }

    // Generate digital signature
    const signatureData = {
      id: prescription.id,
      prescription_number: prescription.prescription_number,
      appointment_id: prescription.appointment_id,
      patient_id: prescription.patient_id,
      provider_id: prescription.provider_id,
      prescription_date: prescription.prescription_date,
    };

    const digitalSignature = generateSimpleSignature(signatureData);

    // Update prescription with signature
    await prescription.update({
      digital_signature: digitalSignature,
      signature_timestamp: new Date(),
      is_editable: false,
      status: 'active',
    });

    // Generate PDF
    const pdfPath = await generatePrescriptionPDFForService(prescription.id);

    // Update prescription with PDF path
    await prescription.update({ pdf_path: pdfPath });

    return await getPrescriptionById(prescriptionId, providerId, 'provider');
  } catch (error) {
    throw new Error(`Failed to sign prescription: ${error.message}`);
  }
};

const generatePrescriptionPDFForService = async (prescriptionId) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId },
      include: [
        {
          model: PrescriptionItem,
          as: 'items',
        },
      ],
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    // Get patient and provider information from identity service
    const [patient, provider] = await Promise.all([
      getUserInfo(prescription.patient_id),
      getUserInfo(prescription.provider_id),
    ]);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate PDF
    const fileName = `prescription_${prescription.prescription_number}_${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, fileName);

    await generatePrescriptionPDF(
      prescription,
      prescription.items,
      provider,
      patient,
      outputPath,
    );

    return outputPath;
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

const validateAppointment = async (appointmentId, providerId) => {
  try {
    // Call appointment service to validate
    const response = await axios.get(
      `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
    );

    const appointment = response.data;

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'Completed') {
      throw new Error(
        'Prescription can only be created for completed appointments',
      );
    }

    if (appointment.provider_id !== providerId) {
      throw new Error(
        'You can only create prescriptions for your own appointments',
      );
    }

    return appointment;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Appointment validation failed: ${error.response.data.message || 'Unknown error'}`,
      );
    }
    throw new Error(`Appointment validation failed: ${error.message}`);
  }
};

const getUserInfo = async (userId) => {
  try {
    const response = await axios.get(
      `${process.env.IDENTITY_SERVICE_URL}/api/auth/users/${userId}`,
    );
    return response.data;
  } catch (error) {
    // Return basic info if service is unavailable
    return {
      id: userId,
      username: 'Unknown User',
      email: 'unknown@example.com',
    };
  }
};

const deletePrescription = async (prescriptionId, providerId) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, provider_id: providerId },
    });

    if (!prescription) {
      throw new Error('Prescription not found or access denied');
    }

    if (!prescription.is_editable) {
      throw new Error('Cannot delete signed prescription');
    }

    // Delete associated items first
    await PrescriptionItem.destroy({
      where: { prescription_id: prescriptionId },
    });

    // Delete prescription
    await prescription.destroy();

    return true;
  } catch (error) {
    throw new Error(`Failed to delete prescription: ${error.message}`);
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient,
  getPrescriptionsByProvider,
  updatePrescription,
  signPrescription,
  generatePrescriptionPDFForService,
  validateAppointment,
  getUserInfo,
  deletePrescription,
};
