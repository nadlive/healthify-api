const sequelize = require('../config/sequelize');

// Subscription-Billing models
const SubscriptionPlan = require('./subscriptionPlan.model')(sequelize);
const UserSubscription = require('./userSubscription.model')(sequelize);
const SubscriptionUsage = require('./subscriptionUsage.model')(sequelize);
const Transaction = require('./transaction.model')(sequelize);
const Invoice = require('./invoice.model')(sequelize);
const InvoiceItem = require('./invoiceItem.model')(sequelize);
const PaymentMethod = require('./paymentMethod.model')(sequelize);
const Payment = require('./payment.model')(sequelize);

// Identity models
const User = require('./user.model');
const Patient = require('./patient.identity.model');
const PatientFile = require('./patientFiles.model');
const PractitionerFile = require('./practitionerFiles.model');

// EHR models
const Practitioner = require('./practitioner.model.entity');
const Speciality = require('./speciality.model');

// Appointment models
const Appointment = require('./appointmentModel');
const ProviderWorkingHours = require('./providerWorkingHours');
const TimeSlot = require('./timeSlot');

// Communication models
const Chat = require('./chat')(sequelize);

// Prescriptions models
const Prescription = require('./prescriptionModel');
const PrescriptionItem = require('./prescriptionItemModel');

SubscriptionPlan.hasMany(UserSubscription, {
  foreignKey: 'planId',
  as: 'subscriptions',
});

UserSubscription.belongsTo(SubscriptionPlan, {
  foreignKey: 'planId',
  as: 'plan',
});

UserSubscription.hasMany(Transaction, {
  foreignKey: 'userSubscriptionId',
  as: 'transactions',
});

Transaction.belongsTo(UserSubscription, {
  foreignKey: 'userSubscriptionId',
  as: 'userSubscription',
});

Invoice.hasMany(Payment, {
  foreignKey: 'invoiceId',
  as: 'payments',
});

Invoice.hasMany(InvoiceItem, {
  foreignKey: 'invoiceId',
  as: 'items',
  onDelete: 'CASCADE',
});

InvoiceItem.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice',
});

InvoiceItem.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  targetKey: 'appointment_id',
  as: 'appointment',
});

Invoice.belongsTo(Patient, {
  foreignKey: 'userId',
  targetKey: 'userId',
  as: 'patient',
  constraints: false,
});

Patient.hasMany(Invoice, {
  foreignKey: 'userId',
  sourceKey: 'userId',
  as: 'invoices',
  constraints: false,
});

Payment.belongsTo(SubscriptionUsage, {
  foreignKey: 'subscriptionUsageId',
  as: 'subscriptionUsage',
});

Transaction.hasMany(Payment, {
  foreignKey: 'transactionId',
  as: 'payments',
});

Payment.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});

UserSubscription.hasOne(SubscriptionUsage, {
  foreignKey: 'subscriptionId',
  as: 'usageRecords',
});

SubscriptionUsage.hasMany(Payment, {
  foreignKey: 'subscriptionUsageId',
  as: 'payments',
});

SubscriptionUsage.belongsTo(UserSubscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription',
});

SubscriptionUsage.hasMany(Transaction, {
  foreignKey: 'subscriptionUsageId',
  as: 'transactions',
});

SubscriptionUsage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

SubscriptionUsage.belongsTo(Patient, {
  foreignKey: 'userId',
  targetKey: 'userId',
  as: 'patient',
});

Transaction.belongsTo(SubscriptionUsage, {
  foreignKey: 'subscriptionUsageId',
  as: 'subscriptionUsage',
});

Transaction.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  as: 'appointment',
});

User.hasOne(Patient, {
  foreignKey: 'userId',
  as: 'patient',
});

User.hasOne(Practitioner, {
  foreignKey: 'userId',
  as: 'practitioner',
});

Patient.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(UserSubscription, {
  foreignKey: 'userId',
  as: 'subscriptions',
});

UserSubscription.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(SubscriptionUsage, {
  foreignKey: 'userId',
  as: 'subscriptionUsages',
});

User.hasMany(Payment, {
  foreignKey: 'userId',
  as: 'payments',
});

Payment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Practitioner.belongsToMany(Speciality, {
  through: 'practitioner_specialities',
  foreignKey: 'practitioner_id',
  otherKey: 'speciality_id',
  as: 'specialities',
  timestamps: false,
});

Speciality.belongsToMany(Practitioner, {
  through: 'practitioner_specialities',
  foreignKey: 'speciality_id',
  otherKey: 'practitioner_id',
  as: 'practitioners',
  timestamps: false,
});

Practitioner.belongsTo(User, {
  foreignKey: 'userId',
  as: 'User',
});
PatientFile.belongsTo(Appointment, {
  foreignKey: 'appointment_id',
  as: 'appointment',
});

Appointment.hasMany(Transaction, {
  foreignKey: 'appointmentId',
  as: 'transactions',
});

Appointment.hasMany(PractitionerFile, {
  foreignKey: 'appointment_id',
  as: 'practitionerFiles',
});

Appointment.hasMany(PatientFile, {
  foreignKey: 'appointment_id',
  as: 'patientFiles',
});

Appointment.hasMany(Prescription, {
  foreignKey: 'appointment_id',
  as: 'prescription',
});

Appointment.hasOne(Chat, {
  foreignKey: 'appointmentId',
  as: 'chat',
});

Appointment.hasMany(InvoiceItem, {
  foreignKey: 'appointmentId',
  sourceKey: 'appointment_id',
  as: 'invoiceItems',
});

PractitionerFile.belongsTo(Appointment, {
  foreignKey: 'appointment_id',
  as: 'appointment',
});

Prescription.hasMany(PrescriptionItem, {
  foreignKey: 'prescription_id',
  as: 'items',
  onDelete: 'CASCADE',
});

PrescriptionItem.belongsTo(Prescription, {
  foreignKey: 'prescription_id',
  as: 'prescription',
});

Prescription.belongsTo(Appointment, {
  foreignKey: 'appointment_id',
  as: 'appointment',
});

Patient.hasMany(Prescription, {
  foreignKey: 'patient_id',
  as: 'prescriptions',
});

Prescription.belongsTo(Patient, {
  foreignKey: 'patient_id',
  as: 'patient',
});

Practitioner.hasMany(Prescription, {
  foreignKey: 'provider_id',
  as: 'prescriptions',
});

Prescription.belongsTo(Practitioner, {
  foreignKey: 'provider_id',
  as: 'provider',
});

Payment.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice',
});

Chat.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Chat.belongsTo(Practitioner, {
  foreignKey: 'practitionerId',
  as: 'practitioner',
});

Chat.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  as: 'appointment',
});

TimeSlot.belongsTo(Appointment, {
  foreignKey: 'time_slot_id',
  as: 'appointment',
});

TimeSlot.belongsTo(Practitioner, {
  foreignKey: 'provider_id',
  as: 'provider',
});

module.exports = {
  sequelize,
  // Subscription-Billing
  SubscriptionPlan,
  UserSubscription,
  SubscriptionUsage,
  Transaction,
  Invoice,
  InvoiceItem,
  PaymentMethod,
  Payment,
  User,
  Patient,
  // EHR
  Practitioner,
  Speciality,
  // Appointment
  Appointment,
  ProviderWorkingHours,
  TimeSlot,
  // Communication
  Chat,

  // Prescriptions
  Prescription,
  PrescriptionItem,
};
