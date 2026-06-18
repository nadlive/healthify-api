const { createPrescriptionHandler } = require('../controllers/prescription.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();

router.use(authMiddleware);
//post for writing prescriptions
router.post('/write-prescriptions', createPrescriptionHandler);


module.exports = router;