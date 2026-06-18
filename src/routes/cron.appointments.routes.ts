const express = require('express');
const router = express.Router();
import { cancelNotConfirmedAppointments } from '@/controllers/appointment.scheduler.controller';
const { apiKeyMiddleware } = require('../../src/middleware/api.middleware');

router.post(
  '/cancel-not-confirmed-appointments',
  apiKeyMiddleware,
  cancelNotConfirmedAppointments,
);

export = router;
