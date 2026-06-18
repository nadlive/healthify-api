const paymentService = require('../services/payment.service');

class PaymentsController {
  async getAllPaymentRefunds(req, res) {
    try {
      const refunds = await paymentService.getAllPaymentRefunds();
      res.status(200).json(refunds);
    } catch (error) {
      res
        .status(500)
        .json({
          message: 'Failed to fetch payment refunds',
          error: error.message,
        });
    }
  }


  async getRefundDetails(req,res){
    try {
      const { refundId } = req.params;
      const details = await paymentService.getDetailsInRefund(refundId);
      res.status(200).json(details);
    } catch (error)  {
      res
        .status(500)
        .json({
          message: 'Failed to fetch details of refund',
          error: error.message,
        });
    }
  }

  async updatePaymentRefundStatus(req, res) {
    try {
      const { refundId } = req.params;
      const { status, note } = req.body;
      const updatedRefund = await paymentService.updatePaymentRefundStatus(
        refundId,
        status,
        note
      );
      res.status(200).json(updatedRefund);
    } catch (error) {
      if (error.message === 'Invalid status value') {
        return res.status(400).json({ message: error.message });
      } else if (error.message === 'Refund not found') {
        return res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({
          message: 'Failed to update payment refund status',
          error: error.message,
        });
      }
    }
  }
}

module.exports = new PaymentsController();