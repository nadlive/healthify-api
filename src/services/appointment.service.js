// Business logic for appointment service
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const Appointment = require('../models/appointmentModel');
const TimeSlot = require('../models/timeSlot');
const Practitioner = require('../models/practitioner.model.entity');
const Speciality = require('../models/speciality.model');
const { checkAndBookTimeSlot } = require('./timeSlot.service');
const Patient = require('../models/patient.identity.model');
const { formatDateToTimezone } = require('../utils/date');
const {
  UserSubscription,
  SubscriptionPlan,
  SubscriptionUsage,
  Invoice,
  InvoiceItem,
  // @ts-ignore
  Payment,
  Chat,
} = require('../models');
const { GUEST_PLAN_ID } = require('../constants/PLAN');
const userService = require('./user.service');
const invoiceService = require('./invoice.service');
const { APPOINTMENT_STATUSES_COUNTED } = require('../constants/APPOINTMENT');
async function getFreeAppointmentUsageCount(
  patientId,
  fromDate,
  toDate,
  transaction,
) {
  const count = await Appointment.count({
    where: {
      scheduled_time: { [Op.between]: [fromDate, toDate] },
      status: { [Op.in]: APPOINTMENT_STATUSES_COUNTED },
      patient_id: patientId,
      type: 'free',
    },
    transaction,
  });
  return count;
}

const getAllAppointmentsService = async () => {
  const appointments = await Appointment.findAll({
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Practitioner,
        as: 'practitioner',
      },
      {
        model: TimeSlot,
        as: 'timeSlot',
      },
    ],
  });
  return appointments;
};

/**
 * User can create appointments will following conditions:
 * 1. If the time slot is not booked, will continue to check.
 * 2. If the appointment scheduled time is in usage period (its not based on created date to avoid exploitation)
 * 3. If the appointment is free, will continue to check.
 * 4. Will create an appointment - if free type=free else type=paid and amount is the provider fee if not free
 * 5. If not free will create an invoice and invoice item
 *  */
