const db = require('../db');
const { sendUserInvite } = require('../lib/notifications');

async function getPendingRegistrations() {
  return db('registration_requests')
    .where('status', 'pending')
    .orderBy('created_at', 'desc');
}

async function getRegistrationHistory() {
  return db('registration_requests')
    .whereNot('status', 'pending')
    .orderBy('updated_at', 'desc')
    .limit(50);
}

async function approveRegistration(id) {
  const registration = await db('registration_requests')
    .where('id', id)
    .first();

  if (!registration) {
    throw new Error('Registration not found');
  }

  // Log full registration data
  console.log('Full registration data:', JSON.stringify(registration, null, 2));

  if (!registration.department_name) {
    throw new Error('Registration is missing department name');
  }

  await db.transaction(async (trx) => {
    // Build insert data
    const insertData = {
      email: registration.email,
      first_name: registration.first_name,
      last_name: registration.last_name,
      department_code: registration.department_code,
      department_name: registration.department_name,
      is_approved: true,
      is_admin: false,
      is_org_owner: true
    };

    console.log('Insert data:', JSON.stringify(insertData, null, 2));

    // Use explicit columns in the insert
    const query = trx.queryBuilder()
      .insert(insertData)
      .into('users')
      .returning('*');

    // Log the query before executing
    console.log('Query SQL:', query.toSQL().sql);
    console.log('Query bindings:', query.toSQL().bindings);

    const [user] = await query;
    console.log('Created user:', JSON.stringify(user, null, 2));

    await trx('registration_requests')
      .where('id', id)
      .update({
        status: 'approved',
        updated_at: trx.fn.now()
      });
  });
}

async function rejectRegistration(id, reason) {
  await db('registration_requests')
    .where('id', id)
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: db.fn.now()
    });
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

module.exports = {
  getPendingRegistrations,
  getRegistrationHistory,
  approveRegistration,
  rejectRegistration,
  getAnalysis,
  getUsers,
  approveUser,
  removeUser,
  inviteUser
}; 