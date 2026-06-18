const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define(
    'Transaction',
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
      userSubscriptionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'user_subscriptions',
          key: 'id',
        },
        comment: 'Reference to user subscription plan',
      },
      subscriptionUsageId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'subscription_usage',
          key: 'id',
        },
        comment: 'Reference to subscription usage period for billing',
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to Appointment ID for pay-per-consultation',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'LKR',
      },
      type: {
        type: DataTypes.ENUM(
          'subscription',
          'consultation',
          'refund',
          'adjustment',
          'bill',
          'appointment'
        ),
        allowNull: false,
        defaultValue: 'consultation',
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'refunded',
          'cancelled',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      paymentGateway: {
        type: DataTypes.ENUM('stripe', 'payhere', 'manual'),
        allowNull: false,
      },
      gatewayTransactionId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Transaction ID from payment gateway',
      },
      gatewayResponse: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Full response from payment gateway',
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Card, bank transfer, etc.',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refundedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'transactions',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['userSubscriptionId'] },
        { fields: ['subscriptionUsageId'] },
        { fields: ['appointmentId'] },
        { fields: ['status'] },
        { fields: ['gatewayTransactionId'] },
        { fields: ['createdAt'] },
      ],
    },
  );

  return Transaction;
};
