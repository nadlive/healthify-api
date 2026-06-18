const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.EMAIL_SENDING_RESEND_API_KEY);
const INTERNAL_TOKEN = process.env.INTERNAL_NOTIFICATION_TOKEN;

function validateToken(token) {
  return token === INTERNAL_TOKEN;
}

async function sendEmail({ to, subject, html }) {
  await resend.emails.send({
    from: 'Healthify <info@healthify.com.lk>',
    to,
    subject,
    html,
  });
}

async function sendRenewalReminder(subscription, plan, userEmail) {
  const planName = plan?.displayName || 'subscription';
  const renewalDate = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString()
    : 'soon';
  const price = plan?.price
    ? `${plan.currency || 'LKR'} ${plan.price}`
    : 'the plan price';

  const html = `
    <h2>Subscription Renewal Reminder</h2>
    <p>Hello,</p>
    <p>Your ${planName} plan will ${subscription.autoRenew ? 'auto-renew' : 'expire'} on ${renewalDate}.</p>
    ${
      subscription.autoRenew
        ? `<p>We will charge ${price} automatically.</p>`
        : `<p>Renew now to avoid interruption.</p>`
    }
    <p>Thank you for using Healthify.</p>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Your ${planName} subscription renewal reminder`,
    html,
  });
}

async function sendExpirationNotice(subscription, plan, userEmail) {
  const planName = plan?.displayName || 'subscription';
  const expirationDate = subscription.endDate
    ? new Date(subscription.endDate).toLocaleDateString()
    : 'today';

  const html = `
    <h2>Subscription Expired</h2>
    <p>Hello,</p>
    <p>Your ${planName} subscription has expired on ${expirationDate}.</p>
    <p>Renew your subscription to continue enjoying our services.</p>
    <p>Thank you for using Healthify.</p>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Your ${planName} subscription has expired`,
    html,
  });
}

async function sendQuotaExhaustedNotice(
  subscription,
  plan,
  userEmail,
  featureName,
) {
  const planName = plan?.displayName || 'subscription';
  const feature = featureName || 'feature';

  const html = `
    <h2>Subscription Quota Exhausted</h2>
    <p>Hello,</p>
    <p>You have reached the limit for ${feature} in your ${planName} plan.</p>
    <p>Upgrade your plan or wait for the next billing cycle to continue using this feature.</p>
    <p>Thank you for using Healthify.</p>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Quota exhausted for ${feature} - ${planName}`,
    html,
  });
}

async function sendAppointmentCancelledNotice(appointmentDetails, userEmail) {
  const practitionerName = appointmentDetails.practitionerName;
  const dateAndTime = appointmentDetails.dateAndTime;
  const reason = appointmentDetails.reason;

  const html = `
    <h2>Appointment Cancelled</h2>
    <p>Hello,</p>
    <p>Your appointment on ${dateAndTime} with ${practitionerName} has been cancelled.</p>
    <p>Reason: ${reason}</p>
    <p>Thank you for using Healthify.</p>
    <p>Your payment will be refunded within two business days. If you have any questions, please contact us at <a href="mailto:support@healthify.com.lk">support@healthify.com.lk</a>.</p>

    <p>Note: Partial payment may take longer to refund as direct reversal of your transaction is subject to approval by the payment gateway.</p>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Appointment cancelled`,
    html,
  });
}

async function sendSubscriptionRenewedNotice(subscriptionDetails) {
  const { planName, renewalDate, startDate, endDate, email, patientName } =
    subscriptionDetails;
  const html = `
    <h2>Subscription Renewed</h2>
    <p>Hi ${patientName},</p>
    <p>Your <b>${planName}</b> subscription has been renewed on <b>${renewalDate}</b>.</p>
    <p>Your new subscription period will start from ${startDate} and end on ${endDate}.</p>
    <p>Thank you for using Healthify.</p>
  `;

  await sendEmail({
    to: email,
    subject: `Your ${patientName} subscription has been renewed`,
    html,
  });
}

module.exports = {
  sendRenewalReminder,
  sendExpirationNotice,
  sendQuotaExhaustedNotice,
  validateToken,
  sendAppointmentCancelledNotice,
  sendSubscriptionRenewedNotice,
};
