const rateLimit = require('express-rate-limit');

// @ts-ignore
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
  validate: {
    trustProxy: false,
  },
});

// @ts-ignore
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 1 request per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again in a minute.',
  },
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
};
