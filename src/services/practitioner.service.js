const Practitioner = require('../models/practitioner.model.entity');
const User = require('../models/user.model');
const Speciality = require('../models/speciality.model');
const sequelize = require('../config/sequelize');
const ProviderWorkingHours = require('../models/providerWorkingHours');
const { sendConfirmationEmailToPractitioner } = require('./email.service');
const { getActiveSubscriptionUsage } = require('./subscriptionUsage.service');

class PractitionerService {
  async getActivePractitioners(userId) {
    const subscriptionUsage = await getActiveSubscriptionUsage(userId);

    const practitioners = await Practitioner.findAll({
      where: {
        isActive: true,
      },
      include: [
        {
          model: Speciality,
          as: 'specialities',
          attributes: ['id', 'name'],
        },
      ],
    });

    return practitioners.map((practitioner) => {
      const practitionerData = practitioner.toJSON();
      const fullName = [
        practitionerData.prefix,
        practitionerData.firstName,
        practitionerData.lastName,
      ]
        .filter(Boolean)
        .join(' ');

      const specialities = (practitionerData.specialities || []).map(
        (spec) => ({
          id: spec.id,
          name: spec.name,
        }),
      );

      return {
        practitionerId: practitionerData.practitioner_id,
        active: practitionerData.isActive,
        fullName,
        prefix: practitionerData.prefix || '',
        firstName: practitionerData.firstName,
        lastName: practitionerData.lastName,
        email: practitionerData.email || '',
        phone: practitionerData.phone || '',
        specialities: specialities,
        licenses: practitionerData.qualifications || [],
        fee: practitionerData.fee || '',
        freeAppointmentBalance: subscriptionUsage.freeAppointmentBalance,
        appointmentFee: practitionerData.fee || '',
      };
    });
  }

