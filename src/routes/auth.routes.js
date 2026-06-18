const express = require('express');
const router = express.Router();
const {
  changePassword,
  getIceServersHandler,
} = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/change-password', authMiddleware, changePassword);

router.get('/ice-handlers', authMiddleware, getIceServersHandler);

module.exports = router;
