const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PractitionerFile = sequelize.define(
  'practitioner_files',
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

    practitioner_id: {
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
    },

    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Prescription notes or remarks',
    },

    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'practitioner_files',
    timestamps: false,
  }
);

module.exports = PractitionerFile;
