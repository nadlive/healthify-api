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

  async requestChat(req, res) {
    const result = await chatService.requestChat(req.params.id, req.user.userId);
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }
    if (result.error === 'closed') {
      return res.status(400).json({ success: false, error: 'Chat is closed' });
    }
    res.json({ success: true, firstName: result.firstName || '' });
  }

  async readyForChat(req, res) {
    const result = await chatService.readyForChat(req.params.id, req.user.userId);
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }
    if (result.error === 'closed') {
      return res.status(400).json({ success: false, error: 'Chat is closed' });
    }
    res.json({ success: true, firstName: result.firstName || '' });
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
