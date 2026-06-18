const { sendEmail } = require('../utils/email');

// Registration Success Email
const sendRegistrationSuccessEmail = async (user) => {
  const html = `
    <h2>Welcome, ${user.username}! to Healthify</h2>
    <p>Your registration was successful. You can now log in to your account with your email and password.</p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Registration Successful',
    html,
  });
};

const sendEmailOtp = async (user, otp) => {
  await sendEmail({
    to: user.email,
    subject: 'Activate your account',
    html: `
      <h2>Verify your email</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP expires in 10 minutes.</p>
    `,
  });
};

const sendBillSuccessEmail = async (user, billDetails) => {
  const html = `
    <h2>Bill Payment Successful</h2>
    <p>Dear ${user.username},</p>
    <p>Your payment for the bill with ID: ${billDetails.id} has been successfully processed. Thank you for your prompt payment.</p>
    <p>Amount Paid: $${billDetails.amount}</p>
    <p>Date of Payment: ${new Date().toLocaleDateString()}</p>
    <p>If you have any questions or need further assistance, please feel free to contact our support team.</p>
    <p>Thank you for choosing Healthify!</p>
    <br />
    <p>Best regards,<br />
    <strong>The Healthify Team</strong></p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Healthify – Registration Successful',
    html,
  });
};

// account provider created for loign
const sendConfirmationEmailToPractitioner = async (practitionerData) => {
  const html = `
    <h2>Welcome to Healthify, ${practitionerData.prefix ? practitionerData.prefix + ' ' : ''}${practitionerData.firstName} ${practitionerData.lastName}!</h2>
    <p>We’re happy to let you know that your registration with <strong>Healthify</strong> was successful.</p>
    <p>You can now log in to your account using your registered email address and password to access the practitioner dashboard and start managing your services.</p>
    <p>If you have any questions or need assistance, our support team is always here to help.</p>
    <p>Thank you for joining Healthify and being part of our healthcare community.</p>
    <p></p>
    <br />
    <p>Warm regards,<br />
    <strong>The Healthify Team</strong></p>
  `;

  await sendEmail({
    to: practitionerData.email,
    subject: 'Welcome to Healthify – Registration Successful',
    html,
  });
};

// Password Reset Email
const sendPasswordResetEmail = async (user, resetLink) => {
  const html = `
    <p>Hello, ${user.username}!</p>
    <p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    html,
  });
};

// Login Code Email
const sendLoginCodeEmail = async (user, loginCode) => {
  const html = `
  <p>Hello, ${user.username}!</p>
  <p>Your Healthify login verification code is: <b>${loginCode}</b></p>
  <p>This code will expire in 5 minutes.</p>
`;

  await sendEmail({
    to: user.email,
    subject: ' Your healthify Login Verification Code',
    html,
  });
};

const sendPasswordResetCodeEmail = async (user, resetCode) => {
  const html = `
    <p>Hello, ${user.username}!</p>
    <p>Your Healthify password reset code is: <b>${resetCode}</b></p>
    <p>This code will expire in 10 minutes.</p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Password Reset Verification Code',
    html,
  });
};

// You can add more email types as needed...

module.exports = {
  sendRegistrationSuccessEmail,
  sendPasswordResetEmail,
  sendLoginCodeEmail,
  sendPasswordResetCodeEmail,
  sendConfirmationEmailToPractitioner,
  sendEmailOtp,
  sendBillSuccessEmail,
};
