const { getUserProfile } = require('../services/user.service');

class UserController {
  async getUserProfile(req, res) {
    const userId = req.user.userId;
    const userProfile = await getUserProfile(userId);
    res.status(200).json(userProfile);
  }
}

module.exports = new UserController();
