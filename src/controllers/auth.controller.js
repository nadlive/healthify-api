const {
  registerUserService,
  loginUserService,
  requestPasswordResetService,
  resetPasswordService,
  verifyPasswordResetCodeService,
  changePasswordService,
  requestLoginCodeService,
  verifyLoginCodeService,
  upsertOAuthUser,
  createJwtForUser,
  assignGuestSubscriptionAfterSignUp,
  getIceServers,
  verifyEmailOtpService,
} = require('../services/auth.service');
const axios = require('axios');
const jwt = require('../utils/jwt');
const { PATIENT_ROLE } = require('../constants/auth');
const { OAuth2Client } = require('google-auth-library');

const registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const result = await registerUserService({
      username,
      email,
      password,
      role,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUserService({ email, password });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const result = await verifyEmailOtpService(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await requestPasswordResetService({ email });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await verifyPasswordResetCodeService({ email, code });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;
    const result = await resetPasswordService({
      email,
      code,
      newPassword,
      confirmPassword,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    // Get user ID from authenticated request (set by authMiddleware)
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error:
          'Current password, new password, and confirm password are required',
      });
    }

    const result = await changePasswordService({
      userId,
      currentPassword,
      newPassword,
      confirmPassword,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Request Login Code
const requestLoginCode = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await requestLoginCodeService({ email });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Verify Login Code and login
const verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await verifyLoginCodeService({ email, code });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const exchangeOAuthCode = async (req, res) => {
  // try {
  const { code, redirect_uri: redirectUri, idToken, type } = req.body;

  let user;

  const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

  if (type === 'native' && idToken) {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      throw new Error('Google email not verified');
    }

    user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
      email_verified: payload.email_verified,
    };
  }
  // === Web OAuth Flow ===
  else if (code && redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    // @ts-ignore
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      params,
    );
    const tokenData = tokenResponse.data;

    // @ts-ignore
    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    user = userResponse.data;
  } else {
    throw new Error(
      'Missing required parameters: either (code + redirect_uri) or (idToken + type=native)',
    );
  }

  const appUser = await upsertOAuthUser('google', user, 'patient');

  if (appUser.role === PATIENT_ROLE) {
    await assignGuestSubscriptionAfterSignUp(appUser.id);
  }
  const { accessToken, refreshToken } = createJwtForUser(appUser);

  res.status(200).json({
    accessToken,
    refreshToken,
    user: { ...appUser, name: user.name },
  });
  // } catch (error) {
  //   res.status(400).json({ error: error.message });
  // }
};

const requestNewAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const newAccessToken = jwt.refreshAccessToken(refreshToken);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({
      error: error.message || 'Invalid or expired refresh token',
    });
  }
};

const getIceServersHandler = async (req, res) => {
  try {
    const userId = req.user.id ?? req.user.userId;
    const data = getIceServers(userId);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  changePassword,
  requestLoginCode,
  verifyLoginCode,
  exchangeOAuthCode,
  requestNewAccessToken,
  getIceServersHandler,
  verifyEmailOtp,
};
