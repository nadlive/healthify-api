const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Practitioner = sequelize.define(
  'practitioner',
  {
    practitioner_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prefix: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    // Multilingual names: [{ language, prefix, firstName, lastName }, ...]
    // language1=English, language2=Sinhala, language3=Tamil
    names: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    fee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualifications: {
      type: DataTypes.JSON,
    },
    speciality_id: {
      type: DataTypes.STRING,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: 'practitioners',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
    ],
  },
);

module.exports = Practitioner;
