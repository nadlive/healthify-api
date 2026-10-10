const userService = require('../services/user.service');

class UserController {
  async getUserProfile(req, res) {
    const userId = req.user.userId;
    const userProfile = await userService.getUserProfile(userId);
    res.status(200).json(userProfile);
  }

  async saveFcmToken(req, res) {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 4096) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const saved = await userService.saveFcmToken(req.user.userId, token);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true });
  }
}

module.exports = new UserController();
