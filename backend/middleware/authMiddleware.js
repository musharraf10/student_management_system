const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('User not found or account removed');
    }

    if (user.status === 'inactive') {
      res.status(403);
      throw new Error('Account has been deactivated. Please contact administrator');
    }

    req.user = user;
    next();
  } catch (error) {
    if (res.statusCode !== 403) {
      res.status(401);
    }
    throw error;
  }
});

module.exports = {
  protect,
};
