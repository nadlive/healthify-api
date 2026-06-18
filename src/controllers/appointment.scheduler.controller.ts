import { cancelNotConfirmedAppointmentsScheduleService } from '@/services/appointment.schedule.service';
import type { AppointmentType } from '@/types';

export async function cancelNotConfirmedAppointments(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): Promise<void> {
  const result = await cancelNotConfirmedAppointmentsScheduleService();
  const appointments = result.appointments.map(
    (appointment: AppointmentType) => {
      return JSON.parse(JSON.stringify(appointment));
    },
  );

  console.log(appointments);
  res.status(200).json({
    date: new Date().toISOString(),
    message: 'Cron job executed successfully',
    appointments,
    refundInvoiceItems: result.refundInvoiceItems,
  });
}
