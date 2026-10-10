const User = require('../models/user.model');
const Patient = require('../models/patient.identity.model');
const Practitioner = require('../models/practitioner.model.entity');
const { UserSubscription, SubscriptionPlan } = require('../models');
const { PATIENT_ROLE } = require('../constants/auth');
class UserService {
  isProfileCompleted = (patient) => {
    if (
      !patient ||
      !patient.phone ||
      !patient.firstName ||
      !patient.lastName ||
      !patient.gender ||
      !patient.address ||
      !patient.dateOfBirth
    ) {
      return false;
    }

    return true;
  };

  getUserProfile = async (userId) => {
    const userProfile = await User.findOne({ where: { id: userId } });

    const patient = await Patient.findOne({ where: { userId: userId } });
    const practitioner = await Practitioner.findOne({
      where: { userId: userId },
    });

    let plan = null;
    let subscription = null;

    // @ts-ignore
    if (userProfile.role === PATIENT_ROLE) {
      subscription = await UserSubscription.findOne({
        // @ts-ignore
        where: { userId: userProfile.id, status: 'active' },
      });

      if (subscription?.planId) {
        plan = await SubscriptionPlan.findOne({
          where: { id: subscription.planId },
        });
      }
    }

    return {
      // @ts-ignore
      id: userProfile.id,
      // @ts-ignore
      username: userProfile.username,
      // @ts-ignore
      email: userProfile.email,
      // @ts-ignore
      role: userProfile.role,
      // @ts-ignore
      isActive: userProfile.isActive,
      // @ts-ignore
      createdAt: userProfile.createdAt,
      // @ts-ignore
      updatedAt: userProfile.updatedAt,
      // @ts-ignore
      patientId: patient?.patient_id || null,
      // @ts-ignore
      practitionerId: practitioner?.practitioner_id || null,
      // @ts-ignore
      preferredLanguage: patient?.preferredLanguage || 'language1',
      // @ts-ignore
      isProfileCompleted: this.isProfileCompleted(patient),
      subscription,
      plan,
    };
  };

  changeActiveStatus = async (status, userId) => {
    const user = await User.findOne({ where: { id: userId } });
    // @ts-ignore
    user.isActive = status === 'active' ? true : false;
    await user.save();
    return user;
  };

  changeOverdueStatus = async (status, userId) => {
    const user = await User.findOne({ where: { id: userId } });
    // @ts-ignore
    user.isOverdue = status === 'overdue' ? true : false;
    await user.save();
    return user;
  };

  saveFcmToken = async (userId, token) => {
    const [updated] = await User.unscoped().update(
      { fcmToken: token },
      { where: { id: userId } },
    );
    return updated > 0;
  };

  getUserByUserId = async (userId) => {
    return await User.findOne({
      where: { id: userId },
      include: [
        { model: Patient, as: 'patient', required: false },
        { model: Practitioner, as: 'practitioner', required: false },
      ],
    });
  };
}

module.exports = new UserService();
