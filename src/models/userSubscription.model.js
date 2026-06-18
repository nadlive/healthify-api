const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSubscription = sequelize.define(
    'UserSubscription',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Reference to User ID from Identity Service',
      },
      planId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM(
          'active',
          'cancelled',
          'expired',
          'past_due',
          'pending',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nextBillingDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      autoRenew: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'user_subscriptions',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['planId'] },
        { fields: ['status'] },
      ],
    },
  );

  return UserSubscription;
};
