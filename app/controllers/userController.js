const db = require('../db');
const { sendUserInvite } = require('../lib/notifications');
const userModel = require('../models/user');
const notifyService = require('../services/notifyService');

async function getPendingRegistrations(req, res) {
  try {
    const pending = await userModel.getPendingRegistrations();
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({ error: 'Error fetching pending registrations' });
  }
}

async function getRegistrationHistory(req, res) {
  try {
    const history = await userModel.getRegistrationHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching registration history:', error);
    res.status(500).json({ error: 'Error fetching registration history' });
  }
}

async function approveRegistration(req, res) {
  const { id } = req.params;

  try {
    const registration = await userModel.approveRegistration(id);

    // Send approval notification
    await notifyService.sendSurveyInvite(registration.email, registration.department_name, `${process.env.BASE_URL}/admin/sign-in`);

    res.redirect('/admin/registrations');
  } catch (error) {
    console.error('Error approving registration:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
}

async function rejectRegistration(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    await userModel.rejectRegistration(id, reason);
    res.redirect('/admin/registrations');
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
}

async function getAnalysis(req, res) {
  try {
    const responses = await db('survey_responses')
      .where('department_code', req.user.departmentCode)
      .select('id');

    if (responses.length === 0) {
      return res.render('org/analysis', {
        currentPage: 'analysis',
        responses: [],
        averageScore: 0,
        questionScores: []
      });
    }

    const averageScoreResult = await db('survey_answers')
      .whereIn('survey_response_id', responses.map(r => r.id))
      .avg('answer as average')
      .first();

    const averageScore = parseFloat(averageScoreResult.average) || 0;

    const questionScores = await db('survey_answers')
      .join('questions', 'survey_answers.question_id', 'questions.id')
      .whereIn('survey_response_id', responses.map(r => r.id))
      .select('questions.text')
      .avg('answer as average')
      .groupBy('questions.text')
      .orderBy('questions.text');

    res.render('org/analysis', {
      currentPage: 'analysis',
      responses,
      averageScore,
      questionScores
    });
  } catch (error) {
    console.error('Error loading analysis:', error);
    res.render('error', {
      message: 'Error loading analysis'
    });
  }
}

async function getUsers(req, res) {
  try {
    const users = await db('users')
      .where('department_code', req.user.departmentCode)
      .select('*')
      .orderBy('created_at', 'desc');

    res.render('org/users', {
      currentPage: 'users',
      users,
      errors: {}
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.render('error', {
      message: 'Error loading users'
    });
  }
}

async function approveUser(req, res) {
  try {
    // First check if there's an active wave for the department
    const activeWave = await db('survey_waves')
      .where({
        department_code: req.user.departmentCode,
        status: 'active'
      })
      .first();

    if (!activeWave) {
      req.flash('error', 'Cannot approve users when there is no active survey wave. Please create a wave first.');
      return res.redirect('/org/users');
    }

    const [request] = await db('registration_requests')
      .where({
        id: req.params.id,
        department_code: req.user.departmentCode,
        status: 'pending'
      })
      .update({
        status: 'approved',
        approved_by: req.user.id,
        approved_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    if (!request) {
      return res.render('error', {
        message: 'Registration request not found'
      });
    }

    // Create user account
    const [user] = await db('users')
      .insert({
        email: request.email,
        first_name: request.first_name,
        last_name: request.last_name,
        department_code: request.department_code,
        department_name: request.department_name,
        is_approved: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    // Send welcome email
    await sendUserInvite(user.email);

    res.redirect('/org/users');
  } catch (error) {
    console.error('Error approving user:', error);
    res.render('error', {
      message: 'Error approving user'
    });
  }
}

async function removeUser(req, res) {
  try {
    await db('users')
      .where({
        id: req.params.id,
        department_code: req.user.departmentCode,
        is_org_owner: false
      })
      .del();

    req.flash('success', 'User removed successfully');
    res.redirect('/org/users');
  } catch (error) {
    console.error('Error removing user:', error);
    res.render('error', {
      message: 'Error removing user'
    });
  }
}

async function inviteUser(req, res) {
  const { email } = req.body;
  const errors = {};

  if (!email) {
    errors.email = 'Enter an email address';
  } else if (!email.endsWith('.gov.uk')) {
    errors.email = 'Email must be a government email address';
  }

  if (Object.keys(errors).length > 0) {
    const users = await db('users')
      .where('department_code', req.user.departmentCode)
      .select('*')
      .orderBy('created_at', 'desc');

    return res.render('org/users', {
      currentPage: 'users',
      users,
      errors
    });
  }

  try {
    const [invite] = await db('user_invites').insert({
      department_code: req.user.departmentCode,
      email,
      invited_by: req.user.email,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('*');

    await sendUserInvite(email, invite.id);

    req.flash('success', 'User invite sent successfully');
    res.redirect('/org/users');
  } catch (error) {
    console.error('Error inviting user:', error);
    res.render('error', {
      message: 'Error inviting user'
    });
  }
}

async function createAuthToken(req, res) {
  const { userId, type } = req.body;

  try {
    const { token, expiresAt } = await userModel.createAuthToken(userId, type);

    // Get user details for the email
    const user = await userModel.getUser(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Send magic link email
    if (type === 'magic_link') {
      await notifyService.sendSurveyInvite(user.email, user.department_code, `${process.env.BASE_URL}/auth/verify?token=${token}`);
    }

    res.json({ token, expiresAt });
  } catch (error) {
    console.error('Error creating auth token:', error);
    res.status(500).json({ error: 'Error creating auth token' });
  }
}

module.exports = {
  getPendingRegistrations,
  getRegistrationHistory,
  approveRegistration,
  rejectRegistration,
  getAnalysis,
  getUsers,
  approveUser,
  removeUser,
  inviteUser,
  createAuthToken
}; 