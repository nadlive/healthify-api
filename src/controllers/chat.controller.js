const chatService = require('../services/chat.service');

class ChatController {
  async getChatById(req, res) {
    const { id } = req.params;
    const chat = await chatService.getChatById(id);
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true, data: chat });
  }

  async searchChats(req, res) {
    const userId = req.user.userId;
    const { chatId, status } = req.query;
    const chats = await chatService.searchChats({
      chatId,
      userId,
      status,
    });
    res.json({
      success: true,
      data: chats,
    });
  }
}

module.exports = new ChatController();
