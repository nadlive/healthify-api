import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import type { AppointmentType, CancelNotConfirmedResult } from '@/types';

const sequelize = require('@src/config/sequelize') as {
  transaction: () => Promise<Transaction>;
};
const {
  Appointment,
  InvoiceItem,
  TimeSlot,
  Practitioner,
  Patient,
} = require('@src/models');
const {
  sendAppointmentCancelledNotice,
} = require('@src/services/notification.service');
const { formatDateToTimezone } = require('@src/utils/date');

export async function cancelNotConfirmedAppointmentsScheduleService(): Promise<CancelNotConfirmedResult> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const appointments = (await Appointment.findAll({
    where: {
      status: 'Booked',
      type: 'paid',
      created_at: { [Op.lt]: tenMinutesAgo },
    },
    include: [
      { model: InvoiceItem, as: 'invoiceItems' },
      { model: TimeSlot, as: 'timeSlot' },
      { model: Practitioner, as: 'practitioner' },
      { model: Patient, as: 'patient' },
    ],
  })) as AppointmentType[];

  const refundInvoiceItems: CancelNotConfirmedResult['refundInvoiceItems'] = [];
  const transaction = await sequelize.transaction();

  try {
    for (const appointment of appointments) {
      await appointment.update({ status: 'Cancelled' }, { transaction });
      if (appointment.timeSlot) {
        await appointment.timeSlot.update(
          { is_booked: false },
          { transaction },
        );
      }
    }

    for (const appointment of appointments) {
      const invoiceItems = appointment.invoiceItems ?? [];
      const charge = Number(appointment.appointmentCharge) ?? 0;
      const originalItem = invoiceItems[0];
      if (originalItem && charge > 0) {
        const appointmentId = appointment.appointment_id ?? null;
        const refundItem = await InvoiceItem.create(
          {
            invoiceId: originalItem.invoiceId,
            appointmentId,
            type: 'adjustment',
            description: 'Refund as doctor not accepting appointment',
            amount: -charge,
            metadata: {
              refundType: 'partial',
              originalInvoiceItemId: originalItem.id,
            },
          },
          { transaction },
        );
        refundInvoiceItems.push({
          id: refundItem.id,
          invoiceId: refundItem.invoiceId,
          appointmentId: refundItem.appointmentId ?? null,
          type: refundItem.type,
          description: refundItem.description,
          amount: Number(refundItem.amount),
          metadata: (refundItem.metadata as Record<string, unknown>) ?? {},
        });
      }
    }

    await transaction.commit();

    for (const appointment of appointments) {
      const patientEmail = appointment.patient?.email?.trim();
      if (!patientEmail) continue;

      const scheduledDate = appointment.scheduled_time
        ? new Date(appointment.scheduled_time)
        : new Date();
      const patientTimezone = appointment.patient?.timezone?.trim() || 'UTC';
      const dateAndTime = formatDateToTimezone(scheduledDate, patientTimezone);
      const p = appointment.practitioner;
      const practitionerName = p
        ? [p.prefix, p.firstName, p.lastName].filter(Boolean).join(' ')
        : '';
      await sendAppointmentCancelledNotice(
        {
          practitionerName,
          dateAndTime,
          reason: 'doctor did not accept appointment within 24 hours',
        },
        patientEmail,
      );
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    appointments,
    refundInvoiceItems,
  };
}
