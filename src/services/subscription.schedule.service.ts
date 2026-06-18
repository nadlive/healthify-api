import type { RenewSubscriptionsScheduleResult } from '@/types';
import { SubscriptionUsageType } from '@/types/model.types';
const { formatDateToTimezone } = require('@src/utils/date');
const {
  getSubscriptionPeriod,
} = require('@src/services/subscriptionUsage.service');
const {
  getSubscriptionUsagesToRenew,
} = require('@src/services/subscriptionUsage.service');
const { SubscriptionUsage } = require('@src/models');
const sequelize = require('@src/config/sequelize');
const {
  sendSubscriptionRenewedNotice,
} = require('@src/services/notification.service');

export async function renewSubscriptionsScheduleService(): Promise<RenewSubscriptionsScheduleResult> {
  const subscriptionUsages = await getSubscriptionUsagesToRenew();

  let newSubscriptionUsages: SubscriptionUsageType[] = [];
  const transaction = await sequelize.transaction();

  for (const subscriptionUsageOld of subscriptionUsages) {
    const plan = subscriptionUsageOld.subscription.plan;
    const patient = subscriptionUsageOld.patient;

    await subscriptionUsageOld.update({ status: 'expired' }, { transaction });
    const { subscriptionPeriodEnd } = getSubscriptionPeriod(
      subscriptionUsageOld.periodEnd,
    );

    const newUserSubscription = await SubscriptionUsage.create(
      {
        subscriptionId: subscriptionUsageOld.subscriptionId,
        userId: subscriptionUsageOld.userId,
        metadata: { notes: 'System Renewed subscription allocation' },
        status: 'active',
        periodStart: subscriptionUsageOld.periodEnd,
        periodEnd: subscriptionPeriodEnd,
        consumed: 0,
        limit: plan.limits?.maxConsultationsPerMonth ?? 0,
        chatConsumed: 0,
        chatLimit: plan.limits?.maxChatsPerMonth ?? 0,
        keyFeature: 'default_plan_allocation',
      },
      { transaction },
    );
    newUserSubscription.patient = patient;
    newUserSubscription.plan = plan;

    newSubscriptionUsages.push(newUserSubscription);
  }
  await transaction.commit();

  for (const newSubscriptionUsage of newSubscriptionUsages) {
    const subscriptionDetails = {
      planName: newSubscriptionUsage?.plan?.displayName ?? '',
      patientName: `${newSubscriptionUsage?.patient?.firstName ?? ''} ${newSubscriptionUsage?.patient?.lastName ?? ''}`,
      renewalDate: formatDateToTimezone(
        new Date(),
        newSubscriptionUsage?.patient?.timezone,
        'yyyy-MM-dd',
      ),
      startDate: formatDateToTimezone(
        newSubscriptionUsage?.periodStart,
        newSubscriptionUsage?.patient?.timezone,
        'yyyy-MM-dd',
      ),
      endDate: formatDateToTimezone(
        newSubscriptionUsage?.periodEnd,
        newSubscriptionUsage?.patient?.timezone,
        'yyyy-MM-dd',
      ),
      email: newSubscriptionUsage?.patient?.email ?? '',
    };
    await sendSubscriptionRenewedNotice(subscriptionDetails);
  }

  return {
    subscriptionUsages: newSubscriptionUsages,
  };
}