const createAppointmentService = async (appointmentData) => {
  const transaction = await sequelize.transaction();

  const user = await userService.getUserByUserId(appointmentData.userId);
  // @ts-ignore
  const patient = user?.patient;

  try {
    const isBooked = await checkAndBookTimeSlot(
      appointmentData.time_slot_id,
      transaction,
    );
    if (!isBooked) throw new Error('TIME_SLOT_NOT_AVAILABLE');

    const scheduledTimeSlot = await TimeSlot.findOne({
      where: { time_slot_id: appointmentData.time_slot_id },
      include: [{ model: Practitioner, as: 'provider' }],
      transaction,
    });

    const usageRecord = await SubscriptionUsage.findOne({
      where: { userId: appointmentData.userId, status: 'active' },
      include: [
        { model: Patient, as: 'patient' },
        { model: UserSubscription, as: 'subscription' },
      ],
      transaction,
    });

    const isPayedSubscription =
      usageRecord.subscription.planId !== GUEST_PLAN_ID;

    const consumed = await getFreeAppointmentUsageCount(
      patient.patient_id,
      usageRecord.periodStart,
      usageRecord.periodEnd,
      transaction,
    );

    const isFreeUsed = consumed >= usageRecord.limit;
    // @ts-ignore
    const isAppointmentInCurrentPeriod =
      // @ts-ignore
      scheduledTimeSlot.start_time >= usageRecord.periodStart &&
      // @ts-ignore
      scheduledTimeSlot.end_time <= usageRecord.periodEnd;

    // IF the appointment is in the current period and the all free usage is not used, then the appointment is free
    const isFree = !isFreeUsed && isAppointmentInCurrentPeriod;

    const appointmentStatus =
      isFree || isPayedSubscription ? 'Booked' : 'Payment Pending';

    // @ts-ignore
    const charge = isFree ? 0 : parseFloat(scheduledTimeSlot.provider.fee);

    const appointment = await Appointment.create(
      {
        patient_id: patient.patient_id,
        // @ts-ignore
        practitioner_id: scheduledTimeSlot.provider.practitioner_id,
        subscriptionUsageId: usageRecord.id,
        time_slot_id: appointmentData.time_slot_id,
        additionalDetails: appointmentData.additionalDetails,
        status: appointmentStatus,
        appointment_type: appointmentData.appointmentType,
        appointment_mode: appointmentData.appointmentMode ?? 'Video',
        // @ts-ignore
        scheduled_time: scheduledTimeSlot.start_time,
        // @ts-ignore
        end_time: scheduledTimeSlot.end_time,
        appointmentCharge: charge,
        type: isFree ? 'free' : 'paid',
        appointmentNoteByPatient: appointmentData.note,
      },
      { transaction },
    );

    if (!isFree) {
      await invoiceService.createInvoiceItemForActiveInvoice(
        patient.userId,
        appointment,
        charge,
        transaction,
      );
    }

    await transaction.commit();

    return {
      appointment: appointment.dataValues,
      isOutsideUsagePeriod: !isAppointmentInCurrentPeriod,
      isFree,
      isPayedSubscription,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getAppointmentsForPatientService = async (patientId) => {
  const appointments = await Appointment.findAll({
    where: { patient_id: patientId },
    order: [['scheduled_time', 'DESC']],
    include: [
      {
        model: Practitioner,
        as: 'practitioner',
        attributes: ['practitioner_id', 'prefix', 'firstName', 'lastName'],
        include: [
          {
            model: Speciality,
            as: 'specialities',
            attributes: ['id', 'name'],
            through: { attributes: [] },
          },
        ],
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['patient_id', 'firstName', 'lastName', 'timezone'],
      },
      { model: Chat, as: 'chat' },
    ],
  });

  return appointments;
};

const getAppointmentsInPatientTimezone = async (patientId) => {
  const patient = await Patient.findOne({ where: { patient_id: patientId } });
  const timezone = patient?.get('timezone') || 'UTC';

  const appointments = await getAppointmentsForPatientService(patientId);

  return appointments.map((appointment) => {
    const appointmentData = appointment.toJSON();
    return {
      ...appointmentData,
      scheduled_time: formatDateToTimezone(
        appointmentData.scheduled_time,
        // @ts-ignore
        timezone,
      ),
      // @ts-ignore
      end_time: formatDateToTimezone(appointmentData.end_time, timezone),
    };
  });
};

const getAppointmentsForPractitionerService = async (practitionerId) => {
  const appointments = await Appointment.findAll({
    where: { practitioner_id: practitionerId },
    order: [['scheduled_time', 'DESC']],
    include: [
      {
        model: TimeSlot,
        as: 'timeSlot',
      },
      {
        model: Patient,
        as: 'patient',
        attributes: [
          'patient_id',
          'firstName',
          'lastName',
          'timezone',
          'gender',
          'dateOfBirth',
        ],
      },
      { model: Chat, as: 'chat' },
    ],
  });
  return appointments;
};

const getAppointmentService = async (appointmentId) => {
  const appointment = await Appointment.findOne({
    where: { appointment_id: appointmentId },
    include: [
      {
        model: Practitioner,
        as: 'practitioner',
        attributes: ['practitioner_id', 'prefix', 'firstName', 'lastName'],
        include: [
          {
            model: Speciality,
            as: 'specialities',
            attributes: ['id', 'name'],
            through: { attributes: [] },
          },
        ],
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['patient_id', 'firstName', 'lastName', 'timezone'],
      },
    ],
  });

  return appointment;
};

const getAppointmentByPatientTimeZone = async (appointmentId) => {
  const appointment = await getAppointmentService(appointmentId);

  const appointmentData = appointment.toJSON();
  const timezone = appointmentData.patient?.timezone || 'UTC';

  return {
    ...appointmentData,
    scheduled_time: formatDateToTimezone(
      appointmentData.scheduled_time,
      timezone,
    ),
    end_time: formatDateToTimezone(appointmentData.end_time, timezone),
  };
};

const declineAppointmentService = async (appointmentId, userId) => {
  const transaction = await sequelize.transaction();
  const appointment = await Appointment.findOne({
    where: { appointment_id: appointmentId },
    include: [
      {
        model: Practitioner,
        as: 'practitioner',
        attributes: ['practitioner_id', 'userId'],
      },
      { model: TimeSlot, as: 'timeSlot', attributes: ['time_slot_id'] },
    ],
    transaction,
  });

  // @ts-ignore
  if (appointment.practitioner.userId !== userId)
    throw new Error('UNAUTHORIZED_ACCESS');

  // @ts-ignore
  appointment.status = 'Cancelled';
  await appointment.save({ transaction });

  // @ts-ignore
  appointment.timeSlot.is_booked = false;

  // @ts-ignore
  await appointment.timeSlot.save({ transaction });

  // @ts-ignore
  if (appointment.type === 'paid') {
    const invoiceItem = await InvoiceItem.findOne({
      // @ts-ignore
      where: { appointmentId: appointment.appointment_id },
      transaction,
    });

    await InvoiceItem.create({
      invoiceId: invoiceItem.invoiceId,
      type: 'appointment',
      // @ts-ignore
      description: `Declined appointment on ${new Date(appointment.scheduled_time).toISOString().split('T')[0]}`,
      // @ts-ignore
      amount: -Number(appointment.appointmentCharge),
    });
  }

  await transaction.commit();

  return appointment;
};

const cancelAppointmentService = async (appointmentId, userId) => {
  const transaction = await sequelize.transaction();

  try {
    const appointment = await Appointment.findOne({
      where: { appointment_id: appointmentId },
      transaction,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['userId', 'patient_id', 'firstName', 'lastName'],
        },
      ],
    });

    const invoiceItem = await InvoiceItem.findOne({
      // @ts-ignore
      where: { appointmentId: appointment.appointment_id },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!invoiceItem) throw new Error('INVOICE_ITEM_NOT_FOUND');

    const invoice = await Invoice.findByPk(invoiceItem.invoiceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const currentInvoice = await Invoice.findOne({
      where: {
        userId,
        invoiceActiveStatus: true,
      },
      transaction,
    });

    if (!invoice) throw new Error('INVOICE_NOT_FOUND');

    // @ts-ignore
    const appointmentFee = appointment.appointmentCharge || 0;

    const now = new Date();
    // @ts-ignore
    const scheduledTime = new Date(appointment.scheduled_time);
    const hoursBefore =
      (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundType = 'none';

    // @ts-ignore
    if (appointmentFee > 0 && appointment.type === 'paid') {
      if (hoursBefore >= 72) {
        refundAmount = Math.min(Number(invoiceItem.amount), appointmentFee);
        refundType = 'full';
      } else if (hoursBefore >= 24) {
        refundAmount = Math.min(Number(invoiceItem.amount) / 2, appointmentFee);
        refundType = 'partial';
      } else {
        refundAmount = 0;
        refundType = 'none';
      }
    }
    let item = null;

    if (refundAmount > 0) {
      item = await InvoiceItem.create(
        {
          invoiceId: currentInvoice.id,
          // @ts-ignore
          appointmentId: appointment.appointment_id,
          type: 'adjustment',
          amount: -Number(refundAmount),
          description:
            refundType === 'full'
              ? `Full refund for cancelled appointment for ${appointment.appointment_id}`
              : `Partial refund (50%) for cancelled appointment for ${appointment.appointment_id}`,
          metadata: {
            refundType,
            originalInvoiceItemId: invoiceItem.id,
          },
        },
        { transaction },
      );
      await Payment.create(
        {
          userId,
          amount: -refundAmount,
          status: 'refund pending',
          description: 'Payment Refund',
          invoiceId: currentInvoice.id,
          reason:
            refundType === 'full'
              ? 'FULL_APPOINTMENT_REFUND'
              : 'PARTIAL_APPOINTMENT_REFUND',
          metadata: {
            // @ts-ignore
            appointmentId: appointment.appointment_id,
            invoiceNumber: invoice.invoiceNumber,
            item,
          },
        },
        { transaction },
      );
    }
    // Cancel appointment
    // @ts-ignore
    appointment.status = 'Cancelled';
    // @ts-ignore
    appointment.cancelledAt = new Date();
    await appointment.save({ transaction });

    await transaction.commit();

    return {
      success: true,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const confirmAppointmentService = async (appointmentId, userId) => {
  const transaction = await sequelize.transaction();

  try {
    const appointment = await Appointment.findOne({
      where: { appointment_id: appointmentId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['userId', 'patient_id', 'firstName', 'lastName'],
        },
      ],
      transaction,
    });

    // @ts-ignore
    const userId = appointment.patient.userId;

    // @ts-ignore

    const invoice = await Invoice.findOne({
      where: {
        userId,
        invoiceActiveStatus: true,
      },
      transaction,
    });

    const existingInvoiceItem = await InvoiceItem.findOne({
      where: {
        // @ts-ignore
        appointmentId: appointment.appointment_id,
      },
      transaction,
    });

    if (!existingInvoiceItem) {
      await InvoiceItem.create(
        {
          invoiceId: invoice.id,
          // @ts-ignore
          type:
            // @ts-ignore
            appointment.type === 'free' ? 'appointment-free' : 'appointment',
          // @ts-ignore
          description: `Appointment fee: ${new Date(appointment.scheduled_time).toISOString().split('T')[0]}`,
          // @ts-ignore
          amount: appointment.appointmentCharge,
          // @ts-ignore
          appointmentId: appointment.appointment_id,
          // @ts-ignore
          metadata: { appointmentId: appointment.appointment_id },
        },
        { transaction },
      );

      await invoice.update(
        // @ts-ignore
        { amount: invoice.amount + appointment.appointmentCharge },
        { transaction },
      );
    }

    await appointment.update(
      { status: 'Confirmed', confirmedAt: new Date() },
      { transaction },
    );

    await transaction.commit();
    return { message: 'Appointment confirmed successfully' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// update appointment
const updateAppointmentService = async (
  appointmentId,
  updatedAppointmentData,
) => {
  const appointment = await getAppointmentService(appointmentId);
  const updatedAppointment = await appointment.update(updatedAppointmentData);
  return updatedAppointment;
};

const updateAppointmentStatusService = async (appointmentId, status) => {
  return await updateAppointmentService(appointmentId, { status: status });
};

/** Create a chat appointment and linked chat record. Entry point for POST /appointments/chat/initiate. */
const createChatAppointmentService = async (
  userId,
  practitionerId,
  description,
) => {
  const patient = await Patient.findOne({ where: { userId } });

  const activeSubscriptionUsage = await SubscriptionUsage.findOne({
    where: { userId, status: 'active' },
    include: [
      {
        model: UserSubscription,
        as: 'subscription',
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      },
    ],
  });

  const appointmentData = {
    userId,
    provider_id: practitionerId,
    appointmentType: 'General',
    appointmentMode: 'Chat',
    time_slot_id: null,
    additionalDetails: description,
  };

  const appointment = await _createAppointmentForChat(
    appointmentData,
    activeSubscriptionUsage,
  );

  const chat = await Chat.create({
    userId,
    // @ts-ignore
    patientId: patient.patient_id,
    practitionerId,
    status: 'inactive',
    chatType: 'appointment',
    chatName: 'Chat with ',
    // @ts-ignore
    chatId: `${appointment.appointment_id}_${patient.patient_id}_${practitionerId}`,
    description,
    // @ts-ignore
    appointmentId: appointment.appointment_id,
  });

  return { id: chat.id, chatId: chat.chatId };
};

const _createAppointmentForChat = async (
  appointmentData,
  activeSubscriptionUsage,
) => {
  const patient = await Patient.findOne({
    where: { userId: appointmentData.userId },
  });

  const isFree =
    activeSubscriptionUsage.chatConsumed >= activeSubscriptionUsage.chatLimit;

  const appointment = await Appointment.create({
    // @ts-ignore
    patient_id: patient.patient_id,
    practitioner_id: appointmentData.provider_id,
    time_slot_id: null,
    additionalDetails: appointmentData.additionalDetails,
    status: 'Booked',
    appointment_type: 'General Consultation',
    appointment_mode: 'Chat',
    scheduled_time: new Date(),
    end_time: new Date(),
    appointmentCharge: 0,
    type: isFree ? 'free' : 'paid',
  });

  await SubscriptionUsage.update(
    {
      chatConsumed: sequelize.literal('COALESCE("chatConsumed", 0) + 1'),
    },
    { where: { userId: appointmentData.userId, status: 'active' } },
  );

  return appointment;
};

const acceptChatAppointmentService = async (appointmentId) => {
  const [affectedCount] = await Appointment.update(
    { status: 'Confirmed' },
    { where: { appointment_id: appointmentId } },
  );
  await Chat.update(
    { status: 'active' },
    { where: { appointmentId: appointmentId } },
  );
  if (affectedCount === 0) return null;
  const appointment = await Appointment.findByPk(appointmentId);
  return appointment;
};

const rejectChatAppointmentService = async (appointmentId) => {
  const appointment = await Appointment.findOne({
    where: { appointment_id: appointmentId, status: 'Booked' },
    include: [
      {
        model: Patient,
        as: 'patient',
      },
    ],
  });

  if (!appointment) return null;

  await appointment.update({ status: 'Cancelled' });

  await Chat.update(
    { status: 'rejected' },
    { where: { appointmentId: appointmentId } },
  );

  await SubscriptionUsage.update(
    { chatConsumed: sequelize.literal('COALESCE("chatConsumed", 0) - 1') },
    // @ts-ignore
    { where: { userId: appointment.patient.userId, status: 'active' } },
  );

  return appointment;
};

const completeChatAppointmentService = async (appointmentId) => {
  const appointment = await Appointment.findOne({
    where: { appointment_id: appointmentId, status: 'Confirmed' },
  });
  if (!appointment) return null;
  await appointment.update({ status: 'Completed' });

  await Chat.update(
    { status: 'completed' },
    { where: { appointmentId: appointmentId } },
  );

  return appointment;
};

module.exports = {
  createAppointmentService,
  getAppointmentsForPatientService,
  getAppointmentsInPatientTimezone,
  getAppointmentsForPractitionerService,
  getAllAppointmentsService,
  getAppointmentService,
  getAppointmentByPatientTimeZone,
  cancelAppointmentService,
  updateAppointmentService,
  updateAppointmentStatusService,
  confirmAppointmentService,
  createChatAppointmentService,
  acceptChatAppointmentService,
  rejectChatAppointmentService,
  completeChatAppointmentService,
  declineAppointmentService,
  getFreeAppointmentUsageCount,
};