  async createPractitioner(practitionerData) {
    try {
      const user = await User.findOne({
        where: {
          email: practitionerData.email,
        },
      });

      if (user) {
        throw new Error('User already exists');
      }

      const transaction = await sequelize.transaction();

      try {
        const createdUser = await User.create(
          {
            email: practitionerData.email,
            username: practitionerData.email,
            role: 'practitioner',
            isActive: true,
          },
          { transaction },
        );

        let licenses = [];
        if (practitionerData.licenses) {
          licenses =
            typeof practitionerData.licenses === 'string'
              ? JSON.parse(practitionerData.licenses)
              : practitionerData.licenses;
        }

        const createdPractitioner = await Practitioner.create(
          {
            firstName: practitionerData.firstName,
            lastName: practitionerData.lastName,
            prefix: practitionerData.prefix || null,
            email: practitionerData.email,
            gender: practitionerData.gender || '',
            phone: practitionerData.phone || '',
            fee: practitionerData.fee || 0,
            qualifications: licenses,
            isActive:
              practitionerData.isActive !== undefined
                ? practitionerData.isActive
                : true,
            userId: createdUser.id,
          },
          { transaction },
        );

        if (
          practitionerData.doctorDetails?.specialities &&
          practitionerData.doctorDetails.specialities.length > 0
        ) {
          await createdPractitioner.setSpecialities(
            practitionerData.doctorDetails.specialities,
            { transaction },
          );
        }

        await sendConfirmationEmailToPractitioner(practitionerData);

        await transaction.commit();
        return createdPractitioner.toJSON();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating practitioner:', error);
      throw error;
    }
  }

  async getPractitioner(practitionerId) {
    const practitioner = await Practitioner.findOne({
      where: {
        practitioner_id: practitionerId,
      },
      include: [
        {
          model: Speciality,
          as: 'specialities',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!practitioner) {
      return null;
    }

    const practitionerData = practitioner.toJSON();
    const fullName = [
      practitionerData.prefix,
      practitionerData.firstName,
      practitionerData.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    const specialities = (practitionerData.specialities || []).map((spec) => ({
      id: spec.id,
      name: spec.name,
    }));

    return {
      practitionerId: practitionerData.practitioner_id,
      active: practitionerData.isActive,
      fullName,
      prefix: practitionerData.prefix || '',
      firstName: practitionerData.firstName,
      lastName: practitionerData.lastName,
      fee: practitionerData.fee,
      email: practitionerData.email || '',
      phone: practitionerData.phone || '',
      gender: practitionerData.gender || '',
      specialities: specialities,
      licenses: practitionerData.qualifications || [],
    };
  }

  async updatePractitioner(practitionerId, updateData) {
    try {
      const transaction = await sequelize.transaction();

      try {
        let licenses = null;
        if (updateData.licenses !== undefined) {
          licenses = updateData.licenses;
          if (typeof updateData.licenses === 'string') {
            try {
              licenses = JSON.parse(updateData.licenses);
            } catch (e) {
              licenses = [];
            }
          }
        }

        const updateFields = {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          prefix: updateData.prefix !== undefined ? updateData.prefix : null,
          fee: updateData.fee,
          isActive: updateData.isActive,
        };

        if (updateData.email !== undefined) {
          updateFields.email = updateData.email;
        }
        if (updateData.phone !== undefined) {
          updateFields.phone = updateData.phone;
        }
        if (updateData.gender !== undefined) {
          updateFields.gender = updateData.gender;
        }
        if (licenses !== null) {
          updateFields.qualifications = licenses;
        }

        await Practitioner.update(updateFields, {
          where: { practitioner_id: practitionerId },
          transaction,
        });

        if (updateData.doctorDetails?.specialities !== undefined) {
          const practitioner = await Practitioner.findByPk(practitionerId, {
            transaction,
          });
          if (practitioner) {
            await practitioner.setSpecialities(
              updateData.doctorDetails.specialities || [],
              { transaction },
            );
          }
        }

        await transaction.commit();

        const updatedPractitioner = await Practitioner.findByPk(
          practitionerId,
          {
            include: [
              {
                model: Speciality,
                as: 'specialities',
                attributes: ['id', 'name'],
              },
            ],
          },
        );

        if (!updatedPractitioner) {
          return null;
        }

        const practitionerData = updatedPractitioner.toJSON();
        const fullName = [
          practitionerData.prefix,
          practitionerData.firstName,
          practitionerData.lastName,
        ]
          .filter(Boolean)
          .join(' ');

        const specialities = (practitionerData.specialities || []).map(
          (spec) => ({
            id: spec.id,
            name: spec.name,
          }),
        );

        return {
          practitionerId: practitionerData.practitioner_id,
          active: practitionerData.isActive,
          fullName,
          prefix: practitionerData.prefix || '',
          firstName: practitionerData.firstName,
          lastName: practitionerData.lastName,
          email: practitionerData.email || '',
          phone: practitionerData.phone || '',
          fee: practitionerData.fee || 0,
          specialities: specialities,
          licenses: practitionerData.qualifications || [],
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating practitioner:', error);
      throw error;
    }
  }

  async searchPractitioners() {
    try {
      const practitioners = await Practitioner.findAll({
        where: {
          isActive: true,
        },
        include: [
          {
            model: Speciality,
            as: 'specialities',
            attributes: ['id', 'name'],
          },
        ],
      });

      return practitioners.map((practitioner) => {
        const practitionerData = practitioner.toJSON();
        const fullName = [
          practitionerData.prefix,
          practitionerData.firstName,
          practitionerData.lastName,
        ]
          .filter(Boolean)
          .join(' ');

        const specialities = (practitionerData.specialities || []).map(
          (spec) => ({
            id: spec.id,
            name: spec.name,
          }),
        );

        return {
          practitionerId: practitionerData.practitioner_id,
          active: practitionerData.isActive,
          fullName,
          prefix: practitionerData.prefix || '',
          firstName: practitionerData.firstName,
          lastName: practitionerData.lastName,
          email: practitionerData.email || '',
          phone: practitionerData.phone || '',
          specialities: specialities,
          licenses: practitionerData.qualifications || [],
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async deletePractitioner(practitionerId) {
    const deleted = await Practitioner.destroy({
      where: { practitioner_id: practitionerId },
    });
    return deleted;
  }

  async upsertProviderWorkingHours(providerId, workingHoursArray) {
    for (const workingHour of workingHoursArray) {
      const [workingHours, created] = await ProviderWorkingHours.findOrCreate({
        where: {
          provider_id: providerId,
          dayOfWeek: workingHour.dayOfWeek,
        },
        defaults: {
          provider_id: providerId,
          dayOfWeek: workingHour.dayOfWeek,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          isAvailable:
            workingHour.isAvailable !== undefined
              ? workingHour.isAvailable
              : true,
        },
      });

      if (!created) {
        await workingHours.update({
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          isAvailable:
            workingHour.isAvailable !== undefined
              ? workingHour.isAvailable
              : workingHours.isAvailable,
        });
      }
    }
    return true;
  }

  async getProviderWorkingHours(providerId) {
    const workingHours = await ProviderWorkingHours.findAll({
      where: { provider_id: providerId },
    });
    return workingHours;
  }
}

module.exports = new PractitionerService();
