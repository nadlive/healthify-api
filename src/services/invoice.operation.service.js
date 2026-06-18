const { Op } = require('sequelize');
const { Invoice, InvoiceItem } = require('../models');

class InvoiceOperationService {
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();

    const count = await Invoice.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(year, 0, 1),
          [Op.lt]: new Date(year + 1, 0, 1),
        },
      },
    });

    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async createInvoiceForSubscription(
    userId,
    subscription_usage,
    plan,
    billingStartDate,
    billingEndDate,
    transactionRecord,
    transaction,
  ) {
    await Invoice.update(
      { invoiceActiveStatus: false },
      {
        where: {
          userId,
          invoiceActiveStatus: true,
        },
        transaction,
      },
    );
    const invoiceNumber = await this.generateInvoiceNumber();

    const paidAmount = transactionRecord?.amount ?? 0;
    const dueAmount = Math.max(plan.price - paidAmount, 0);
    const status =
      dueAmount === 0 ? 'paid' : paidAmount === 0 ? 'draft' : 'partially_paid';

    const invoice = await Invoice.create(
      {
        invoiceNumber,
        userId,
        subscriptionId: subscription_usage.subscriptionId,
        subscriptionUsageId: subscription_usage.id,
        amount: plan.price,
        tax: 0,
        discount: 0,
        paidAmount,
        dueAmount,
        invoiceActiveStatus: true,
        total: plan.price,
        currency: plan.currency,
        transactionId: transactionRecord?.id ?? null,
        status,
        paidAt: paidAmount > 0 ? new Date() : null,
        issuedAt: new Date(),
        periodStart: billingStartDate,
        periodEnd: billingEndDate,
      },
      { transaction: transaction },
    );

    if (plan.price > 0) {
      await InvoiceItem.create(
        {
          invoiceId: invoice.id,
          type: 'subscription-fee',
          description: `${plan.displayName} Subscription (${plan.billingPeriod})`,
          amount: plan.price,
          metadata: { planId: plan.id },
        },
        { transaction: transaction },
      );
    }
    return invoice;
  }

  async createInvoiceForAppointment(
    userId,
    appointment,
    charge,
    isFree,
    transaction,
  ) {
    const invoiceNumber = await this.generateInvoiceNumber();

    if (isFree) {
      charge = 0;
    }

    const invoice = await Invoice.create(
      {
        invoiceNumber,
        userId,
        appointmentId: appointment.appointment_id,
        amount: charge,
        paidAmount: 0,
        dueAmount: charge,
        tax: 0,
        discount: 0,
        currency: 'LKR',
        total: charge,
        status: isFree ? 'paid' : 'issued',
        issuedAt: new Date(),
        lineItems: [],
        metadata: {
          appointment,
        },
      },
      { transaction },
    );

    await InvoiceItem.create(
      {
        invoiceId: invoice.id,
        type: 'appointment',
        appointmentId: appointment.id,
        description: `Appointment Fee`,
        amount: charge,
        metadata: { appointmentId: appointment.id },
      },
      { transaction },
    );
  }

  async addInvoiceItemToExistingInvoice(invoiceId, usage, plan, transaction) {
    await InvoiceItem.create(
      {
        invoiceId,
        type: 'subscription-fee',
        description: `${plan.displayName} Subscription (${plan.billingPeriod})`,
        amount: plan.price,
        metadata: { planId: plan.id, usageId: usage.id },
      },
      { transaction },
    );
  }
}

module.exports = new InvoiceOperationService();
