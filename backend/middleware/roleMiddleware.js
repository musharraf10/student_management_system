/**
 * Restrict route access to specific roles
 * @param  {...string} roles - Allowed roles (e.g., 'super_admin', 'coach')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role (${req.user ? req.user.role : 'unauthenticated'}) is not authorized to access this resource`
      );
    }
    next();
  };
};

/**
 * Convenience middleware for Zonal Manager (Super Admin) access only
 */
const superAdminOnly = authorize('super_admin');

module.exports = {
  authorize,
  superAdminOnly,
};
