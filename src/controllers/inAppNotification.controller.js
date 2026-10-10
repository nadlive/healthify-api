const inAppNotificationService = require('../services/inAppNotification.service');

class InAppNotificationController {
  async list(req, res) {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await inAppNotificationService.listForUser(
      req.user.userId,
      limit,
    );
    res.json({ success: true, data: rows });
  }

  async markRead(req, res) {
    const updated = await inAppNotificationService.markRead(
      req.params.id,
      req.user.userId,
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true });
  }
}

module.exports = new InAppNotificationController();
