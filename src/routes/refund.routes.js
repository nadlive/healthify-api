const express = require('express');
const router = express.Router();

const paymentsController = require('../controllers/payments.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
router.use(authMiddleware);
router.get('/', paymentsController.getAllPaymentRefunds);
router.put('/:refundId/status', paymentsController.updatePaymentRefundStatus);
router.get('/:refundId/details', paymentsController.getRefundDetails);


module.exports = router;
