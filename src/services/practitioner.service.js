const Practitioner = require('../models/practitioner.model.entity');
const User = require('../models/user.model');
const Speciality = require('../models/speciality.model');
const sequelize = require('../config/sequelize');
const ProviderWorkingHours = require('../models/providerWorkingHours');
const { sendConfirmationEmailToPractitioner } = require('./email.service');
const { getActiveSubscriptionUsage } = require('./subscriptionUsage.service');
const {
  normalizeLocalizedNames,
  getPrimaryName,
  mapSpecialityResponse,
} = require('../constants/languages');

const SPECIALITY_ATTRIBUTES = ['id', 'name', 'nameLanguage2', 'nameLanguage3'];

const buildFullName = ({ prefix, firstName, lastName }) =>
  [prefix, firstName, lastName].filter(Boolean).join(' ');

const mapSpecialities = (specialities = []) =>
  specialities.map((spec) => mapSpecialityResponse(spec));

const mapPractitionerResponse = (practitionerData) => {
  const names = normalizeLocalizedNames(practitionerData);
  const primaryName = getPrimaryName(names);
  const prefix = primaryName.prefix || practitionerData.prefix || '';
  const firstName = primaryName.firstName || practitionerData.firstName || '';
  const lastName = primaryName.lastName || practitionerData.lastName || '';

  return {
    practitionerId: practitionerData.practitioner_id,
    active: practitionerData.isActive,
    fullName: buildFullName({ prefix, firstName, lastName }),
    names,
    prefix,
    firstName,
    lastName,
    email: practitionerData.email || '',
    phone: practitionerData.phone || '',
    gender: practitionerData.gender || '',
    fee: practitionerData.fee || '',
    specialities: mapSpecialities(practitionerData.specialities),
    licenses: practitionerData.qualifications || [],
  };
};

const resolveNameFields = (practitionerData = {}) => {
  const names = normalizeLocalizedNames(practitionerData);
  const primaryName = getPrimaryName(names);

  return {
    names,
    prefix: primaryName.prefix || null,
    firstName: primaryName.firstName || '',
    lastName: primaryName.lastName || '',
  };
};

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
          attributes: SPECIALITY_ATTRIBUTES,
        },
      ],
    });

    return practitioners.map((practitioner) => {
      const mapped = mapPractitionerResponse(practitioner.toJSON());
      return {
        ...mapped,
        freeAppointmentBalance: subscriptionUsage.freeAppointmentBalance,
        appointmentFee: mapped.fee || '',
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

      const { names, prefix, firstName, lastName } =
        resolveNameFields(practitionerData);

      if (!firstName || !lastName) {
        throw new Error(
          'Validation: English first name and last name are required',
        );
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
            firstName,
            lastName,
            prefix,
            names,
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

        await sendConfirmationEmailToPractitioner({
          ...practitionerData,
          prefix,
          firstName,
          lastName,
          names,
        });

        await transaction.commit();
        return mapPractitionerResponse(createdPractitioner.toJSON());
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
          attributes: SPECIALITY_ATTRIBUTES,
        },
      ],
    });

    if (!practitioner) {
      return null;
    }

    return mapPractitionerResponse(practitioner.toJSON());
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
          fee: updateData.fee,
          isActive: updateData.isActive,
        };

        if (
          updateData.names !== undefined ||
          updateData.firstName !== undefined
        ) {
          const { names, prefix, firstName, lastName } =
            resolveNameFields(updateData);

          if (!firstName || !lastName) {
            throw new Error(
              'Validation: English first name and last name are required',
            );
          }

          updateFields.names = names;
          updateFields.prefix = prefix;
          updateFields.firstName = firstName;
          updateFields.lastName = lastName;
        } else {
          if (updateData.prefix !== undefined) {
            updateFields.prefix = updateData.prefix;
          }
          if (updateData.firstName !== undefined) {
            updateFields.firstName = updateData.firstName;
          }
          if (updateData.lastName !== undefined) {
            updateFields.lastName = updateData.lastName;
          }
        }

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
                attributes: SPECIALITY_ATTRIBUTES,
              },
            ],
          },
        );

        if (!updatedPractitioner) {
          return null;
        }

        return mapPractitionerResponse(updatedPractitioner.toJSON());
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
            attributes: SPECIALITY_ATTRIBUTES,
          },
        ],
      });

      return practitioners.map((practitioner) =>
        mapPractitionerResponse(practitioner.toJSON()),
      );
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
