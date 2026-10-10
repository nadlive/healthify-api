const express = require('express');
const router = express.Router();
const controller = require('../controllers/inAppNotification.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);

module.exports = router;
