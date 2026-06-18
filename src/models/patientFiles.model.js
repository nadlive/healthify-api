const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PatientFile = sequelize.define(
  'patient_files',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    appointment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    s3_key: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'S3 object key',
    },

    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    file_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'MIME type',
    },

    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Size in bytes',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'patient_files',
    timestamps: false,
  }
);

module.exports = PatientFile;
