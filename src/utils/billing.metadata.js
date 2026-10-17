const { Patient, User } = require('../models');

const PAYMENT_TYPES = {
  BILL: 'bill',
  APPOINTMENT_GUEST: 'appointment_guest_payment',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_NEW: 'subscription_new',
};

/**
 * Canonical payment.metadata shapes used by PayHere notify routing.
 */
function buildPaymentMetadata({
  type,
  appointmentId = null,
  planId = null,
  subscriptionId = null,
  subscriptionUsageId = null,
  method = 'payhere',
  extra = {},
}) {
  const metadata = {
    method,
    type,
    ...extra,
  };

  if (appointmentId) metadata.appointmentId = appointmentId;
  if (planId) metadata.planId = planId;
  if (subscriptionId) metadata.subscriptionId = subscriptionId;
  if (subscriptionUsageId) metadata.subscriptionUsageId = subscriptionUsageId;

  return metadata;
}

function buildGatewayProof(notifyBody = {}) {
  return {
    provider: 'payhere',
    status_code: notifyBody.status_code ?? null,
    order_id: notifyBody.order_id ?? null,
    payment_id: notifyBody.payment_id ?? null,
    payhere_amount: notifyBody.payhere_amount ?? null,
    payhere_currency: notifyBody.payhere_currency ?? null,
    method: notifyBody.method ?? null,
    paidAt: new Date().toISOString(),
    raw: notifyBody,
  };
}

/**
 * Snapshot of customer identity at invoice issue time.
 * Fields may be missing — that is intentional.
 */
async function buildInvoiceCustomerSnapshot(userId, transaction = null) {
  if (!userId) {
    return { customer: {} };
  }

  const queryOpts = transaction ? { transaction } : {};
  const [patient, user] = await Promise.all([
    Patient.findOne({
      where: { userId },
      attributes: ['patient_id', 'firstName', 'lastName', 'email', 'phone'],
      ...queryOpts,
    }),
    User.findOne({
      where: { id: userId },
      attributes: ['email'],
      ...queryOpts,
    }),
  ]);

  const name = [patient?.firstName, patient?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    customer: {
      patientId: patient?.patient_id || null,
      email: patient?.email || user?.email || null,
      phone: patient?.phone || null,
      name: name || null,
    },
  };
}

function mergeInvoiceMetadata(existing = {}, snapshot = {}) {
  return {
    ...(existing || {}),
    ...(snapshot || {}),
    customer: {
      ...((existing && existing.customer) || {}),
      ...((snapshot && snapshot.customer) || {}),
    },
  };
}

module.exports = {
  PAYMENT_TYPES,
  buildPaymentMetadata,
  buildGatewayProof,
  buildInvoiceCustomerSnapshot,
  mergeInvoiceMetadata,
};
