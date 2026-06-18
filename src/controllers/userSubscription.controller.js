// @ts-ignore
const { UserSubscription, SubscriptionPlan, sequelize } = require('../models');
const lifecycleService = require('../services/subscriptionLifecycle.service');
const usageService = require('../services/subscriptionUsage.service');
const subscriptionPlanService = require('../services/subscriptionPlan.service');
const paymentService = require('../services/payment.service');
const paymentPayhereGatewayService = require('../services/payment.payhere.gateway.service');

class UserSubscriptionController {
  constructor() {
    this.subscribe = this.subscribe.bind(this);
  }

  async subscribe(req, res) {
    const transaction = await sequelize.transaction();
    const { userId, email: userEmail } = req.user;
    const { planId } = req.body;

    const subscriptionUsage =
      await usageService.getCurrentSubscriptionUsage(userId);

    const newPlan = await SubscriptionPlan.findByPk(planId);
    const currentPlan = subscriptionUsage.subscription.plan;

    if (currentPlan.id === newPlan.id) {
      throw new Error('Subscribing to the same plan');
    }

    /* If only going back to free plan we expire old subscription and create new one
     without charging the user for the new subscription
      If going to paid the subscription usage and subscription change will happen when payhere notify payment is successful
     */
    if (subscriptionPlanService.isZeroFeePlan(newPlan)) {
      await usageService.expireCurrentSubscription(
        subscriptionUsage,
        transaction,
      );

      await usageService.createNewSubscription(userId, newPlan, transaction);

      await transaction.commit();
      return res.json({ success: true });
    }

    const payment = await paymentService.makePayment(
      userId,
      newPlan.price,
      null,
      { method: 'payhere', type: 'subscription_upgrade', planId: newPlan.id },
      `Subscription - ${newPlan.displayName}`,
      'pending',
      transaction,
    );

    const payhereData =
      paymentPayhereGatewayService.createPayhereTransactionData({
        orderId: payment.id,
        amount: payment.amount,
        description: `Subscription - ${newPlan.name}`,
        customer: { userEmail },
      });

    await transaction.commit();

    return res.json({
      success: true,
      paymentId: payment.id,
      paymentUrl: paymentPayhereGatewayService.getPaymentUrl(),
      paymentData: payhereData,
    });
  }

  async getUserSubscription(req, res) {
    try {
      const { userId } = req.user;

      const subscription = await UserSubscription.findOne({
        where: { userId },
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan',
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No subscription found for user',
        });
      }

      // Sync lifecycle status
      const statusCheck = lifecycleService.evaluateStatus(subscription);
      if (statusCheck.needsUpdate) {
        await subscription.update(statusCheck.updates);
        await subscription.reload();
      }

      // Get usage summary
      const usageSummary = await usageService.getUsageSummary(subscription.id);

      // Build renewal message
      const renewalMessage = lifecycleService.buildRenewalMessage(subscription);

      res.status(200).json({
        success: true,
        data: {
          ...subscription.toJSON(),
          usageSummary,
          renewalMessage,
        },
      });
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription',
      });
    }
  }

  async calculateEndDate(startDate, billingPeriod) {
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
      default:
        throw new Error(`Invalid billingPeriod: ${billingPeriod}`);
    }

    return date;
  }
  getPayHereRecurrence(billingPeriod) {
    const recurrenceMap = {
      monthly: '1 Month',
      quarterly: '3 Months',
      yearly: '1 Year',
    };
    return recurrenceMap[billingPeriod] || '1 Month';
  }
}

module.exports = new UserSubscriptionController();
