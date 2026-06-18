const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionUsage = sequelize.define(
    'SubscriptionUsage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      subscriptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'user_subscriptions',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      keyFeature: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'e.g. chat_consultations, evercare_tasks',
      },
      periodStart: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      periodEnd: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      consumed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Plan limit for this feature in the current period',
      },
      chatConsumed: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      chatLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'subscription_usage',
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: 'sub_usage_user_feature_period_uniq',
          fields: [
            'userId',
            'keyFeature',
            'periodStart',
            'periodEnd',
            'status',
          ],
        },
      ],
    },
  );

  return SubscriptionUsage;
};
