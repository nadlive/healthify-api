const {
  createAppointmentService,
  getAppointmentsForPractitionerService,
  getAllAppointmentsService,
  cancelAppointmentService,
  updateAppointmentService,
  updateAppointmentStatusService,
  confirmAppointmentService,
  getAppointmentsInPatientTimezone,
  getAppointmentByPatientTimeZone,
  acceptChatAppointmentService,
  rejectChatAppointmentService,
  completeChatAppointmentService,
  createChatAppointmentService,
  declineAppointmentService,
} = require('../services/appointment.service');

const {
  createTimeSlotService,
  getAvailableTimeSlotsService,
  checkProviderAvailabilityService,
  deleteTimeSlotService,
  searchTimeSlotsService,
} = require('../services/timeSlot.service');
const {
  getActiveSubscriptionUsage,
} = require('../services/subscriptionUsage.service');

const getAllAppointments = async (_, res) => {
  const appointments = await getAllAppointmentsService();
  res.status(200).json(appointments);
};

const getAppointmentById = async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await getAppointmentByPatientTimeZone(appointmentId);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.status(200).json(appointment);
};

const createAppointment = async (req, res) => {
  const appointmentData = req.body;

  if (!appointmentData.provider_id) {
    return res.status(400).json({ error: 'Missing required appointment data' });
  }
  appointmentData.userId = req.user.userId;
  const appointment = await createAppointmentService(appointmentData);
  res.status(201).json(appointment);
};

const getLimitsAndConsumedOfSubscription = async (req, res) => {
  const userId = req.user.userId;

  const usage = await getActiveSubscriptionUsage(userId);
  res.status(200).json(usage);
};

// TODO: check the user that is making the request has access to the patientId
const getAppointmentsForPatient = async (req, res) => {
  const { patientId } = req.params;

  const appointments = await getAppointmentsInPatientTimezone(patientId);
  res.status(200).json(appointments);
};

const getAppointmentsForProvider = async (req, res) => {
  const providerId = req.params.providerId;
  const appointments = await getAppointmentsForPractitionerService(providerId);
  res.status(200).json(appointments);
};

const cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.user.userId;

  const cancelledAppointment = await cancelAppointmentService(
    appointmentId,
    userId,
  );
  res.status(200).json(cancelledAppointment);
};

const declineAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.user.userId;

  const declinedAppointment = await declineAppointmentService(
    appointmentId,
    userId,
  );
  res.status(200).json(declinedAppointment);
};

const confirmAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.user.userId;
  const confirmedAppointment = await confirmAppointmentService(
    appointmentId,
    userId,
  );
  res.status(200).json(confirmedAppointment);
};

const acceptChatAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const appointment = await acceptChatAppointmentService(appointmentId);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.status(200).json({ success: true, data: appointment });
};

const rejectChatAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const appointment = await rejectChatAppointmentService(appointmentId);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.status(200).json({ success: true, data: appointment });
};

const completeChatAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const appointment = await completeChatAppointmentService(appointmentId);
  res.status(200).json({ success: true, data: appointment });
};

const createChatAppointment = async (req, res) => {
  const userId = req.user.userId;
  const { practitionerId, description } = req.body;
  const chat = await createChatAppointmentService(
    userId,
    practitionerId,
    description,
  );
  res.status(201).json({ success: true, data: chat });
};

const updateAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const updatedAppointmentData = req.body;
  const updatedAppointment = await updateAppointmentService(
    appointmentId,
    updatedAppointmentData,
  );
  res.status(200).json(updatedAppointment);
};

const updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;
  const updatedAppointment = await updateAppointmentStatusService(
    appointmentId,
    status,
  );
  res.status(200).json(updatedAppointment);
};

const getAppointmentsForPractitioner = async (req, res) => {
  const practitionerId = req.params.practitionerId;
  const appointments =
    await getAppointmentsForPractitionerService(practitionerId);
  res.status(200).json(appointments);
};

const createTimeSlot = async (req, res) => {
  const timeSlotData = req.body;
  const timeSlot = await createTimeSlotService({
    ...timeSlotData,
    userId: req.user.userId,
  });
  res.status(201).json(timeSlot);
};

//TODO rbac implementation for deleting time slots
const deleteTimeSlot = async (req, res) => {
  const { timeSlotId } = req.params;
  const timeSlot = await deleteTimeSlotService(timeSlotId);
  res.status(200).json(timeSlot);
};

const searchTimeSlots = async (req, res) => {
  const { fromDate, toDate } = req.query;
  const userId = req.user.userId;
  const timeSlots = await searchTimeSlotsService(fromDate, toDate, userId);
  res.status(200).json(timeSlots);
};

const getAvailableTimeSlots = async (req, res) => {
  const { practitionerId } = req.params;
  const { date, appointmentTypeId } = req.query;
  const userId = req.user.userId;
  if (!practitionerId) {
    return res.status(400).json({ error: 'Practitioner ID is required' });
  }
  if (!appointmentTypeId || !date) {
    return res
      .status(400)
      .json({ message: 'appointmentType and date are required' });
  }

  const timeSlots = await getAvailableTimeSlotsService(
    practitionerId,
    userId,
    date,
    appointmentTypeId,
  );
  res.status(200).json(timeSlots);
};

const checkProviderAvailability = async (req, res) => {
  const { practitionerId } = req.params;
  const { startTime, endTime } = req.query;

  if (!startTime || !endTime) {
    return res
      .status(400)
      .json({ message: 'startTime and endTime are required' });
  }

  const conflicts = await checkProviderAvailabilityService(
    practitionerId,
    new Date(startTime),
    new Date(endTime),
  );

  res.json({
    isAvailable: conflicts.length === 0,
    conflicts: conflicts,
  });
};

module.exports = {
  createAppointment,
  getAppointmentsForPatient,
  getAppointmentsForProvider,
  getAllAppointments,
  cancelAppointment,
  updateAppointment,
  updateAppointmentStatus,
  getAppointmentsForPractitioner,
  confirmAppointment,
  acceptChatAppointment,
  rejectChatAppointment,
  createTimeSlot,
  getAvailableTimeSlots,
  checkProviderAvailability,
  getAppointmentById,
  deleteTimeSlot,
  searchTimeSlots,
  getLimitsAndConsumedOfSubscription,
  completeChatAppointment,
  createChatAppointment,
  declineAppointment,
};
