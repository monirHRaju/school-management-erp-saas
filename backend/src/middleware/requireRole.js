'use strict';

/**
 * Higher-order middleware — restricts access to specific user roles.
 * Usage: router.get('/path', authMiddleware, requireRole('admin', 'staff'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = requireRole;
