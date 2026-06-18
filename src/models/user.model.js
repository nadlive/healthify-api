const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define(
  'users',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      autoIncrement: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('admin', 'patient', 'practitioner'),
      defaultValue: 'patient',
    },
    isOverdue: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    loginCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loginCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    oauthProvider: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    oauthId: {
      type: DataTypes.STRING,
      allowNull: true,
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
    passwordResetCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailOtp: {
      type: DataTypes.STRING,
    },
    emailOtpExpiresAt: {
      type: DataTypes.DATE,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'users',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['username'],
      },
      {
        unique: true,
        fields: ['email'],
      },
    ],
  },
);

module.exports = User;
