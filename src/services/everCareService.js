const {
  EverCareEnrollment,
  CareGoal,
  CareTask,
  WearableDevice,
} = require('../models');
const sequelize = require('../config/sequelize');
const axios = require('axios');

// Enroll a patient in the Ever Care Program
async function enrollPatient(enrollmentData) {
  try {
    const enrollment = await EverCareEnrollment.create(enrollmentData);

    // Create initial care goals based on subscription tier
    await createInitialGoals(
      enrollment.patient_id,
      enrollment.provider_id,
      enrollment.subscription_tier,
    );

    return enrollment;
  } catch (error) {
    throw new Error(`Failed to enroll patient: ${error.message}`);
  }
}

// Get patient enrollment details
async function getPatientEnrollment(patientId) {
  try {
    const enrollment = await EverCareEnrollment.findOne({
      where: { patient_id: patientId },
      include: [
        {
          model: CareGoal,
          as: 'careGoals',
          include: [
            {
              model: CareTask,
              as: 'tasks',
            },
          ],
        },
        {
          model: WearableDevice,
          as: 'wearableDevices',
        },
      ],
    });

    if (!enrollment) {
      throw new Error('Patient not enrolled in Ever Care Program');
    }

    return enrollment;
  } catch (error) {
    throw new Error(`Failed to get patient enrollment: ${error.message}`);
  }
}

// Update enrollment details
async function updateEnrollment(patientId, updateData) {
  try {
    const enrollment = await EverCareEnrollment.findOne({
      where: { patient_id: patientId },
    });

    if (!enrollment) {
      throw new Error('Patient not enrolled in Ever Care Program');
    }

    await enrollment.update(updateData);
    return enrollment;
  } catch (error) {
    throw new Error(`Failed to update enrollment: ${error.message}`);
  }
}

// Terminate enrollment
async function terminateEnrollment(patientId, reason) {
  try {
    const enrollment = await EverCareEnrollment.findOne({
      where: { patient_id: patientId },
    });

    if (!enrollment) {
      throw new Error('Patient not enrolled in Ever Care Program');
    }

    await enrollment.update({
      status: 'terminated',
      notes: reason,
    });

    return enrollment;
  } catch (error) {
    throw new Error(`Failed to terminate enrollment: ${error.message}`);
  }
}

// Get all enrollments for a provider
async function getProviderEnrollments(providerId) {
  try {
    const enrollments = await EverCareEnrollment.findAll({
      where: { provider_id: providerId, status: 'active' },
      include: [
        {
          model: CareGoal,
          as: 'careGoals',
        },
      ],
    });

    return enrollments;
  } catch (error) {
    throw new Error(`Failed to get provider enrollments: ${error.message}`);
  }
}

// Create initial care goals based on subscription tier
async function createInitialGoals(patientId, providerId, subscriptionTier) {
  try {
    const defaultGoals = getDefaultGoalsByTier(subscriptionTier);

    for (const goalData of defaultGoals) {
      await CareGoal.create({
        ...goalData,
        patient_id: patientId,
        provider_id: providerId,
      });
    }
  } catch (error) {
    throw new Error(`Failed to create initial goals: ${error.message}`);
  }
}

// Get default goals based on subscription tier
function getDefaultGoalsByTier(tier) {
  const goals = {
    basic: [
      {
        title: 'Weekly Health Check-in',
        description: 'Regular health monitoring and consultation',
        category: 'monitoring',
        priority: 'medium',
      },
    ],
    premium: [
      {
        title: 'Weekly Health Check-in',
        description: 'Regular health monitoring and consultation',
        category: 'monitoring',
        priority: 'medium',
      },
      {
        title: 'Exercise Routine',
        description: 'Establish and maintain regular exercise habits',
        category: 'exercise',
        priority: 'high',
      },
      {
        title: 'Nutrition Monitoring',
        description: 'Track and improve dietary habits',
        category: 'diet',
        priority: 'medium',
      },
    ],
    elite: [
      {
        title: 'Weekly Health Check-in',
        description: 'Regular health monitoring and consultation',
        category: 'monitoring',
        priority: 'medium',
      },
      {
        title: 'Exercise Routine',
        description: 'Establish and maintain regular exercise habits',
        category: 'exercise',
        priority: 'high',
      },
      {
        title: 'Nutrition Monitoring',
        description: 'Track and improve dietary habits',
        category: 'diet',
        priority: 'medium',
      },
      {
        title: 'Sleep Quality Improvement',
        description: 'Monitor and enhance sleep patterns',
        category: 'lifestyle',
        priority: 'high',
      },
      {
        title: 'Stress Management',
        description: 'Implement stress reduction techniques',
        category: 'lifestyle',
        priority: 'medium',
      },
    ],
  };

  return goals[tier] || goals.basic;
}

// Get enrollment statistics
async function getEnrollmentStats() {
  try {
    const stats = await EverCareEnrollment.findAll({
      attributes: [
        'status',
        'subscription_tier',
        [sequelize.fn('COUNT', sequelize.col('enrollment_id')), 'count'],
      ],
      group: ['status', 'subscription_tier'],
    });

    return stats;
  } catch (error) {
    throw new Error(`Failed to get enrollment stats: ${error.message}`);
  }
}

module.exports = {
  enrollPatient,
  getPatientEnrollment,
  updateEnrollment,
  terminateEnrollment,
  getProviderEnrollments,
  createInitialGoals,
  getDefaultGoalsByTier,
  getEnrollmentStats,
};
