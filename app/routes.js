const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const express = require('express');
const path = require('path');
const db = require('./db');
const roles = require('./data/roles');
const organizations = require('./data/organizations.json');
const surveyService = require('./services/surveyService');

// Cookie banner route
router.post('/cookie-banner', (req, res) => {
  const { cookies, hide } = req.body;
  
  if (!req.session.data) {
    req.session.data = {};
  }

  // Check for browser cookie first
  const browserCookiePolicy = req.cookies.cookies_policy;
  if (browserCookiePolicy) {
    req.session.data.cookies_policy = {
      essential: true,
      analytics: browserCookiePolicy === 'accepted'
    };
    req.session.data.show_confirmation = false;
  } else if (hide === 'hide') {
    req.session.data.show_confirmation = false;
  } else {
    // Set cookie preferences
    req.session.data.cookies_policy = {
      essential: true,
      analytics: cookies === 'accept'
    };
    req.session.data.show_confirmation = true;
  }

  // Redirect back to the referring page
  res.redirect(req.get('Referrer') || '/');
});

// Import route modules
const surveyRoutes = require('./routes/survey');
const analyticsRoutes = require('./routes/analytics');
const signUpRoutes = require('./routes/sign-up');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/org');

// Import models
const Organization = require('./models/organization');
const Question = require('./models/question');

// Register routes
router.use('/sign-up', signUpRoutes);
router.use('/admin', adminRoutes);
router.use('/org', orgRoutes);
router.use('/auth', authRoutes);

// Route to handle sign-in form submission
router.post('/sign-in', async function (req, res) {
  const departmentCode = req.body['department-code']?.trim();

  if (!departmentCode) {
    res.render('index', {
      errorMessage: 'Enter a department code'
    });
    return;
  }

  // Find organization from our organizations data
  const organization = organizations.find(org => 
    org.analytics_identifier.toUpperCase() === departmentCode.toUpperCase()
  );

  try {
    // Check if there's an active wave for the department
    const activeWave = await db('survey_waves')
      .where({
        department_code: departmentCode.toUpperCase(),
        status: 'active'
      })
      .first();

    if (!activeWave) {
      return res.redirect('/survey/no-active-wave');
    }

    if (!organization) {
      return res.render('index', {
        errorMessage: 'Enter a valid department code',
        values: {
          'department-code': departmentCode
        }
      });
    }

    // Save the cookie policy before modifying the session
    const cookiesPolicy = req.session.data && req.session.data.cookies_policy;
    const showConfirmation = req.session.data && req.session.data.show_confirmation;

    // Initialize session data with cookies preserved
    req.session.data = {
      organization,
      answers: {},
      survey_start_time: new Date().toISOString(),
      cookies_policy: cookiesPolicy,
      show_confirmation: showConfirmation
    };

    res.redirect('/survey-start');
  } catch (error) {
    console.error('Error checking for active wave:', error);
    res.render('index', {
      errorMessage: 'Error checking department status. Please try again.',
      values: {
        'department-code': departmentCode
      }
    });
  }
});

// Add the survey start page route
router.get('/survey-start', function (req, res) {
  // Check if user is authenticated
  if (!req.session.data.organization) {
    res.redirect('/');
    return;
  }

  const surveyData = {
    themes: Question.getThemes()
  };

  res.render('survey/start', {
    organization: req.session.data.organization,
    surveyData
  });
});

// Dynamic question page route
router.get('/survey/question-:questionId', function (req, res) {
  // Check if user is authenticated
  if (!req.session.data.organization) {
    res.redirect('/');
    return;
  }

  const questionId = parseInt(req.params.questionId);
  const question = Question.getQuestionById(questionId);
  const ratingScale = Question.getRatingScale();
  
  if (!question) {
    res.redirect('/survey-start');
    return;
  }

  // Set up back link
  let backLink;
  if (req.query.return === 'check-answers') {
    backLink = '/survey/check-answers';
  } else {
    const previousQuestionId = questionId - 1;
    backLink = previousQuestionId > 0 ? `/survey/question-${previousQuestionId}` : '/survey-start';
  }

  res.render('survey/question', {
    question,
    ratingScale,
    backLink,
    previousAnswer: req.session.data.answers ? req.session.data.answers[questionId] : null
  });
});

// Handle question form submission
router.post('/survey/question-:questionId', function (req, res) {
  const questionId = parseInt(req.params.questionId);
  const answer = req.body.answer;
  const ratingScale = Question.getRatingScale();

  if (!answer) {
    const question = Question.getQuestionById(questionId);
    res.render('question', {
      question,
      ratingScale,
      errorMessage: 'Select an answer',
      backLink: req.query.return === 'check-answers' ? '/survey/check-answers' : `/survey/question-${questionId - 1}`
    });
    return;
  }

  // Initialize answers if needed
  if (!req.session.data.answers) {
    req.session.data.answers = {};
  }

  // Store the answer in session
  req.session.data.answers[questionId] = parseInt(answer);

  // Redirect based on where the user came from
  if (req.query.return === 'check-answers') {
    res.redirect('/survey/check-answers');
  } else {
    const allQuestions = Question.getAllQuestions();
    const nextQuestionId = questionId + 1;
    if (nextQuestionId <= allQuestions.length) {
      res.redirect(`/survey/question-${nextQuestionId}`);
    } else {
      res.redirect('/survey/check-answers');
    }
  }
});

