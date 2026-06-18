const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PrescriptionItem = sequelize.define(
  'prescription_items',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      autoIncrement: false,
    },
    prescription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'prescriptions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    medication_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    generic_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dosage_form: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    strength: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dosage_instructions: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    refills_allowed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    special_instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_controlled_substance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'prescription_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['prescription_id'],
      },
      {
        fields: ['medication_name'],
      },
    ],
  },
);

module.exports = PrescriptionItem;
