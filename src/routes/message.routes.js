const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessage,
  updateMessageStatus,
  deleteMessage,
  searchMessages,
} = require('../controllers/message.controller');

// POST api/messages
// Send a new message
// Tested and working
router.post('/', sendMessage);

// GET api/messages/:id
// Get a message
// Tested and working
router.get('/:id', getMessage);

// PUT api/messages/:id/status
// Update message status
// Tested and working
router.put('/:id/status', updateMessageStatus);

// DELETE api/messages/:id
// Delete a message
// Tested and working
router.delete('/:id', deleteMessage);

// GET api/messages/search/:conversationId
// Search messages in a conversation
// Tested and working
router.get('/search/:conversationId', searchMessages);

module.exports = router;
