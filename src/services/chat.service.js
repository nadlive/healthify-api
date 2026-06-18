const { Chat, Practitioner } = require('../models');

class ChatService {
  async getChatById(id) {
    const chat = await Chat.findOne({
      where: { id },
      include: [
        {
          model: Practitioner,
          as: 'practitioner',
          attributes: ['practitioner_id', 'prefix', 'firstName', 'lastName'],
        },
      ],
    });
    return chat;
  }
  async searchChats({ chatId, userId, status }) {
    const where = {};
    if (userId != null) where.userId = userId;
    if (status != null) where.status = status;
    if (chatId != null) where.chatId = chatId;
    const chats = await Chat.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        {
          model: Practitioner,
          as: 'practitioner',
        },
      ],
    });
    return chats;
  }
}

module.exports = new ChatService();
