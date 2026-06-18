const express = require('express');
const router = express.Router();
const patientController = require('../controllers/ehrPatient.controller');
const { ADMIN_ROLES } = require('../constants/auth');
const {
  authMiddleware,
  requireRole,
} = require('../middleware/auth.middleware');
router.use(authMiddleware);

router.post('/', patientController.createPatient);

router.get('/:id', patientController.getPatient);

router.put('/:id', patientController.updatePatient);

router.get('/', requireRole(ADMIN_ROLES), patientController.searchPatients);

router.get('/', requireRole(ADMIN_ROLES), patientController.searchPatients);

router.post(
  '/:id/make-inactive',
  requireRole(ADMIN_ROLES),
  patientController.makeInactive,
);

router.post(
  '/:id/make-active',
  requireRole(ADMIN_ROLES),
  patientController.makeActive,
);

router.post(
  '/:id/make-overdue',
  requireRole(ADMIN_ROLES),
  patientController.makeOverdue,
);

router.post(
  '/:id/clear-overdue',
  requireRole(ADMIN_ROLES),
  patientController.clearOverdue,
);

module.exports = router;
