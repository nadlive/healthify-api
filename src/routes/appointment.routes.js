const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/appointment.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/timeslots', searchTimeSlots);
router.post('/timeslots', createTimeSlot);
router.delete('/timeslots/:timeSlotId', deleteTimeSlot);
router.get('/patient/:patientId', getAppointmentsForPatient);
router.get('/practitioner/:practitionerId', getAppointmentsForPractitioner);
router.get('/provider/:providerId', getAppointmentsForProvider);
router.get('/:practitionerId/timeslots', getAvailableTimeSlots);
router.get('/:practitionerId/availability', checkProviderAvailability);
router.get('/subscription/limits', getLimitsAndConsumedOfSubscription);
router.get('/', getAllAppointments);
router.get('/:appointmentId', getAppointmentById);
router.post('/', createAppointment);
router.post('/chat', createChatAppointment);
router.put('/:appointmentId/cancel', cancelAppointment);
router.put('/:appointmentId/decline', declineAppointment);
router.put('/:appointmentId/confirm', confirmAppointment);
router.put('/chat/:appointmentId/accept', acceptChatAppointment);
router.put('/chat/:appointmentId/reject', rejectChatAppointment);
router.put('/chat/:appointmentId/complete', completeChatAppointment);
router.put('/:appointmentId', updateAppointment);
router.patch('/:appointmentId/status', updateAppointmentStatus);

module.exports = router;
