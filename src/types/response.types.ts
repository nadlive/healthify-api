import type { AppointmentType, SubscriptionUsageType } from './model.types';

export type RefundInvoiceItem = {
  id: string;
  invoiceId: string;
  appointmentId: string | null;
  type: string;
  description: string;
  amount: number;
  metadata: Record<string, unknown>;
};

export type CancelNotConfirmedResult = {
  appointments: AppointmentType[];
  refundInvoiceItems: RefundInvoiceItem[];
};

export type RenewSubscriptionsScheduleResult = {
  subscriptionUsages: SubscriptionUsageType[];
};
