const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Human-readable invoice number: INV-2024-00001',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Reference to User ID from Identity Service',
      },
      tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'LKR',
      },
      status: {
        type: DataTypes.ENUM(
          'draft',
          'issued',
          'paid',
          'overdue',
          'cancelled',
          'refunded',
          'partially_paid',
        ),
        allowNull: false,
        defaultValue: 'draft',
      },
      invoiceActiveStatus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      periodStart: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      periodEnd: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      billingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'User billing address',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'invoices',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['invoiceNumber'] },
        { fields: ['userId'] },
        { fields: ['status'] },
      ],
      hooks: {
        beforeCreate: async (invoice) => {
          if (!invoice.invoiceNumber) {
            const date = new Date();
            const year = date.getFullYear();
            const count = await sequelize.models.Invoice.count({
              where: {
                createdAt: {
                  [sequelize.Sequelize.Op.gte]: new Date(year, 0, 1),
                },
              },
            });
            invoice.invoiceNumber = `INV-${year}-${String(count + 1).padStart(
              5,
              '0',
            )}`;
          }
        },
      },
    },
  );

  return Invoice;
};
