const express = require('express');
const router = express.Router();
const passport = require('passport');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');
const {
  exchangeOAuthCode,
  requestNewAccessToken,
  verifyEmailOtp,
} = require('../controllers/auth.controller');

const {
  registerUser,
  loginUser,
  requestLoginCode,
  verifyLoginCode,
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} = require('../controllers/auth.controller');

router.use(authRateLimiter);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.json({ message: 'Logged in with Google!', user: req.user });
  },
);

router.post('/login', loginUser);
router.post('/request-login-code', requestLoginCode);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/verify-login-code', verifyLoginCode);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/verify-password-reset-code', verifyPasswordResetCode);
router.post('/oauth/exchange', exchangeOAuthCode);
router.post('/refresh', requestNewAccessToken);
router.post('/register', registerUser);

module.exports = router;
