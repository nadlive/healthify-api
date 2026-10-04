const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// @ts-ignore
// @ts-ignore
const User = require('../models/user.model');
const { Op } = require('sequelize');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const {
  // @ts-ignore
  sendLoginCodeEmail,
  sendPasswordResetCodeEmail,
  sendEmailOtp,
} = require('./email.service');
const { generateLoginCode } = require('../utils/loginCodeGeneration');
const {
  UserSubscription,
  SubscriptionUsage,
  SubscriptionPlan,
  sequelize,
} = require('../models');
require('dotenv').config();
// @ts-ignore
// @ts-ignore
const { v4: uuidv4 } = require('uuid');
const invoiceOperationService = require('./invoice.operation.service');
const { getBillingPeriodDates } = require('../utils/bill.utils');
const subscriptionUsageService = require('./subscriptionUsage.service');

const registerUserService = async ({ username, email, password, role }) => {
  try {
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });

    // @ts-ignore
    if (existingUser && existingUser.emailVerified) {
      throw new Error('Email or username already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const userPayload = {
      username,
      email,
      password: hashedPassword,
      role,
      isActive: false,
      emailOtp: otp,
      emailOtpExpiresAt: otpExpiry,
    };

    let user;
    if (existingUser) {
      await existingUser.update(userPayload);
      user = existingUser;
    } else {
      user = await User.create(userPayload);
    }

    try {
      await sendEmailOtp(user, otp);
    } catch (emailError) {
      console.log('⚠ OTP email failed:', emailError.message);
    }

    const t = await sequelize.transaction();

    await t.commit();

    return {
      message: 'OTP sent to email. Please verify to activate account.',
      isActive: false,
      // @ts-ignore
      email: user.email,
    };
  } catch (error) {
    console.error('Error in registerUserService:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// @ts-ignore
const verifyEmailOtpService = async ({ email, otp }) => {
  const user = await User.findOne({ where: { email } });

  if (!user) throw new Error('User not found');

  // @ts-ignore
  if (user.isActive) {
    throw new Error('Account already activated');
  }

  if (
    // @ts-ignore
    user.emailOtp !== otp ||
    // @ts-ignore
    user.emailOtpExpiresAt < new Date()
  ) {
    throw new Error('Invalid or expired OTP');
  }

  try {
    const t = await sequelize.transaction();
    await user.update(
      {
        isActive: true,
        emailOtp: null,
        emailOtpExpiresAt: null,
        emailVerified: true,
      },
      { transaction: t },
    );

    let subscription = await UserSubscription.findOne({
      // @ts-ignore
      where: { userId: user.id },
      transaction: t,
    });

    if (!subscription) {
      subscription = await UserSubscription.create(
        {
          id: uuidv4(),
          // @ts-ignore
          userId: user.id,
          planId: '00000000-0000-0000-0000-000000000001',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          nextBillingDate: new Date(
            new Date().setMonth(new Date().getMonth() + 1),
          ),
          autoRenew: true,
          paymentMethod: 'free',
        },
        { transaction: t },
      );
    }

    const plan = await SubscriptionPlan.findByPk(subscription.planId, {
      transaction: t,
    });

    const { subscriptionPeriodStart, subscriptionPeriodEnd } =
      subscriptionUsageService.getSubscriptionPeriod();

    const usage = await SubscriptionUsage.create(
      {
        id: uuidv4(),
        subscriptionId: subscription.id,
        // @ts-ignore
        userId: user.id,
        periodStart: subscriptionPeriodStart,
        periodEnd: subscriptionPeriodEnd,
        keyFeature: 'default_plan_allocation',
        limit: plan.limits?.maxConsultationsPerMonth ?? 0,
        chatConsumed: 0,
        chatLimit: plan.limits?.maxChatsPerMonth ?? 0,
        metadata: { notes: 'Default Package' },
      },
      { transaction: t },
    );

    const { billingStartDate, billingEndDate } =
      subscriptionUsageService.getSubscriptionPeriod();

    const invoice = await invoiceOperationService.createInvoiceForSubscription(
      // @ts-ignore
      user.id,
      usage,
      plan,
      billingStartDate,
      billingEndDate,
      null,
      t,
    );

    await subscription.update({ invoiceId: invoice.id }, { transaction: t });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return { message: 'Account activated successfully' };
};

// Login a user
const loginUserService = async ({ email, password }) => {
  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User Account not found');
    }

    // Compare the password
    // @ts-ignore
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // @ts-ignore
    const isActive = user.isActive;
    if (!isActive) {
      throw new Error('Account not activated. Please verify your email.');
    }

    // Create payload for access token
    const payload = {
      // @ts-ignore
      userId: user.id,
      // @ts-ignore
      username: user.username,
      // @ts-ignore
      email: user.email,
      // @ts-ignore
      role: user.role,
    };

    // Generate access token
    const accessToken = generateAccessToken(payload);

    // Generate refresh token
    const refreshToken = generateRefreshToken(payload);

    // Return the token and user information
    return {
      accessToken,
      refreshToken,
      user: {
        // @ts-ignore
        id: user.id,
        // @ts-ignore
        username: user.username,
        // @ts-ignore
        email: user.email,
        // @ts-ignore
        role: user.role,
      },

      success: true,
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in loginUserService:', error);

    // Rethrow the error so the controller can handle it
    throw new Error(error.message || 'Login failed');
  }
};

// Request password reset
const requestPasswordResetService = async ({ email }) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    const resetCode = generateLoginCode();
    const resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // @ts-ignore
    user.passwordResetCode = resetCode;
    // @ts-ignore
    user.passwordResetCodeExpiresAt = resetCodeExpiresAt;
    await user.save();

    // Try to send email, but don't fail if SMTP not configured
    try {
      await sendPasswordResetCodeEmail(user, resetCode);
    } catch (emailError) {
      console.log(
        '⚠ Email sending skipped (SMTP not configured):',
        emailError.message,
      );
      // Log the OTP code for development/testing
      // @ts-ignore
      console.log(`📧 Password Reset OTP for ${user.email}: ${resetCode}`);
      console.log(`⏰ Code expires at: ${resetCodeExpiresAt.toISOString()}`);
    }

    return { message: 'Password reset code sent to your email.' };
  } catch (error) {
    console.error('Error in requestPasswordResetService:', error);
    throw new Error(error.message || 'Password reset request failed');
  }
};

