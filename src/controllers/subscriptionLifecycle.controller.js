const { UserSubscription, SubscriptionPlan } = require('../models');
const lifecycleService = require('../services/subscriptionLifecycle.service');
const notificationService = require('../services/notification.service');
const subscriptionUsageService = require('../services/subscriptionUsage.service');

class SubscriptionLifecycleController {
  async notifyExpiringSubscriptions(req, res) {
    try {
      const { lookAheadDays = 3 } = req.body;
      const now = new Date();
      const targetDate = new Date(
        now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000,
      );

      const subscriptions = await UserSubscription.findAll({
        where: {
          status: 'active',
          [require('sequelize').Op.or]: [
            {
              nextBillingDate: {
                [require('sequelize').Op.lte]: targetDate,
                [require('sequelize').Op.gte]: now,
              },
            },
            {
              endDate: {
                [require('sequelize').Op.lte]: now,
              },
            },
          ],
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      });

      const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [],
      };

      for (const subscription of subscriptions) {
        results.processed++;

        if (
          !lifecycleService.shouldSendRenewalReminder(
            subscription,
            now,
            lookAheadDays,
          )
        ) {
          continue;
        }

        try {
          const userEmail = subscription.metadata?.email || req.body.testEmail;

          if (!userEmail) {
            results.errors.push({
              subscriptionId: subscription.id,
              error: 'User email not found',
            });
            results.failed++;
            continue;
          }

          await notificationService.sendRenewalReminder(
            subscription,
            subscription.plan,
            userEmail,
          );

          await subscription.update({
            lastNotificationAt: now,
            lastNotificationType: 'renewal_reminder',
          });

          results.sent++;
        } catch (error) {
          console.error(
            `Error sending notification for subscription ${subscription.id}:`,
            error,
          );
          results.errors.push({
            subscriptionId: subscription.id,
            error: error.message,
          });
          results.failed++;
        }
      }

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Error processing expiring subscriptions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process expiring subscriptions',
      });
    }
  }

  async renewSubscriptionManual(req, res) {
    try {
      const { patientId } = req.params;

      await subscriptionUsageService.renewSubscriptionManual(patientId);

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          'Failed to renew subscription - already renewed or another error occurred',
      });
    }
  }
}

module.exports = new SubscriptionLifecycleController();
