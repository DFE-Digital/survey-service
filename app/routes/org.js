const express = require('express');
const router = express.Router();
const { requireAuth, requireOrgOwner } = require('../middleware/auth');
const db = require('../db');
const { sendSurveyInvite, sendUserInvite } = require('../lib/notifications');
const userController = require('../controllers/userController');
const surveyService = require('../services/surveyService');
const Question = require('../models/question');

const departments = require('../data/organizations.json');

// First ensure authentication
router.use(requireAuth);
// Then ensure org owner access
router.use(requireOrgOwner);

// Dashboard routes
router.get('/dashboard', async (req, res) => {
  try {
    // Get total completed surveys
    const allResponses = await surveyService.getSurveyResponses(req.user.departmentCode);
    const totalCompleted = allResponses.filter(r => r.submitted_at).length;
    const department = departments.find(d => d.analytics_identifier === req.user.departmentCode);

    // Calculate average score from completed surveys
    const completedResponses = allResponses.filter(r => r.submitted_at && r.overall_score);
    console.log('All responses:', allResponses.length);
    console.log('Completed responses with scores:', completedResponses.length);
    console.log('Sample response:', allResponses[0]);
    
    const averageScore = completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + parseFloat(r.overall_score), 0) / completedResponses.length
      : null;

    // Get latest 5 submissions
    const latestSubmissions = allResponses
      .filter(r => r.submitted_at)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        department,
        organization_name: r.organization_name,
        created_at: r.submitted_at,
        overall_score: r.overall_score
      }));

    res.render('org/dashboard', {
      currentPage: 'dashboard',
      totalCompleted,
      averageScore,
      latestSubmissions,
      department: department.title,
      errors: {}
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.render('error', {
      message: 'Error loading dashboard'
    });
  }
});

// Survey response routes
router.get('/responses/:id', async (req, res) => {
  try {
    const response = await surveyService.getSurveyResponseById(req.params.id);
    
    if (!response || response.department_code !== req.user.departmentCode) {
      return res.render('error', {
        message: 'Survey response not found'
      });
    }

    const department = departments.find(d => d.analytics_identifier === response.department_code);
    const questions = Question.getAllQuestions();
    const ratingScale = Question.getRatingScale();

    res.render('org/response-detail', {
      currentPage: 'dashboard',
      response: {
        ...response,
        department
      },
      questions,
      ratingScale
    });
  } catch (error) {
    console.error('Error fetching survey response:', error);
    res.render('error', {
      message: 'Error loading survey response'
    });
  }
});

// Survey invitation routes
router.post('/surveys/send', async (req, res) => {
  const { emails } = req.body;
  const errors = {};

  if (!emails) {
    errors.emails = 'Enter at least one email address';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('org/dashboard', {
      currentPage: 'dashboard',
      errors,
      totalCompleted: 0,
      averageScore: null,
      latestSubmissions: []
    });
  }

  try {
    const emailList = emails.split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    // Create survey invites and send emails
    for (const email of emailList) {
      const [invite] = await db('survey_invites')
        .insert({
          department_code: req.user.departmentCode,
          recipient_email: email,
          created_by: req.user.email,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');

      await sendSurveyInvite(email, invite.id);
    }

    req.flash('success', 'Survey invites sent successfully');
    res.redirect('/org/dashboard');
  } catch (error) {
    console.error('Error sending survey invites:', error);
    errors.emails = 'Error sending survey invites. Please try again.';
    res.render('org/dashboard', {
      currentPage: 'dashboard',
      errors,
      totalCompleted: 0,
      averageScore: null,
      latestSubmissions: []
    });
  }
});

// Analysis routes
router.get('/analysis', userController.getAnalysis);

// User management routes
router.get('/users', userController.getUsers);
router.post('/users/invite', userController.inviteUser);
router.post('/users/:id/approve', userController.approveUser);
router.post('/users/:id/delete', userController.removeUser);

module.exports = router; 