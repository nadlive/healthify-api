import type { Transaction } from 'sequelize';

export type TimeSlotWithUpdate = {
  update(
    values: { is_booked: boolean },
    opts: { transaction: Transaction },
  ): Promise<unknown>;
};

export type InvoiceItemType = {
  id: string;
  invoiceId: string;
};
export type PractitionerType = {
  prefix?: string | null;
  firstName: string;
  lastName: string;
};

export type PatientType = {
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string | null;
  email?: string | null;
};

export type AppointmentType = {
  appointment_id?: string;
  scheduled_time?: string | Date;
  update(
    values: { status: string },
    opts: { transaction: Transaction },
  ): Promise<unknown>;
  timeSlot?: TimeSlotWithUpdate;
  invoiceItems?: InvoiceItemType[];
  appointmentCharge?: number;
  practitioner?: PractitionerType | null;
  patient?: PatientType | null;
};

export type SubscriptionPlanType = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  limits: {
    maxConsultationsPerMonth: number;
    maxChatsPerMonth: number;
  };
};

export type UserSubscriptionType = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string | Date;
  endDate: string | Date;
  nextBillingDate: string | Date;
  cancelledAt: string | Date;
  cancelReason: string | null;
  plan?: SubscriptionPlanType | null;
};

export type SubscriptionUsageType = {
  id: string;
  subscriptionId: string;
  userId: string;
  status: string;
  keyFeature: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  consumed: number;
  limit: number;
  chatConsumed: number;
  chatLimit: number;
  patient?: PatientType;
  plan?: SubscriptionPlanType;
};
