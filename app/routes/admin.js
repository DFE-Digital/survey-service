const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { 
  getPendingRegistrations,
  getRegistrationHistory,
  approveRegistration,
  rejectRegistration
} = require('../models/user');
const adminController = require('../controllers/adminController');
const db = require('../db');
const notify = require('../services/notify');

// Admin sign-in page (no auth required)
router.get('/sign-in', (req, res) => {
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
router.get('/registrations', async (req, res) => {
  try {
    const [pending, history] = await Promise.all([
      getPendingRegistrations(),
      getRegistrationHistory()
    ]);

    // Format registrations for display
    const formattedPending = pending.map(reg => ({
      name: `${reg.first_name} ${reg.last_name}`,
      email: reg.email,
      department: reg.department_code,
      justification: reg.reason,
      submitted: reg.created_at,
      id: reg.id
    }));

    const formattedHistory = history.map(reg => ({
      name: `${reg.first_name} ${reg.last_name}`,
      email: reg.email,
      department: reg.department_code,
      status: reg.status,
      updated: reg.updated_at,
      reason: reg.rejection_reason
    }));

    res.render('admin/registrations', {
      pending: formattedPending,
      history: formattedHistory,
      pendingCount: pending.length
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
});

// Approve registration
router.post('/registrations/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    await approveRegistration(id);
    res.redirect('/admin/registrations');
  } catch (error) {
    console.error('Error approving registration:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
});

// Reject registration
router.post('/registrations/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  try {
    await rejectRegistration(id, rejection_reason);
    res.redirect('/admin/registrations');
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
});

module.exports = router; 