// Check answers page
router.get('/survey/check-answers', function (req, res) {
  // Check if user is authenticated
  if (!req.session.data.organization) {
    res.redirect('/');
    return;
  }

  const allQuestions = Question.getAllQuestions();
  const ratingScale = Question.getRatingScale();
  
  res.render('survey/check-answers', {
    questions: allQuestions,
    ratingScale,
    data: req.session.data,
    backLink: `/survey/question-${allQuestions.length}`
  });
});

// Role information page
router.get('/survey/role-info', function (req, res) {
  // Check if user is authenticated
  if (!req.session.data?.organization) {
    res.redirect('/');
    return;
  }

  res.render('survey/role-info', {
    data: req.session.data,
    backLink: '/survey/check-answers',
    roleOptions: roles
  });
});

// Handle role information submission
router.post('/survey/role-info', function (req, res) {
  // Check if user is authenticated
  if (!req.session.data?.organization) {
    res.redirect('/');
    return;
  }

  const { role, grade, feedback, action } = req.body;

  // If skipping, set role info to null
  if (action === 'skip') {
    req.session.data.role_info = {
      role: null,
      grade: null,
      feedback: null
    };
  } else {
    // Store role information in session
    req.session.data.role_info = {
      role: role?.trim() || null,
      grade: grade?.trim() || null,
      feedback: feedback?.trim() || null
    };
  }

  // Create a form to submit the survey
  res.render('survey/submit', {
    data: req.session.data
  });
});

// Handle survey submission
router.post('/survey/submit', async function (req, res) {
  try {
    if (!req.session.data?.organization) {
      res.redirect('/');
      return;
    }

    const { organization, answers, role_info } = req.session.data;

    // Validate answers first
    const validationErrors = Question.validateAnswers(answers);

    console.log('validationErrors', validationErrors);

    if (validationErrors.length > 0) {
      return res.render('survey/check-answers', {
        questions: Question.getAllQuestions(),
        ratingScale: Question.getRatingScale(),
        data: req.session.data,
        errorMessage: 'Please answer all required questions'
      });
    }

    // Calculate theme scores and overall score
    const themes = Question.getThemes();
    const themeScores = {};
    let totalScore = 0;
    let totalQuestions = 0;

    // Get all questions with their theme info
    const allQuestions = Question.getAllQuestions();
    
    // Group questions by theme
    const questionsByTheme = allQuestions.reduce((acc, question) => {
      if (!acc[question.theme_id]) {
        acc[question.theme_id] = [];
      }
      acc[question.theme_id].push(question);
      return acc;
    }, {});

    // Calculate scores for each theme
    for (const theme of themes) {
      const themeQuestions = questionsByTheme[theme.theme_id] || [];
      let themeTotal = 0;
      let themeAnswered = 0;

      for (const question of themeQuestions) {
        const answer = answers[question.question_id];
        if (typeof answer === 'number') {
          themeTotal += answer;
          themeAnswered++;
          totalScore += answer;
          totalQuestions++;
        }
      }

      if (themeAnswered > 0) {
        themeScores[theme.theme_id] = themeTotal / themeAnswered;
      }
    }

    const overallScore = totalQuestions > 0 ? totalScore / totalQuestions : null;

    // Create survey response
    const response = await surveyService.createSurveyResponse({
      department_code: organization.analytics_identifier,
      organization_name: organization.title,
      answers,
      theme_scores: themeScores,
      overall_score: overallScore,
      role: role_info?.role,
      grade: role_info?.grade,
      feedback: role_info?.feedback
    });

    // Clear session data but preserve cookie settings
    req.session.data = {
      cookies_policy: req.session.data.cookies_policy,
      show_confirmation: req.session.data.show_confirmation
    };

    res.redirect('/survey/confirmation');
  } catch (error) {
    console.error('Survey submission error:', error);
    res.render('error', {
      message: 'Error submitting survey. Please try again.'
    });
  }
});

// Confirmation page
router.get('/survey/confirmation', function (req, res) {
  res.render('survey/confirmation');
});

// Add routes for footer pages
router.get('/cookies', function (req, res) {
  res.render('static/cookies', {
    cookies_policy: req.session.data && req.session.data.cookies_policy
  });
});

router.get('/privacy', function (req, res) {
  res.render('static/privacy');
});

router.get('/accessibility', function (req, res) {
  res.render('static/accessibility');
});

// Handle cookie consent
router.post('/cookies', function (req, res) {
  const analytics = req.body.analytics === 'yes';
  
  if (!req.session.data) {
    req.session.data = {};
  }
  
  req.session.data.cookies_policy = {
    analytics: analytics,
    essential: true
  };
  req.session.data.show_confirmation = true;

  res.render('cookies', {
    saved: true
  });
});

// Sign out
router.get('/sign-out', function (req, res) {
  // Save cookie preferences before destroying session
  const cookiesPolicy = req.session.data?.cookies_policy;
  const showConfirmation = req.session.data?.show_confirmation;
  const dataLayer = req.session.data?.dataLayer;

  // Destroy the session and create a new one with just cookie preferences
  req.session.regenerate((err) => {
    if (err) {
      console.error('Error regenerating session:', err);
    }

    // Initialize new session with saved preferences
    req.session.data = {
      cookies_policy: cookiesPolicy,
      show_confirmation: showConfirmation,
      dataLayer: dataLayer
    };

    res.redirect('/');
  });
});

// Use route modules
router.use('/survey', surveyRoutes);
router.use('/analytics', analyticsRoutes);

// Home page
router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
