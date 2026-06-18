const apiKeyMiddleware = (req, res, next) => {
  const expected = process.env.HEALTHIFY_API_KEY;
  const key = req.headers['x-api-key'];
  if (!expected?.trim() || key !== expected) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

module.exports = {
  apiKeyMiddleware,
};
