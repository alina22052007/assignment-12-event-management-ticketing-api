/**
 * Middleware factory to enforce Role-Based Access Control (RBAC)
 * @param  {...string} roles Allowed user roles (e.g., 'organizer', 'attendee')
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User authentication required.'
      });
    }

    const userRole = req.user.role.toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role(s): [${roles.join(', ')}]. Your role: '${req.user.role}'`
      });
    }

    next();
  };
};

module.exports = checkRole;
