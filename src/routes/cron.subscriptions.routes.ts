const express = require('express');
const router = express.Router();
import { renewSubscriptionsScheduleController } from '@/controllers/renewSubscriptions.controller';
const { apiKeyMiddleware } = require('../../src/middleware/api.middleware');

router.post(
  '/renew-subscriptions',
  apiKeyMiddleware,
  renewSubscriptionsScheduleController,
);

export = router;
