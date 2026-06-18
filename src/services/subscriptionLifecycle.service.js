const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Evaluate the status of the subscription
function evaluateStatus(subscription, now = new Date()) {
  if (!subscription) return { status: 'unknown', needsUpdate: false };

  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const graceEnd = subscription.gracePeriodEndsAt
    ? new Date(subscription.gracePeriodEndsAt)
    : null;

  if (endDate && now > endDate) {
    if (subscription.autoRenew && graceEnd && now <= graceEnd) {
      return {
        status: 'past_due',
        needsUpdate: subscription.status !== 'past_due',
        updates: { status: 'past_due' },
      };
    }
    return {
      status: 'expired',
      needsUpdate: subscription.status !== 'expired',
      updates: { status: 'expired' },
    };
  }

  if (subscription.status !== 'active') {
    return {
      status: 'active',
      needsUpdate: true,
      updates: { status: 'active' },
    };
  }

  return { status: 'active', needsUpdate: false };
}

// Determine if a renewal reminder should be sent
function shouldSendRenewalReminder(
  subscription,
  now = new Date(),
  lookAheadDays = 3,
) {
  if (!subscription || subscription.status !== 'active') return false;
  const targetDate = subscription.nextBillingDate || subscription.endDate;
  if (!targetDate) return false;

  const diffDays = (new Date(targetDate) - now) / MS_IN_DAY;
  if (diffDays < 0) return false;
  if (diffDays > lookAheadDays) return false;
  if (
    subscription.lastNotificationAt &&
    subscription.lastNotificationType === 'renewal_reminder'
  )
    return false;

  return true;
}

// Build the renewal message based on the subscription status
function buildRenewalMessage(subscription) {
  if (!subscription) return { text: null, severity: 'info' };

  const date = subscription.nextBillingDate || subscription.endDate;
  const displayDate = date ? new Date(date).toLocaleDateString() : 'soon';
  const price = subscription.plan?.price
    ? `${subscription.plan.currency || 'LKR'} ${subscription.plan.price}`
    : 'the plan price';

  if (subscription.autoRenew) {
    return {
      text: `Your ${subscription.plan?.displayName || 'plan'} will auto-renew on ${displayDate}. We will charge ${price}.`,
      severity: 'info',
    };
  }

  return {
    text: `Your ${subscription.plan?.displayName || 'plan'} expires on ${displayDate}. Renew now to avoid interruption.`,
    severity: 'warning',
  };
}

function rolloverPeriod(subscription, plan, now = new Date()) {
  if (!subscription || !plan) return {};

  const nextStart = subscription.endDate ? new Date(subscription.endDate) : now;
  const nextEnd = calculateEndDate(nextStart, plan.billingPeriod);
  return {
    startDate: nextStart,
    endDate: nextEnd,
    nextBillingDate: nextEnd,
    usageResetAt: now,
  };
}

function calculateEndDate(start, billingPeriod) {
  const date = new Date(start);
  switch (billingPeriod) {
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
      date.setMonth(date.getMonth() + 1);
  }
  return date;
}

module.exports = {
  evaluateStatus,
  shouldSendRenewalReminder,
  buildRenewalMessage,
  rolloverPeriod,
};
