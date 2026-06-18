const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const authMiddleware = async (req, res, next) => {
  // Skip authentication for OPTIONS requests (CORS preflight)
  // CORS middleware handles OPTIONS, but route-level middleware runs first
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

      req.user = {
        // @ts-ignore
        userId: decoded.userId || decoded.id,
        // @ts-ignore
        email: decoded.email,
        // @ts-ignore
        role: decoded.role,
        // @ts-ignore
        name: decoded.name,
        // @ts-ignore
        subscription: decoded.subscription,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please login again',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal server error',
    });
  }
};

// @ts-ignore
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        req.user = {
          // @ts-ignore
          userId: decoded.userId || decoded.id,
          // @ts-ignore
          email: decoded.email,
          // @ts-ignore
          role: decoded.role,
          // @ts-ignore
          name: decoded.name,
          // @ts-ignore
          subscription: decoded.subscription,
        };
      } catch (jwtError) {
        console.log('Optional auth: Invalid token, continuing without auth');
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(
        'Forbidden',
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      );
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Not authorized to perform this action`,
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
};
