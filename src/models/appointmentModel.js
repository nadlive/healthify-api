const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TimeSlot = require('./timeSlot');
const Practitioner = require('./practitioner.model.entity');
const Patient = require('./patient.identity.model');

const Appointment = sequelize.define(
  'Appointment',
  {
    appointment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      autoIncrement: false,
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    practitioner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    consultationLog: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    appointment_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    appointment_mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    time_slot_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    appointmentCharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: 'Charge/Fee for the appointment',
    },
    subscriptionUsageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscription_usage',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('free', 'paid'),
      allowNull: false,
      defaultValue: 'free',
    },
    additionalDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'Booked',
        'Confirmed',
        'In Progress',
        'Pending Review',
        'Completed',
        'Cancelled',
        'Payment Pending',
      ),
      allowNull: false,
    },
    appointmentNoteByPatient: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

TimeSlot.hasMany(Appointment, {
  foreignKey: 'time_slot_id',
  as: 'appointments',
});
Appointment.belongsTo(TimeSlot, { foreignKey: 'time_slot_id', as: 'timeSlot' });
Appointment.belongsTo(Practitioner, {
  foreignKey: 'practitioner_id',
  targetKey: 'practitioner_id',
  as: 'practitioner',
});
Appointment.belongsTo(Patient, {
  foreignKey: 'patient_id',
  targetKey: 'patient_id',
  as: 'patient',
});

module.exports = Appointment;
