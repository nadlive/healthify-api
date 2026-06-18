const express = require('express');
const router = express.Router();
const specialitiesController = require('../controllers/specialities.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', specialitiesController.getAllSpecialities);

module.exports = router;
