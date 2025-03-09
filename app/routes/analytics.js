const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const AnalyticsController = require('../controllers/analytics');

// Login page
router.get('/login', AnalyticsController.showLoginPage);

// Handle login
router.post('/login', AnalyticsController.handleLogin);

// Dashboard
router.get('/dashboard', requireAuth, AnalyticsController.showDashboard);

// Logout
router.get('/logout', AnalyticsController.handleLogout);

// Route to show the list of departments
router.get('/departments', AnalyticsController.showDepartments);

// Route to show the dashboard for a specific department
router.get('/dashboard/:departmentCode', AnalyticsController.showDepartmentDashboard);

module.exports = router; 