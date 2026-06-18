require('dotenv').config();
const sequelize = require('../src/config/sequelize');

const {
  User,
  Patient,
  Appointment,
  InvoiceItem,
  Invoice,
  Prescription,
  Payment,
  UserSubscription,
  SubscriptionUsage,
  Chat,
} = require('../src/models');

(async () => {
  const transaction = await sequelize.transaction();

  try {
    const patientUsers = await User.findAll({
      where: { role: 'patient' },
      attributes: ['id'],
      transaction,
    });

    if (!patientUsers.length) {
      await transaction.commit();
      process.exit(0);
    }

    // @ts-ignore
    const userIds = patientUsers.map((u) => u.id);

    const patients = await Patient.findAll({
      where: { userId: userIds },
      attributes: ['patient_id'],
      transaction,
    });

    // @ts-ignore
    const patientIds = patients.map((p) => p.patient_id);

    await InvoiceItem.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction,
    });

    await Invoice.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction,
    });

    await Prescription.destroy({
      where: { patient_id: patientIds },
      transaction,
    });

    await Appointment.destroy({
      where: { patient_id: patientIds },
      transaction,
    });

    await Payment.destroy({
      where: { userId: userIds },
      transaction,
    });

    await UserSubscription.destroy({
      where: { userId: userIds },
      transaction,
    });

    await SubscriptionUsage.destroy({
      where: { userId: userIds },
      transaction,
    });

    await Patient.destroy({
      where: { patient_id: patientIds },
      transaction,
    });

    await User.destroy({
      where: { id: userIds },
      transaction,
    });

    await Chat.destroy({
      where: { userId: userIds },
      transaction,
    });

    await transaction.commit();
    console.log('ALL patient-related data + invoices removed successfully.');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    process.exit(1);
  }
})();
