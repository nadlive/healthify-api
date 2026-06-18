import { addMonths } from 'date-fns';
import { MONTH_START_DATE } from '../constants/Billing.Constants.js';

/**
 * Returns the billing cycle that contains the given date (UTC).
 * Interval [start, end): start inclusive, end exclusive.
 * E.g. MONTH_START_DATE=3: 2026-03-03 00:00 UTC → 2026-04-03 00:00 UTC.
 *
 */
function getBillingPeriodDates(referenceDate = new Date()) {
  const ref = new Date(referenceDate);

  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();
  const day = ref.getUTCDate();
  const monthStartDay = MONTH_START_DATE;

  const periodStart =
    day >= monthStartDay
      ? new Date(Date.UTC(year, month, monthStartDay, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month - 1, monthStartDay, 0, 0, 0, 0));

  const periodEnd = addMonths(periodStart, 1);
  const result = {
    billingPeriodStartDate: periodStart,
    billingPeriodEndDate: periodEnd,
  };

  return result;
}

export { getBillingPeriodDates };

export function formatUTCDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
