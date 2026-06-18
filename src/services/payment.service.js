const {
  sequelize,
  Payment,
  Invoice,
  Transaction,
  UserSubscription,
  SubscriptionPlan,
  SubscriptionUsage,
  Patient,
  Appointment,
  User,
} = require('../models');
const { getBillingPeriodDates } = require('../utils/bill.utils');
const invoiceOperationService = require('./invoice.operation.service');
const { getSubscriptionPeriod } = require('./subscriptionUsage.service');

class PaymentService {
  async finalizeBillPayment(paymentId) {
    const transaction = await sequelize.transaction();

    try {
      const payment = await Payment.findByPk(paymentId, {
        transaction: transaction,
        lock: transaction.LOCK.UPDATE,
      });

      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ transaction: transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async finalizeNewSubscription(paymentId) {
    const transaction = await sequelize.transaction();
    try {
      const payment = await Payment.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!payment || payment.status === 'paid') {
        await transaction.commit();
        return;
      }

      const { planId } = payment.metadata || {};
      if (!planId) throw new Error('Missing planId');

      const plan = await SubscriptionPlan.findByPk(planId, { transaction });
      if (!plan) throw new Error('Plan not found');

      const activeSubscription = await UserSubscription.findOne({
        where: { userId: payment.userId, status: 'active' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (activeSubscription) {
        await activeSubscription.update(
          { status: 'cancelled', cancelledAt: new Date() },
          { transaction },
        );

        await SubscriptionUsage.update(
          { status: 'expired', periodEnd: new Date() },
          {
            where: {
              subscriptionId: activeSubscription.id,
              status: 'active',
            },
            transaction,
          },
        );
      }

      const { subscriptionPeriodStart, subscriptionPeriodEnd } =
        this.calculateMonthlyPeriod();

      const subscription = await UserSubscription.create(
        {
          userId: payment.userId,
          planId,
          status: 'active',
          startDate: subscriptionPeriodStart,
          endDate: subscriptionPeriodEnd,
          nextBillingDate: subscriptionPeriodEnd,
          paymentMethod: 'payhere',
          autoRenew: true,
        },
        { transaction },
      );

      const usage = await SubscriptionUsage.create(
        {
          subscriptionId: subscription.id,
          userId: payment.userId,
          periodStart: subscriptionPeriodStart,
          periodEnd: subscriptionPeriodEnd,
          limit: plan.limits?.maxConsultationsPerMonth ?? 0,
          chatConsumed: 0,
          chatLimit: plan.limits?.maxChatsPerMonth ?? 0,
          keyFeature: 'New subscription allocation',
        },
        { transaction },
      );

      const transactionRecord = await Transaction.create(
        {
          userId: payment.userId,
          userSubscriptionId: subscription.id,
          amount: plan.price,
          type: 'subscription',
          status: 'completed',
          paymentGateway: 'payhere',
          currency: plan.currency,
        },
        { transaction },
      );

      // TODO : duplicated code with invoice operation service createInvoiceForSubscription method , need to refactor this and have common method to create invoice for subscription and appointment both
      let invoice = await Invoice.findOne({
        where: { userId: payment.userId, invoiceActiveStatus: true },
        order: [['createdAt', 'DESC']],
        transaction,
      });

      if (invoice) {
        await invoice.update(
          {
            subscriptionId: subscription.id,
            subscriptionUsageId: usage.id,
          },
          { transaction },
        );
        await invoiceOperationService.addInvoiceItemToExistingInvoice(
          invoice.id,
          usage,
          plan,
          transaction,
        );
      } else {
        const { billingStartDate, billingEndDate } =
          this.calculateMonthlyPeriod();

        invoice = await invoiceOperationService.createInvoiceForSubscription(
          payment.userId,
          usage,
          plan,
          billingStartDate,
          billingEndDate,
          transactionRecord,
          transaction,
        );
      }

      await subscription.update({ invoiceId: invoice.id }, { transaction });

      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.subscriptionUsageId = usage.id;
      payment.invoiceId = invoice.id;
      await payment.save({ transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async finalizeSubscriptionUpgrade(paymentId) {
    const transaction = await sequelize.transaction();
    try {
      const payment = await Payment.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!payment || payment.status === 'paid') {
        await transaction.commit();
        return;
      }

      const userId = payment.userId;
      const newPlanId = payment.metadata?.planId;

      const activeSubscriptionUsage = await SubscriptionUsage.findOne({
        where: { userId: userId, status: 'active' },
        include: [
          {
            model: UserSubscription,
            as: 'subscription',
            required: true,
            include: [{ model: SubscriptionPlan, as: 'plan', required: true }],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      activeSubscriptionUsage.status = 'expired';
      activeSubscriptionUsage.periodEnd = new Date();
      await activeSubscriptionUsage.save({ transaction });
      activeSubscriptionUsage.subscription.status = 'cancelled';
      await activeSubscriptionUsage.subscription.save({ transaction });

      const newPlan = await SubscriptionPlan.findByPk(newPlanId);

      const { subscriptionPeriodStart, subscriptionPeriodEnd } =
        getSubscriptionPeriod();

      const newSubscription = await UserSubscription.create(
        {
          userId: payment.userId,
          planId: newPlan.id,
          status: 'active',
          startDate: subscriptionPeriodStart,
          endDate: subscriptionPeriodEnd,
          nextBillingDate: subscriptionPeriodEnd,
          paymentMethod: 'payhere',
          autoRenew: true,
        },
        { transaction },
      );

      const usage = await SubscriptionUsage.create(
        {
          subscriptionId: newSubscription.id,
          userId: payment.userId,
          periodStart: subscriptionPeriodStart,
          periodEnd: subscriptionPeriodEnd,
          limit: newPlan.limits?.maxConsultationsPerMonth ?? 0,
          chatConsumed: 0,
          chatLimit: newPlan.limits?.maxChatsPerMonth ?? 0,
          keyFeature: `Upgrade from plan ${newPlan.displayName}`,
        },
        { transaction },
      );

      let invoice = await Invoice.findOne({
        where: { userId: payment.userId, invoiceActiveStatus: true },
      });

      await invoiceOperationService.addInvoiceItemToExistingInvoice(
        invoice.id,
        usage,
        newPlan,
        transaction,
      );

      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.subscriptionUsageId = usage.id;
      payment.invoiceId = invoice.id;
      await payment.save({ transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async finalizeAppointmentPayment(paymentId) {
    const transaction = await sequelize.transaction();
    try {
      const payment = await Payment.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!payment || payment.status === 'paid') {
        await transaction.commit();
        return;
      }

      const { appointmentId } = payment.metadata || {};
      const appointment = await Appointment.findByPk(appointmentId, {
        transaction,
      });
      // @ts-ignore
      appointment.status = 'Booked';
      // @ts-ignore
      await appointment.save({ transaction });

      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async updatePaymentToFailed(paymentId) {
    const payment = await Payment.findByPk(paymentId);

    if (payment && payment.status === 'pending') {
      await payment.update({
        status: 'failed',
        failedAt: new Date(),
      });
    }
  }

  async findPendingPayment(paymentId) {
    const payment = await Payment.findByPk(paymentId);
    return payment;
  }

  calculateEndDate(startDate, billingPeriod) {
    const date = new Date(startDate);

    switch (billingPeriod) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'lifetime':
        date.setFullYear(date.getFullYear() + 100);
        break;
      default:
        throw new Error(`Invalid billingPeriod: ${billingPeriod}`);
    }

    return date;
  }

  async getAllPaymentRefunds() {
    const refunds = await Payment.findAll({
      where: {
        status: ['refund pending', 'paid'],
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['firstName', 'lastName'],
            },
          ],
        },
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'status','periodStart','periodEnd',],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = await Promise.all(
      refunds.map(async (payment) => {
        const invoiceId = payment.invoiceId;

        const totalPaid = await Payment.sum('amount', {
          where: {
            invoiceId,
            status: 'paid',
          },
        });

        const refundAmount = Math.abs(payment.amount);
        const availableForRefund = parseFloat(totalPaid || 0) - refundAmount;

        return {
          id: payment.id,
          patientName: `${payment.user?.patient?.firstName || ''} ${
            payment.user?.patient?.lastName || ''
          }`,
          invoiceNumber: payment.invoice?.invoiceNumber,
          invoicePeriodStart: payment.invoice?.periodStart || null,
          invoicePeriodEnd: payment.invoice?.periodEnd || null,
          appointmentId: payment.metadata?.appointmentId,
          refundAmount,
          totalPaid: parseFloat(totalPaid || 0),
          availableForRefund,
          status: payment.status,
          note: payment.note || null,
        };
      }),
    );

    return formatted;
  }

  async updatePaymentRefundStatus(refundId, status, note) {
    if (status !== 'paid') {
      throw new Error('Invalid status value');
    }

    const transaction = await sequelize.transaction();

    try {
      const payment = await Payment.findByPk(refundId, { transaction });

      if (!payment) {
        throw new Error('Refund not found');
      }

      payment.status = 'paid';
      payment.reason = note || '';
      payment.paidAt = new Date();

      await payment.save({ transaction });
      await transaction.commit();

      return { message: 'Refund processed successfully', payment };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getDetailsInRefund(refundId) {
  const payment = await Payment.findByPk(refundId, {
    include: [
      {
        model: Invoice,
        as: 'invoice',
        include: [
          {
            association: 'items', 
          },
        ],
      },
      {
        model: User,
        as: 'user',
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['firstName', 'lastName'],
          },
        ],
      },
    ],
  });

  if (!payment) {
    throw new Error('Refund not found');
  }

  const invoiceId = payment.invoiceId;

  const payments = await Payment.findAll({
    where: { invoiceId },
    order: [['createdAt', 'ASC']],
    attributes: [
      'id',
      'amount',
      'status',
      'method',
      'metadata',
      'createdAt',
      'reason',
    ],
  });

  return {
    refund: {
      id: payment.id,
      amount: Math.abs(payment.amount),
      status: payment.status,
      note: payment.reason,
      createdAt: payment.createdAt,
    },
    patient: {
      name: `${payment.user?.patient?.firstName || ''} ${
        payment.user?.patient?.lastName || ''
      }`,
      userId: payment.userId,
    },
    invoice: payment.invoice,
    payments, 
  };
}


  async makePayment(
    userId,
    amount,
    invoiceId = null,
    metadata,
    description,
    status = 'pending',
    transaction,
  ) {
    return Payment.create(
      {
        userId,
        amount,
        status,
        method: 'payhere',
        metadata,
        invoiceId,
        description,
        reason: description,
      },
      { transaction },
    );
  }

  calculateMonthlyPeriod(referenceDate = new Date()) {
    return getBillingPeriodDates(referenceDate);
  }
}

module.exports = new PaymentService();
