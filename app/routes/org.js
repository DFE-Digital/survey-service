const express = require('express');
const router = express.Router();
const { requireAuth, requireOrgOwner } = require('../middleware/auth');
const db = require('../db');
const { sendSurveyInvite, sendUserInvite } = require('../lib/notifications');
const userController = require('../controllers/userController');
const surveyService = require('../services/surveyService');
const waveService = require('../services/waveService');
const Question = require('../models/question');

const departments = require('../data/organizations.json');

// First ensure authentication
router.use(requireAuth);
// Then ensure org owner access
router.use(requireOrgOwner);

// Dashboard routes
router.get('/dashboard', async (req, res) => {
  try {
    const department = departments.find(d => d.analytics_identifier === req.user.departmentCode);
    
    // Get all waves and active wave for the department
    const waves = await waveService.getAllWaves(req.user.departmentCode);
    const activeWave = await waveService.getActiveWave(req.user.departmentCode);
    
    console.log('All waves:', waves);
    console.log('Active wave:', activeWave);
    
    // Get selected wave (default to active wave if no wave_id provided)
    const selectedWaveId = req.query.wave_id || (activeWave ? activeWave.id : null);
    console.log('Selected wave ID:', selectedWaveId);
    
    const selectedWave = selectedWaveId ? 
      await waveService.getWaveById(selectedWaveId, req.user.departmentCode) : 
      activeWave;
    
    console.log('Selected wave:', selectedWave);
    
    // Get responses for selected wave
    const allResponses = await surveyService.getSurveyResponses(
      req.user.departmentCode,
      selectedWaveId
    );
    
    console.log('All responses:', allResponses);
    
    const totalCompleted = allResponses.filter(r => r.submitted_at).length;
    console.log('Total completed:', totalCompleted);

    // Calculate average score from completed surveys
    const completedResponses = allResponses.filter(r => r.submitted_at && r.overall_score);
    const averageScore = completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + parseFloat(r.overall_score), 0) / completedResponses.length
      : null;

    console.log('Average score:', averageScore);

    // Get latest 5 submissions for selected wave
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

    console.log('Latest submissions:', latestSubmissions);

    // Get comparison with previous wave if available
    let comparison = null;
    if (selectedWave && waves.length > 1) {
      const previousWave = waves.find(w => 
        new Date(w.end_date) < new Date(selectedWave.start_date)
      );
      
      console.log('Previous wave:', previousWave);
      
      if (previousWave) {
        comparison = await waveService.compareWaves(
          previousWave.id,
          selectedWave.id,
          req.user.departmentCode
        );
        console.log('Wave comparison:', comparison);
      }
    }

    res.render('org/dashboard', {
      currentPage: 'dashboard',
      totalCompleted,
      averageScore,
      latestSubmissions,
      department: department.title,
      waves,
      selectedWave,
      activeWave,
      comparison,
      isOrgOwner: req.user.isOrgOwner
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.render('error', {
      message: 'Error loading dashboard'
    });
  }
});

// Wave management routes
router.get('/waves', async (req, res) => {
  try {
    const waves = await waveService.getAllWaves(req.user.departmentCode);
    const activeWave = await waveService.getActiveWave(req.user.departmentCode);

    res.render('waves/index', {
      currentPage: 'waves',
      waves,
      activeWave,
      errors: {},
      isOrgOwner: req.user.isOrgOwner
    });
  } catch (error) {
    console.error('Error fetching waves:', error);
    res.render('error', {
      message: 'Error loading waves'
    });
  }
});

router.get('/waves/new', (req, res) => {
  res.render('waves/new', {
    currentPage: 'waves',
    errors: {},
    isOrgOwner: req.user.isOrgOwner
  });
});

router.post('/waves', async (req, res) => {
  const { name, start_date, end_date } = req.body;
  const errors = {};

  if (!name) {
    errors.name = 'Enter a name for the wave';
  }
  if (!start_date) {
    errors.start_date = 'Enter a start date';
  }
  if (!end_date) {
    errors.end_date = 'Enter an end date';
  }
  if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
    errors.end_date = 'End date must be after start date';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('waves/new', {
      currentPage: 'waves',
      errors,
      values: req.body
    });
  }

  try {
    await waveService.createWave(req.user.departmentCode, name, start_date, end_date);
    res.redirect('/org/waves');
  } catch (error) {
    console.error('Error creating wave:', error);
    if (error.message === 'Department already has an active wave') {
      errors.general = 'Your department already has an active wave. Please close it before creating a new one.';
    } else {
      errors.general = 'Error creating wave. Please try again.';
    }
    res.render('waves/new', {
      currentPage: 'waves',
      errors,
      values: req.body
    });
  }
});

router.post('/waves/:id/close', async (req, res) => {
  try {
    await waveService.closeWave(req.params.id, req.user.departmentCode);
    res.redirect('/org/waves');
  } catch (error) {
    console.error('Error closing wave:', error);
    res.redirect('/org/waves');
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
      ratingScale,
      isOrgOwner: req.user.isOrgOwner
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