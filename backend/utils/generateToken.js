const jwt = require('jsonwebtoken');

/**
 * Generate signed JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} Signed JWT
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
