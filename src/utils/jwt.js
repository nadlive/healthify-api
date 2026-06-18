const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate access token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '1h',
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '2d',
  });
};

// Validate refresh token
const validateRefreshToken = (
  token,
  secret = process.env.JWT_REFRESH_SECRET_KEY,
) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Refresh access token
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = validateRefreshToken(refreshToken);

    const { iat, exp, ...payload } = decoded;

    const newAccessToken = generateAccessToken(payload);
    return newAccessToken;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
};
