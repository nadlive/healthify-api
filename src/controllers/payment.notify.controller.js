const crypto = require('crypto');
const paymentService = require('../services/payment.service');
const { Payment } = require('../models');

class PaymentNotifyController {
  async payHereNotify(req, res) {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    const secretHash = crypto
      .createHash('md5')
      .update(process.env.PAYHERE_MERCHANT_SECRET)
      .digest('hex')
      .toUpperCase();

    const localMd5Sig = crypto
      .createHash('md5')
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          secretHash,
      )
      .digest('hex')
      .toUpperCase();

    if (localMd5Sig !== md5sig) {
      return res.status(400).send('Invalid signature');
    }

    if (status_code !== '2') {
      await paymentService.updatePaymentToFailed(order_id);
      return res.status(200).send('Payment not successful');
    }

    const payment = await Payment.findByPk(order_id);
    if (!payment) {
      return res.status(200).send('Payment not found');
    }

    const type = payment.metadata?.type;

    if (type === 'bill') {
      await paymentService.finalizeBillPayment(order_id);
    } else if (type === 'subscription_upgrade') {
      await paymentService.finalizeSubscriptionUpgrade(order_id);
    } else if (type === 'subscription_new') {
      await paymentService.finalizeNewSubscription(order_id);
    } else if (type === 'appointment_guest_payment') {
      await paymentService.finalizeAppointmentPayment(order_id);
    } else {
      console.warn('⚠️ Unknown payment type:', type);
    }

    return res.status(200).send('OK');
  }
}

module.exports = new PaymentNotifyController();
