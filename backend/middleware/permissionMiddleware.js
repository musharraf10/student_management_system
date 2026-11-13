/**
 * Middleware to check coach permission
 * Super admin automatically bypasses permission checks
 * @param {string} permissionName - 'addStudents' | 'editStudents' | 'editAttendance' | 'exportReports'
 */
const checkPermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authenticated');
    }

    // Super Admin has full system access
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Success Coach permission check
    const permissions = req.user.permissions || {};
    if (!permissions[permissionName]) {
      res.status(403);
      throw new Error(
        `Action denied: You do not have the '${permissionName}' permission`
      );
    }

    next();
  };
};

module.exports = {
  checkPermission,
};
