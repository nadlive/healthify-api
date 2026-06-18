const { Op } = require('sequelize');
const {
  Patient,
  User,
  UserSubscription,
  SubscriptionUsage,
  SubscriptionPlan,
} = require('../models');

class PatientService {
  async createOrUpdatePatient(patientData) {
    try {
      const [patient, created] = await Patient.findOrCreate({
        where: { userId: patientData.userId },
        defaults: {
          patient_id: patientData.id,
          userId: patientData.userId,
          ehr_id: patientData.id,
          firstName: patientData.demographics.firstName,
          lastName: patientData.demographics.lastName,
          gender: patientData.demographics.gender,
          dateOfBirth: patientData.demographics.dateOfBirth,
          email: patientData.contactInfo.email,
          phone: patientData.contactInfo.phone,
          address: patientData.demographics.address.street,
          country: patientData.demographics.address.country,
          timezone: patientData.demographics.timezone,
        },
      });

      if (!created) {
        patient.updatedAt = new Date();
        patient.gender = patientData.demographics.gender;
        patient.dateOfBirth = patientData.demographics.dateOfBirth;
        patient.phone = patientData.contactInfo.phone;
        patient.address = patientData.demographics.address.street;
        patient.country = patientData.demographics.address.country;
        patient.timezone = patientData.demographics.timezone;
        await patient.save();
      }

      return patient;
    } catch (error) {
      throw error;
    }
  }

  async getPatientByUserId(userId) {
    try {
      const patient = await Patient.findOne({
        where: { userId },
        include: [
          {
            model: require('../models/user.model'),
            as: 'user',
            attributes: ['id', 'username', 'email', 'role'],
          },
        ],
      });
      return patient;
    } catch (error) {
      throw error;
    }
  }

  async getPatientByEhrId(ehrId) {
    try {
      const patient = await Patient.findOne({
        where: { ehr_id: ehrId },
        include: [
          {
            model: require('../models/user.model'),
            as: 'user',
            attributes: ['id', 'username', 'email', 'role'],
          },
        ],
      });
      return patient;
    } catch (error) {
      throw error;
    }
  }

  async getPatientById(patientId) {
    try {
      const patient = await Patient.findByPk(patientId, {
        include: [
          {
            model: require('../models/user.model'),
            as: 'user',
            attributes: ['id', 'username', 'email', 'role'],
          },
        ],
      });
      return patient;
    } catch (error) {
      throw error;
    }
  }

  async searchPatients(query) {
    try {
      const where = query?.trim()
        ? {
            [Op.or]: [
              { firstName: { [Op.like]: `%${query}%` } },
              { lastName: { [Op.like]: `%${query}%` } },
              { email: { [Op.like]: `%${query}%` } },
              { phone: { [Op.like]: `%${query}%` } },
              { address: { [Op.like]: `%${query}%` } },
              { country: { [Op.like]: `%${query}%` } },
            ],
          }
        : {};
      const patients = await Patient.findAll({
        where,
        attributes: [
          'patient_id',
          'firstName',
          'lastName',
          'email',
          'phone',
          'gender',
          'address',
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: [
              'id',
              'username',
              'email',
              'role',
              'isActive',
              'isOverdue',
            ],
            include: [
              {
                model: UserSubscription,
                as: 'subscriptions',
                required: false,
                where: { status: 'active' },
                attributes: ['status'],
                include: [
                  {
                    model: SubscriptionPlan,
                    as: 'plan',
                    attributes: ['displayName', 'price', 'billingPeriod'],
                  },
                ],
              },
              {
                model: SubscriptionUsage,
                as: 'subscriptionUsages',
                required: false,
                where: { status: 'active' },
                attributes: [
                  'id',
                  'limit',
                  'periodStart',
                  'periodEnd',
                  'status',
                ],
              },
            ],
          },
        ],
      });
      return patients;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PatientService();
