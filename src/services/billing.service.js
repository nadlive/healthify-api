const {
  Payment,
  Invoice,
  InvoiceItem,
  User,
  Patient,
  Appointment,
} = require('../models');
const { sequelize } = require('../models');
const paymentPayhereGatewayService = require('./payment.payhere.gateway.service');
const { formatUTCDate } = require('../utils/bill.utils');
const invoiceService = require('./invoice.service');
const paymentService = require('./payment.service');
const { GUEST_PLAN_ID } = require('../constants/PLAN');
const { SubscriptionUsage, UserSubscription } = require('../models');
class BillingService {
  async _getActiveBill(userId) {
    const activeInvoice = await Invoice.findOne({
      where: {
        userId,
        invoiceActiveStatus: true,
      },
      include: [
        {
          model: InvoiceItem,
          as: 'items',
          attributes: [
            'id',
            'type',
            'description',
            'amount',
            'metadata',
            'createdAt',
          ],
        },
        {
          model: Payment,
          as: 'payments',
          where: { status: 'paid' },
          required: false,
          attributes: [
            'id',
            'amount',
            'status',
            'description',
            'reason',
            'metadata',
            'createdAt',
          ],
        },
      ],
    });

    if (!activeInvoice) return null;

    const activeInvoiceSubTotal = activeInvoice.items?.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const activeInvoiceTotalPaid =
      activeInvoice.payments?.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ) || 0;

    const activeInvoiceDueAmount =
      activeInvoiceSubTotal - activeInvoiceTotalPaid;

    return {
      id: activeInvoice.invoiceNumber,
      period: `${formatUTCDate(activeInvoice.periodStart)} - ${formatUTCDate(activeInvoice.periodEnd)}`,
      amount: activeInvoiceSubTotal,
      paidAmount: activeInvoiceTotalPaid,
      dueAmount: activeInvoiceDueAmount,
      items: activeInvoice.items,
      payments: activeInvoice.payments,
    };
  }

  async _getPastBills(userId) {
    const pastInvoices = await Invoice.findAll({
      where: { userId, invoiceActiveStatus: false },
      include: [
        { model: InvoiceItem, as: 'items' },
        {
          model: Payment,
          as: 'payments',
          where: { status: 'paid' },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return pastInvoices.map((invoice) => {
      const amount =
        invoice.items?.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        ) ?? 0;
      const paidAmount =
        invoice.payments?.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        ) ?? 0;
      const dueAmount = Math.max(0, amount - paidAmount);
      return {
        id: invoice.invoiceNumber,
        period: `${formatUTCDate(invoice.periodStart)} - ${formatUTCDate(invoice.periodEnd)}`,
        amount,
        paidAmount,
        dueAmount,
        status: invoice.status,
      };
    });
  }

  async getBillingOverview(userId) {
    const currentBill = await this._getActiveBill(userId);
    const pastBills = await this._getPastBills(userId);
    return { currentBill, pastBills };
  }

  async getBillDetails(userId, billId) {
    const usageRecord = await SubscriptionUsage.findOne({
      where: { userId, status: 'active' },
      include: [
        { model: Patient, as: 'patient' },
        { model: UserSubscription, as: 'subscription' },
      ],
    });

    const isPayedSubscription =
      usageRecord.subscription.planId !== GUEST_PLAN_ID;

    const invoice = await Invoice.findOne({
      where: { invoiceNumber: billId, userId },
      include: [
        { model: InvoiceItem, as: 'items' },
        {
          model: Payment,
          as: 'payments',
          where: { status: 'paid' },
          required: false,
        },
      ],
    });

    if (!invoice) throw new Error('Invoice not found');

    const payments = invoice.payments;

    const rows = invoice.items.map((item, index) => ({
      id: index + 1,
      type: item.type,
      description: item.description,
      date: new Date(item.createdAt).toISOString().split('T')[0],
      amount: Number(item.amount),
    }));

    console.log(rows);

    const nonAppointmentAmount = rows.reduce(
      (sum, row) => (row.type === 'appointment' ? sum : sum + row.amount),
      0,
    );

    const paymentRows = payments.map((payment) => ({
      id: `${payment.id}`,
      type: 'payment',
      description: payment.description,
      date: new Date(payment.createdAt).toISOString().split('T')[0],
      amount: -Number(payment.amount),
    }));

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const dueAmount = total - totalPaid;
    const payableAmount = isPayedSubscription
      ? dueAmount
      : nonAppointmentAmount - totalPaid;
    return {
      rows,
      paymentRows,
      total,
      totalPaid,
      payableAmount,
      dueAmount,
      isPayedSubscription,
    };
  }

  async pay(userId, amount, appointmentId = null, transaction = null) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    const patient = await Patient.findOne({ where: { userId: userId } });
    if (!patient) {
      throw new Error('Patient profile not found for user');
    }

    const type = appointmentId ? 'appointment_guest_payment' : 'bill';

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        where: { appointment_id: appointmentId },
      });

      // @ts-ignore
      if (appointment && appointment.appointmentCharge !== amount) {
        // This is important to avoid security breach
        throw new Error('Appointment charge does not match the amount');
      }
    }

    const invoice = await invoiceService.getActiveInvoice(userId);
    invoice.amount = amount;
    const payment = await paymentService.makePayment(
      userId,
      amount,
      invoice.id,
      { method: 'payhere', type: type, appointmentId: appointmentId },
      `Bill Payment - ${invoice.patient.firstName} ${invoice.patient.lastName}`,
      'pending',
      transaction,
    );

    const payhereData =
      paymentPayhereGatewayService.createPayhereTransactionData({
        orderId: payment.id,
        amount: payment.amount,
        description: `Bill Payment - ${invoice.patient.firstName} ${invoice.patient.lastName}`,
        customer: patient,
        appointmentId,
      });

    return {
      paymentId: payment.id,
      paymentUrl: paymentPayhereGatewayService.getPaymentUrl(),
      paymentData: payhereData,
    };
  }

  async payBillsAppointments(userId, amount, appointmentId = null) {
    const transaction = await sequelize.transaction();

    const payment = await this.pay(userId, amount, appointmentId, transaction);

    await transaction.commit();

    return payment;
  }
}

module.exports = new BillingService();
