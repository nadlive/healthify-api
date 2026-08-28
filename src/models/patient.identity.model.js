const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user.model');

const Patient = sequelize.define(
  'patients',
  {
    patient_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      autoIncrement: false,
    },
    ehr_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'FHIR Patient resource ID from Google Cloud Healthcare',
    },
    prefix: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
    },
    country: {
      type: DataTypes.STRING,
    },
    timezone: {
      type: DataTypes.STRING,
    },
    preferredLanguage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'language1',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'patients',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userId'],
        name: 'unique_user_patient',
      },
      {
        fields: ['ehr_id'],
        name: 'idx_ehr_id',
      },
      {
        fields: ['userId'],
        name: 'idx_user_id',
      },
    ],
  },
);

module.exports = Patient;
