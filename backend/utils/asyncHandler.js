/**
 * Wraps an async express route handler to catch and pass errors to next()
 * @param {Function} fn - async express handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
