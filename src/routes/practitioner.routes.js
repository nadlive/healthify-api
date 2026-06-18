const express = require('express');
const router = express.Router();
const practitionerController = require('../controllers/practitioner.controller');

const {} = require('../controllers/appointment.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.post('/', practitionerController.createPractitioner);
router.get('/active', practitionerController.getActivePractitioners);
router.get('/', practitionerController.searchPractitioners);
router.get('/:id', practitionerController.getPractitioner);
router.put('/:id', practitionerController.updatePractitioner);
router.delete('/:id', practitionerController.deletePractitioner);
router.post('/:id/working-hours', practitionerController.upsertWorkingHours);
router.get(
  '/:id/working-hours',
  practitionerController.getProviderWorkingHours,
);
module.exports = router;
