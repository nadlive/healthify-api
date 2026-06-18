const billingService = require('../services/billing.service');

class BillController {
  async getBills(req, res) {
    try {
      const userId = req.user.userId;
      const bills = await billingService.getBillingOverview(userId);
      res.status(200).json(bills);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Failed to fetch bills', error: error.message });
    }
  }

  async getBillDetails(req, res) {
    const { billId } = req.params;
    const userId = req.user.userId;

    try {
      const billDetails = await billingService.getBillDetails(userId, billId);
      res.status(200).json(billDetails);
    } catch (error) {
      console.error('Error fetching bill details:', error.message);
      res.status(404).json({ message: error.message });
    }
  }

  async pay(req, res) {
    const { amount } = req.body;
    const userId = req.user.userId;
    const appointmentId = req.body.appointmentId;

    const paymentResult = await billingService.pay(
      userId,
      amount,
      appointmentId,
    );
    res.status(200).json(paymentResult);
  }
}

module.exports = new BillController();
