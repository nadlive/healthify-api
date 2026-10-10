const InAppNotification = require('../models/inAppNotification.model');

class InAppNotificationService {
  async create({ userId, chatId, title, body, personName }) {
    if (!userId) return null;
    return InAppNotification.create({
      userId,
      chatId: chatId || null,
      title,
      body,
      personName: personName || null,
      isRead: false,
    });
  }

  async listForUser(userId, limit = 50) {
    return InAppNotification.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  async markRead(id, userId) {
    const [updated] = await InAppNotification.update(
      { isRead: true },
      { where: { id, userId } },
    );
    return updated > 0;
  }
}

module.exports = new InAppNotificationService();
