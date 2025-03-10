const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');

// Admin sign-in page (no auth required)
router.get('/sign-in', (req, res) => {
  // If user is already authenticated, redirect based on their role
  if (req.session.data?.user) {
    if (req.session.data.user.isAdmin) {
      return res.redirect('/admin/registrations');
    } else if (req.session.data.user.isOrgOwner) {
      return res.redirect('/org/dashboard');
    } else {
      return res.redirect('/dashboard');
    }
  }

  res.render('admin/sign-in', {
    errors: null,
    errorList: null,
    data: {}
  });
});

// Handle admin sign-in (no auth required)
router.post('/sign-in', adminController.signIn);

// All other admin routes require admin access
router.use(requireAdmin);

// Admin registration management
router.get('/registrations', userController.getPendingRegistrations);

// Approve registration
router.post('/registrations/:id/approve', userController.approveRegistration);

// Reject registration
router.post('/registrations/:id/reject', userController.rejectRegistration);

module.exports = router; 