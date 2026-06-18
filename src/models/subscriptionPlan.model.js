const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define(
    'SubscriptionPlan',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Plan name: Guest, Vital Starter, Boost, Pro',
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Price in LKR',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'LKR',
      },
      billingPeriod: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'lifetime'),
        allowNull: false,
        defaultValue: 'monthly',
      },
      features: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment:
          'Plan features as JSON: {chatConsultations, videoConsultations, evercareAccess, prioritySupport, etc.}',
      },
      limits: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment:
          'Usage limits: {maxConsultationsPerMonth, maxFileSize, maxEvercareTasks}',
      },
      stripeProductId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Stripe Product ID for international payments',
      },
      stripePriceId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Stripe Price ID for international payments',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order in UI',
      },
    },
    {
      tableName: 'subscription_plans',
      timestamps: true,
      indexes: [{ unique: true, fields: ['name'] }, { fields: ['isActive'] }],
    },
  );

  return SubscriptionPlan;
};
