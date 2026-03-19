const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SUPER_ADMIN_SECRET || process.env.JWT_SECRET);
    const admin = await SuperAdmin.findById(decoded.superAdminId);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Super admin not found' });
    }
    req.superAdmin = admin;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    next(err);
  }
};

module.exports = superAdminAuth;
