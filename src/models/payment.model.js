const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    'PaymentBill',
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Reason for the payment (free text)',
      },
      method: {
        type: DataTypes.ENUM(
          'card',
          'bank_transfer',
          'wallet',
          'cash',
          'manual',
          'other',
          'payhere',
        ),
        allowNull: true,
        defaultValue: 'card',
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'paid',
          'failed',
          'refunded',
          'refund pending',
          'cancelled',
          'partially paid',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      paymentTypeFor: {
        type: DataTypes.ENUM(
          'invoice',
          'bill',
          'subscription-new',
          'subscription-upgrade',
          'recurring',
          'default',
        ),
        allowNull: false,
        defaultValue: 'default',
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      transactionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id',
        },
      },
      subscriptionUsageId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'subscription_usage',
          key: 'id',
        },
        comment: 'Reference to subscription usage for tracking billing period',
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'invoices',
          key: 'id',
        },
        comment: 'Reference to the invoice this payment settles',
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'payments',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['transactionId'] },
        { fields: ['subscriptionUsageId'] },
        { fields: ['invoiceId'] },
        { fields: ['status'] },
        { fields: ['createdAt'] },
      ],
    },
  );

  return Payment;
};
