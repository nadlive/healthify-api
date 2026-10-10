const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', chatController.searchChats);
router.post('/:id/request', chatController.requestChat);
router.post('/:id/ready', chatController.readyForChat);
router.get('/:id', chatController.getChatById);

module.exports = router;
