const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getUser } = require('../models/user');

// In a real application, this would be in a secure database
// and the password would be properly hashed
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Hash the password for comparison
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

// Check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.data?.user) {
    return res.redirect('/admin/sign-in');
  }
  req.user = req.session.data.user;
  next();
}

// Check if user is a super admin (can approve department admins)
function requireAdmin(req, res, next) {
  if (!req.session.data?.user) {
    return res.redirect('/admin/sign-in');
  }
  
  if (!req.session.data.user.isAdmin) {
    return res.render('error', {
      title: 'Access denied',
      text: 'Only the super administrator can access this page.'
    });
  }
  
  next();
}

// Check if user is a department admin (organization owner)
function requireOrgOwner(req, res, next) {
  if (!req.session.data?.user) {
    return res.redirect('/admin/sign-in');
  }
  
  if (!req.session.data.user.isOrgOwner) {
    return res.render('error', {
      title: 'Access denied',
      text: 'Only department administrators can access this page.'
    });
  }
  
  next();
}

// Generate a magic link token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/sign-in');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUser(decoded.id);
    
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/sign-in');
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/sign-in');
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireOrgOwner,
  generateToken,
  authenticateToken
}; 