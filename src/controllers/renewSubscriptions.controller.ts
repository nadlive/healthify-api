import { renewSubscriptionsScheduleService } from '@/services/subscription.schedule.service';
import { SubscriptionUsageType } from '@/types/model.types';

export async function renewSubscriptionsScheduleController(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): Promise<void> {
  const result = await renewSubscriptionsScheduleService();
  const userSubscriptions = result.subscriptionUsages.map(
    (subscriptionUsage: SubscriptionUsageType) => {
      return JSON.parse(JSON.stringify(subscriptionUsage));
    },
  );

  res.status(200).json({
    date: new Date().toISOString(),
    message: 'Cron-Subscriptions renewed successfully',
    userSubscriptions,
  });
}