const verifyPasswordResetCodeService = async ({ email, code }) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    if (
      // @ts-ignore
      !user.passwordResetCode ||
      // @ts-ignore
      !user.passwordResetCodeExpiresAt ||
      // @ts-ignore
      user.passwordResetCode !== code ||
      // @ts-ignore
      new Date() > user.passwordResetCodeExpiresAt
    ) {
      throw new Error('Invalid or expired code');
    }

    return { message: 'Code verified successfully', verified: true };
  } catch (error) {
    console.error('Error in verifyPasswordResetCodeService:', error);
    throw new Error(error.message || 'Failed to verify code');
  }
};

// Reset password
const resetPasswordService = async ({
  email,
  code,
  newPassword,
  confirmPassword,
}) => {
  try {
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    // Verify the code again before resetting
    if (
      // @ts-ignore
      !user.passwordResetCode ||
      // @ts-ignore
      !user.passwordResetCodeExpiresAt ||
      // @ts-ignore
      user.passwordResetCode !== code ||
      // @ts-ignore
      new Date() > user.passwordResetCodeExpiresAt
    ) {
      throw new Error('Invalid or expired code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // @ts-ignore
    user.password = hashedPassword;
    // @ts-ignore
    user.passwordResetCode = null;
    // @ts-ignore
    user.passwordResetCodeExpiresAt = null;
    await user.save();

    return { message: 'Password has been reset successfully.' };
  } catch (error) {
    console.error('Error in resetPasswordService:', error);
    throw new Error(error.message || 'Failed to reset password');
  }
};

// Change Password
const changePasswordService = async ({
  userId,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  try {
    // Validate that new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new Error('New password and confirm password do not match');
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has a password
    // @ts-ignore
    if (!user.password) {
      throw new Error(
        'User does not have a password set. Please use password reset instead.',
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      // @ts-ignore
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Check if new password is different from current password
    // @ts-ignore
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    // @ts-ignore
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password changed successfully',
      success: true,
    };
  } catch (error) {
    console.error('Error in changePasswordService:', error);
    throw new Error(error.message || 'Failed to change password');
  }
};

const assignGuestSubscriptionAfterSignUp = async (userId) => {
  const t = await sequelize.transaction();

  try {
    let subscription = await UserSubscription.findOne({
      where: { userId },
      transaction: t,
    });

    if (subscription) {
      await t.commit();
      return subscription;
    }

    const { subscriptionPeriodStart, subscriptionPeriodEnd } =
      subscriptionUsageService.getSubscriptionPeriod();

    subscription = await UserSubscription.create(
      {
        id: uuidv4(),
        userId,
        planId: '00000000-0000-0000-0000-000000000001',
        status: 'active',
        startDate: subscriptionPeriodStart,
        endDate: subscriptionPeriodEnd,
        nextBillingDate: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ),
        autoRenew: true,
        paymentMethod: 'free',
      },
      { transaction: t },
    );

    const plan = await SubscriptionPlan.findByPk(subscription.planId, {
      transaction: t,
    });

    const usage = await SubscriptionUsage.create(
      {
        id: uuidv4(),
        subscriptionId: subscription.id,
        userId,
        periodStart: subscriptionPeriodStart,
        periodEnd: subscriptionPeriodEnd,
        keyFeature: 'default_plan_allocation',
        limit: plan.limits?.maxConsultationsPerMonth ?? 0,
        chatConsumed: 0,
        chatLimit: plan.limits?.maxChatsPerMonth ?? 0,
        metadata: { notes: 'Default Package (OAuth Signup)' },
      },
      { transaction: t },
    );

    const { billingPeriodStartDate, billingPeriodEndDate } =
      getBillingPeriodDates(new Date());

    const invoice = await invoiceOperationService.createInvoiceForSubscription(
      userId,
      usage,
      plan,
      billingPeriodStartDate,
      billingPeriodEndDate,
      null,
      t,
    );

    await subscription.update({ invoiceId: invoice.id }, { transaction: t });

    await t.commit();
    return subscription;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// Request Login Code
const requestLoginCodeService = async ({ email }) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    const loginCode = generateLoginCode();
    const loginCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // @ts-ignore
    user.loginCode = loginCode;
    // @ts-ignore
    user.loginCodeExpiresAt = loginCodeExpiresAt;
    await user.save();

    // Send login code email
    await sendLoginCodeEmail(user, loginCode);

    return { message: 'Verification code sent to your email.' };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in requestLoginCodeService:', error);

    // Rethrow the error so the controller can handle it
    throw new Error(error.message || 'Failed to request login code');
  }
};

// Verify Login Code and login
const verifyLoginCodeService = async ({ email, code }) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    if (
      // @ts-ignore
      !user.loginCode ||
      // @ts-ignore
      !user.loginCodeExpiresAt ||
      // @ts-ignore
      user.loginCode !== code ||
      // @ts-ignore
      new Date() > user.loginCodeExpiresAt
    ) {
      throw new Error('Invalid or expired code');
    }

    // Clear login code and expiry
    // @ts-ignore
    user.loginCode = null;
    // @ts-ignore
    user.loginCodeExpiresAt = null;
    await user.save();

    // Generate tokens
    const payload = {
      // @ts-ignore
      userId: user.id,
      // @ts-ignore
      username: user.username,
      // @ts-ignore
      email: user.email,
      // @ts-ignore
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        // @ts-ignore
        id: user.id,
        // @ts-ignore
        username: user.username,
        // @ts-ignore
        email: user.email,
        // @ts-ignore
        role: user.role,
      },
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in verifyLoginCodeService:', error);

    // Rethrow the error so the controller can handle it
    throw new Error(error.message || 'Failed to verify login code');
  }
};

const upsertOAuthUser = async (provider, oauthUser, role = 'patient') => {
  const uniqueOAuthId = `${provider}_${oauthUser.id}`;

  const [user, created] = await User.findOrCreate({
    where: { email: oauthUser.email },
    defaults: {
      username: oauthUser.email,
      email: oauthUser.email,
      password: null,
      role: role,
      oauthProvider: provider,
      oauthId: uniqueOAuthId,
    },
  });

  // @ts-ignore
  if (user && !user.oauthId) {
    await user.update({
      oauthProvider: provider,
      oauthId: uniqueOAuthId,
    });
  }

  // @ts-ignore
  if (!created && !user.oauthProvider) {
    // @ts-ignore
    user.oauthProvider = provider;
    // @ts-ignore
    user.oauthId = uniqueOAuthId;
    await user.save();
  }

  return {
    // @ts-ignore
    id: user.id,
    // @ts-ignore
    username: user.username,
    // @ts-ignore
    email: user.email,
    // @ts-ignore
    role: user.role,
  };
};

const createJwtForUser = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

const generateTurnCredentials = (userId, ttl = 600) => {
  const TURN_SECRET = process.env.TURN_SECRET;
  const username = `${Math.floor(Date.now() / 1000) + ttl}:${userId}`;
  const credential = crypto
    .createHmac('sha1', TURN_SECRET)
    .update(username)
    .digest('base64');
  return { username, credential, ttl };
};

const STUN_SERVER = process.env.STUN_SERVER;
const TURN_SERVER = process.env.TURN_SERVER;

const getIceServers = (userId, ttl = 600) => {
  const { username, credential } = generateTurnCredentials(userId, ttl);
  const iceServers = [
    { urls: STUN_SERVER },
    {
      urls: TURN_SERVER,
      username,
      credential,
    },
  ];
  return { iceServers };
};

module.exports = {
  registerUserService,
  loginUserService,
  requestPasswordResetService,
  resetPasswordService,
  verifyPasswordResetCodeService,
  changePasswordService,
  requestLoginCodeService,
  verifyLoginCodeService,
  upsertOAuthUser,
  assignGuestSubscriptionAfterSignUp,
  createJwtForUser,
  generateTurnCredentials,
  getIceServers,
  verifyEmailOtpService,
};
