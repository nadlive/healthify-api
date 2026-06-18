const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.EMAIL_SENDING_RESEND_API_KEY);

/**
 * Send an email
 * @param {Object} options - { to, subject, html }
 * @returns {Promise}
 */
const sendEmail = async ({ to, subject, html }) => {
  await resend.emails.send({
    from: 'Healthify <info@healthify.com.lk>',
    to: to,
    subject: subject,
    html: html,
  });
};

module.exports = {
  sendEmail,
};
