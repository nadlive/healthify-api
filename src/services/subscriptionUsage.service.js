const { Op } = require('sequelize');
const {
  SubscriptionUsage,
  UserSubscription,
  SubscriptionPlan,
  User,
  Patient,
} = require('../models');
const patientService = require('./patient.ehr.service');
const InvoiceOperationService = require('./invoice.operation.service');
const sequelize = require('../config/sequelize');
const { getFreeAppointmentUsageCount } = require('./appointment.service');
const { getBillingPeriodDates } = require('../utils/bill.utils');

function getSubscriptionPeriod(referenceDate = new Date()) {
  const today = new Date(referenceDate);

  const periodStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0,
  );

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    subscriptionPeriodStart: periodStart, // inclusive
    subscriptionPeriodEnd: periodEnd, // exclusive
  };
}

async function getUsageSummary(subscriptionId) {
  const usageRecord = await SubscriptionUsage.findOne({
    where: { subscriptionId, status: 'active' },
    include: [
      {
        model: User,
        as: 'user',
        include: [
          {
            model: Patient,
            as: 'patient',
            required: false,
          },
        ],
      },
    ],
  });

  const patientId = usageRecord?.user?.patient?.patient_id;
  if (!patientId) {
    return {
      consumed: 0,
      limit: 0,
      freeAppointmentBalance: 0,
    };
  }
  const consumed = await getFreeAppointmentUsageCount(
    patientId,
    usageRecord.periodStart,
    usageRecord.periodEnd,
  );
  return {
    consumed,
    limit: usageRecord.limit,
    freeAppointmentBalance: usageRecord.limit - consumed,
  };
}

async function getActiveSubscriptionUsage(userId) {
  const subscriptions = await UserSubscription.findOne({
    where: { userId, status: 'active' },
    include: [
      {
        model: SubscriptionUsage,
        as: 'usageRecords',
        where: { status: 'active' },
      },
      {
        model: User,
        as: 'user',
        include: [
          {
            model: Patient,
            as: 'patient',
            required: false,
          },
        ],
      },
    ],
  });

  if (!subscriptions) {
    return {
      consumed: 0,
      limit: 0,
      freeAppointmentBalance: 0,
    };
  }

  const patientId = subscriptions?.user?.patient?.patient_id;

  if (!patientId) {
    return {
      consumed: 0,
      limit: 0,
      freeAppointmentBalance: 0,
    };
  }

  const consumed = await getFreeAppointmentUsageCount(
    patientId,
    subscriptions.usageRecords.periodStart,
    subscriptions.usageRecords.periodEnd,
  );

  return {
    consumed,
    limit: subscriptions.usageRecords.limit,
    freeAppointmentBalance: subscriptions.usageRecords.limit - consumed,
  };
}

async function getCurrentSubscriptionUsage(userId) {
  return SubscriptionUsage.findOne({
    where: { userId, status: 'active' },
    include: [
      {
        model: UserSubscription,
        as: 'subscription',
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan',
          },
        ],
      },
    ],
  });
}

async function createNewSubscription(userId, plan, transaction) {
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, 'monthly');

  const subscription = await UserSubscription.create(
    {
      userId,
      planId: plan.id,
      status: 'active',
      startDate,
      endDate,
      nextBillingDate: endDate,
      paymentMethod: 'free',
      autoRenew: false,
    },
    { transaction },
  );

  await subscription.createUsageRecords(
    {
      userId,
      periodStart: startDate,
      periodEnd: endDate,
      limit: plan.limits?.maxConsultationsPerMonth || 0,
      chatConsumed: 0,
      chatLimit: plan.limits?.maxChatsPerMonth || 0,
      keyFeature: 'default_plan_allocation',
    },
    { transaction },
  );

  return subscription;
}

async function expireCurrentSubscription(
  currentSubscriptionUsage,
  transaction,
) {
  currentSubscriptionUsage.status = 'expired';
  await currentSubscriptionUsage.save({ transaction });
  currentSubscriptionUsage.subscription.status = 'expired';
  await currentSubscriptionUsage.subscription.save({ transaction });
}

function calculateEndDate(startDate, billingPeriod) {
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
  }

  return date;
}

// This will be called from admin to manually renew
async function renewSubscriptionManual(patientId) {
  const patient = await patientService.getPatient(patientId);

  // @ts-ignore
  const userId = patient.userId;

  const userSubscription = await UserSubscription.findOne({
    where: { userId, status: 'active' },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });

  const plan = userSubscription.plan;

  if (!userSubscription) {
    throw new Error('Subscription not found');
  }

  const { subscriptionPeriodStart, subscriptionPeriodEnd } =
    getSubscriptionPeriod(new Date());
  const transaction = await sequelize.transaction();

  try {
    const subscriptionUsage = await SubscriptionUsage.create(
      {
        subscriptionId: userSubscription.id,
        userId,
        keyFeature: 'renewed_subscription_allocation',
        periodStart: subscriptionPeriodStart,
        periodEnd: subscriptionPeriodEnd,
        limit: plan.limits?.maxConsultationsPerMonth ?? 0,
        chatConsumed: 0,
        chatLimit: plan.limits?.maxChatsPerMonth ?? 0,
        metadata: { notes: 'System Renewed subscription allocation' },
      },
      { transaction },
    );

    await SubscriptionUsage.update(
      { status: 'expired' },
      {
        where: { userId, id: { [Op.ne]: subscriptionUsage.id } },
        transaction,
      },
    );

    const { billingPeriodStartDate, billingPeriodEndDate } =
      getBillingPeriodDates();

    await InvoiceOperationService.createInvoiceForSubscription(
      userId,
      subscriptionUsage,
      plan,
      billingPeriodStartDate,
      billingPeriodEndDate,
      null,
      transaction,
    );

    await transaction.commit();

    return { subscriptionUsage };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function getSubscriptionUsagesToRenew() {
  return SubscriptionUsage.findAll({
    where: {
      status: 'active',
      periodEnd: { [Op.lt]: new Date() },
    },
    include: [
      {
        model: UserSubscription,
        as: 'subscription',
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan',
          },
        ],
      },
      {
        model: Patient,
        as: 'patient',
        required: true,
      },
    ],
  });
}

module.exports = {
  getUsageSummary,
  getActiveSubscriptionUsage,
  getSubscriptionPeriod,
  renewSubscriptionManual,
  getCurrentSubscriptionUsage,
  createNewSubscription,
  expireCurrentSubscription,
  getSubscriptionUsagesToRenew,
};
