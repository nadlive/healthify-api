const crypto = require('crypto');

class PayHereGatewayService {
  getPaymentUrl() {
    return `${process.env.PAYHERE_BASE_URL}/pay/checkout`;
  }

  generateHash(orderId, amount, currency) {
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    const formattedAmount = Number(amount).toFixed(2);

    const secretHash = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    const raw = merchantId + orderId + formattedAmount + currency + secretHash;

    return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  }

  createPayhereTransactionData({
    orderId,
    amount,
    description,
    customer,
    currency = process.env.PAYHERE_CURRENCY,
    appointmentId = null,
  }) {
    const formattedAmount = Number(amount).toFixed(2);
    const paymentData = {
      merchant_id: process.env.PAYHERE_MERCHANT_ID,
      return_url: process.env.PAYHERE_RETURN_URL,
      cancel_url: process.env.PAYHERE_CANCEL_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,

      order_id: orderId,
      custom_1: appointmentId,
      items: description,
      currency,
      amount: formattedAmount,
      first_name: customer?.firstName || '',
      last_name: customer?.lastName || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
      city: customer?.city || '',
      country: customer?.country || '',

      hash: this.generateHash(orderId, formattedAmount, currency),
    };

    console.log('[PayHere checkout]', {
      merchant_id: paymentData.merchant_id,
      order_id: paymentData.order_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      notify_url: paymentData.notify_url,
      return_url: paymentData.return_url,
      cancel_url: paymentData.cancel_url,
      hash: paymentData.hash,
      merchant_secret: process.env.PAYHERE_MERCHANT_SECRET,
    });

    return paymentData;
  }
}

module.exports = new PayHereGatewayService();
