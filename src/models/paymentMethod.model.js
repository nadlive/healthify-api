const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentMethod = sequelize.define(
    'PaymentMethod',
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
      type: {
        type: DataTypes.ENUM('card', 'bank_account', 'mobile_wallet'),
        allowNull: false,
      },
      provider: {
        type: DataTypes.ENUM('stripe', 'payhere', 'free'),
        allowNull: false,
      },
      stripePaymentMethodId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Stripe Payment Method ID',
      },
      last4: {
        type: DataTypes.STRING(4),
        allowNull: true,
        comment: 'Last 4 digits of card',
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Card brand: Visa, Mastercard, etc.',
      },
      expiryMonth: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expiryYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'payment_methods',
      timestamps: true,
      indexes: [{ fields: ['userId'] }, { fields: ['stripePaymentMethodId'] }],
    },
  );

  return PaymentMethod;
};
