const express = require('express');
const router = express.Router();
const SurveyController = require('../controllers/survey');

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

module.exports = router; 