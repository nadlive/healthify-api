const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Define the TimeSlot model
const TimeSlot = sequelize.define(
  'TimeSlot',
  {
    time_slot_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      autoIncrement: false,
    },
    provider_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    appointment_type: {
      type: DataTypes.ENUM('Video', 'Chat'),
      allowNull: true,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_booked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'time_slots',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['provider_id', 'start_time', 'end_time'],
        name: 'time_slots_provider_start_end_unique',
      },
    ],
  },
);

module.exports = TimeSlot;
