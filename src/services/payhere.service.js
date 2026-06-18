const crypto = require('crypto');
const axios = require('axios');

class PayHereService {
  constructor() {
    this.merchantId = process.env.PAYHERE_MERCHANT_ID;
    this.merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    this.isSandbox = process.env.PAYHERE_SANDBOX === 'true';
    this.baseUrl = this.isSandbox
      ? 'https://sandbox.payhere.lk'
      : 'https://www.payhere.lk';
  }

  /**
   * Generate MD5 hash for PayHere payment
   */
  generateHash(orderId, amount, currency = 'LKR') {
    const amountFormatted = parseFloat(amount).toFixed(2);
    const hashString = `${this.merchantId}${orderId}${amountFormatted}${currency}`;
    const hash = crypto
      .createHash('md5')
      .update(hashString + this.merchantSecret)
      .digest('hex')
      .toUpperCase();
    return hash;
  }

  /**
   * Verify PayHere notification hash
   */
  verifyNotificationHash(
    merchantId,
    orderId,
    paymentId,
    amount,
    statusCode,
    md5sig,
  ) {
    const amountFormatted = parseFloat(amount).toFixed(2);
    const hashString = `${merchantId}${orderId}${amountFormatted}${statusCode}`;
    const expectedHash = crypto
      .createHash('md5')
      .update(hashString + this.merchantSecret)
      .digest('hex')
      .toUpperCase();

    return expectedHash === md5sig;
  }

  /**
   * Create payment data for frontend
   */
  createPaymentData(params) {
    const {
      orderId,
      amount,
      currency = 'LKR',
      itemDescription,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      returnUrl,
      cancelUrl,
      notifyUrl,
    } = params;

    const hash = this.generateHash(orderId, amount, currency);

    return {
      sandbox: this.isSandbox,
      merchant_id: this.merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id: orderId,
      items: itemDescription,
      amount: parseFloat(amount).toFixed(2),
      currency,
      hash,
      first_name: customerName.split(' ')[0] || customerName,
      last_name: customerName.split(' ').slice(1).join(' ') || '',
      email: customerEmail,
      phone: customerPhone || '',
      address: customerAddress || '',
      city: customerCity || 'Colombo',
      country: 'Sri Lanka',
      custom_1: customerId, // Store userId
      custom_2: '', // Can be used for metadata
    };
  }

  /**
   * Process PayHere notification
   */
  processNotification(notificationData) {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      status_message,
      card_holder_name,
      card_no,
      card_expiry,
      method,
    } = notificationData;

    // Verify hash
    const isValid = this.verifyNotificationHash(
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      status_code,
      md5sig,
    );

    if (!isValid) {
      throw new Error('Invalid PayHere notification hash');
    }

    // Map status codes
    const statusMap = {
      2: 'completed', // Success
      0: 'pending', // Pending
      '-1': 'cancelled', // Cancelled
      '-2': 'failed', // Failed
      '-3': 'chargeback', // Chargedback
    };

    return {
      orderId: order_id,
      paymentId: payment_id,
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      status: statusMap[status_code] || 'unknown',
      statusMessage: status_message,
      paymentMethod: method,
      cardDetails: {
        holderName: card_holder_name,
        last4: card_no ? card_no.slice(-4) : null,
        expiry: card_expiry,
      },
      isValid,
    };
  }

  /**
   * Create recurring payment (subscription)
   */
  createRecurringPayment(params) {
    const {
      orderId,
      amount,
      currency = 'LKR',
      itemDescription,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      recurrence, // Duration (e.g., '1 Month', '1 Year')
      duration, // How many times to recur (e.g., 'Forever', '12')
      returnUrl,
      cancelUrl,
      notifyUrl,
    } = params;

    const hash = this.generateHash(orderId, amount, currency);

    return {
      sandbox: this.isSandbox,
      merchant_id: this.merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id: orderId,
      items: itemDescription,
      amount: parseFloat(amount).toFixed(2),
      currency,
      hash,
      first_name: customerName.split(' ')[0] || customerName,
      last_name: customerName.split(' ').slice(1).join(' ') || '',
      email: customerEmail,
      phone: customerPhone || '',
      address: '',
      city: 'Colombo',
      country: 'Sri Lanka',
      recurrence,
      duration,
      custom_1: customerId,
    };
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = 'LKR') {
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }

  /**
   * Get payment URL
   */
  getPaymentUrl() {
    return `${this.baseUrl}/pay/checkout`;
  }

  /**
   * Get recurring payment URL
   */
  getRecurringPaymentUrl() {
    return `${this.baseUrl}/pay/preapprove`;
  }
}

module.exports = new PayHereService();
