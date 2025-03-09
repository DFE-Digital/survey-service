const express = require('express');
const router = express.Router();
const SurveyController = require('../controllers/survey');
const db = require('../db');
const surveyService = require('../services/surveyService');
const departments = require('../data/organizations.json');

// Start page
router.get('/start', SurveyController.showStartPage);
router.post('/start', SurveyController.startSurvey);

// Questions
router.get('/questions', SurveyController.showQuestions);
router.post('/questions', SurveyController.handleAnswers);

// Check answers
router.get('/check-answers', SurveyController.showCheckAnswers);

// Role info
router.get('/role-info', SurveyController.showRoleInfo);
router.post('/role-info', SurveyController.handleRoleInfo);

// Complete
router.get('/complete', SurveyController.showComplete);

// Initial survey page - check for active wave
router.get('/survey-start', async (req, res) => {
  const { department_code } = req.query;

  if (!department_code) {
    return res.redirect('/');
  }

  try {
    // Look up department name
    const department = departments.find(d => d.analytics_identifier === department_code);
    
    // Check if there's an active wave for the specific department
    const activeWave = await surveyService.getActiveWave(department_code);

    if (!activeWave) {
      return res.render('survey/no-active-wave', {
        department_code,
        department_name: department ? department.title : null
      });
    }

    res.render('survey/sign-in', {
      department_code,
      department_name: department ? department.title : null
    });
  } catch (error) {
    console.error('Error checking for active waves:', error);
    res.render('error', {
      message: 'Error loading survey'
    });
  }
});

// Survey sign-in form submission
router.post('/sign-in', async (req, res) => {
  const { department_code, organization_name } = req.body;
  const errors = {};

  if (!department_code) {
    errors.department_code = 'Select your department';
  }
  if (!organization_name) {
    errors.organization_name = 'Enter your organization name';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('survey/sign-in', {
      errors,
      values: req.body
    });
  }

  try {
    // Check if there's an active wave for the department
    const activeWave = await surveyService.getActiveWave(department_code);

    if (!activeWave) {
      errors.department_code = 'This department is not currently accepting survey responses. Please try again later.';
      return res.render('survey/sign-in', {
        errors,
        values: req.body
      });
    }

    // Store survey session data
    req.session.survey = {
      department_code,
      organization_name,
      started_at: new Date(),
      wave_id: activeWave.id
    };

    res.redirect('/survey/start');
  } catch (error) {
    console.error('Error signing in to survey:', error);
    res.render('error', {
      message: 'Error signing in to survey'
    });
  }
});

module.exports = router; 