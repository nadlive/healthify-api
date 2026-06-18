const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define(
    'InvoiceItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'id',
        },
      },
      appointmentId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'appointments',
            key: 'appointment_id',
          },
          comment: 'Reference to appointment for appointment-based invoice item',
        },
      type: {
        type: DataTypes.ENUM(
          'appointment-free',
          'subscription-fee',
          'appointment',
          'adjustment',
        ),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment:
          'Description of the item (e.g., "Monthly Subscription Fee", "Consultation with Dr. John")',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount for this item',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional metadata (e.g., appointment details, doctor name)',
      },
    },
    {
      tableName: 'invoice_items',
      timestamps: true,
      indexes: [
        { fields: ['invoiceId'] },
        { fields: ['type'] },
        { fields: ['createdAt'] },
      ],
    },
  );

  return InvoiceItem;
};
