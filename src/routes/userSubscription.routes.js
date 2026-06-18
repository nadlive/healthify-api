const express = require('express');
const router = express.Router();
const userSubscriptionController = require('../controllers/userSubscription.controller');
const lifecycleController = require('../controllers/subscriptionLifecycle.controller');
const notificationService = require('../services/notification.service');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

function validateInternalToken(req, res, next) {
  const token = req.headers['x-healthify-internal-token'];
  if (!token || !notificationService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing internal token',
    });
  }
  next();
}

router.post('/subscribe', userSubscriptionController.subscribe);

router.get('/user', userSubscriptionController.getUserSubscription);

router.post(
  '/notifications/expiring',
  validateInternalToken,
  lifecycleController.notifyExpiringSubscriptions,
);

router.post(
  '/patient/:patientId/renew-manual',
  lifecycleController.renewSubscriptionManual,
);

module.exports = router;
