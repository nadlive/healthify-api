const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Speciality = sequelize.define(
  'Speciality',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    nameLanguage2: { type: DataTypes.STRING, allowNull: true },
    nameLanguage3: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'specialities',
    timestamps: false,
  },
);

module.exports = Speciality;
