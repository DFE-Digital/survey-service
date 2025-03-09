const db = require('../db');

async function createRegistrationRequest(req, res) {
  const { email, first_name, last_name, department_code, department_name } = req.body;
  const errors = {};

  if (!email) {
    errors.email = 'Enter your email address';
  }
  if (!first_name) {
    errors.first_name = 'Enter your first name';
  }
  if (!last_name) {
    errors.last_name = 'Enter your last name';
  }
  if (!department_code) {
    errors.department_code = 'Select your department';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('auth/register', {
      errors,
      values: req.body
    });
  }

  try {
    // Check if there's an active wave for the department
    const activeWave = await db('survey_waves')
      .where({
        department_code: department_code,
        status: 'active'
      })
      .first();

    if (!activeWave) {
      errors.department_code = 'This department is not currently accepting survey responses. Please try again later or contact the department administrator.';
      return res.render('auth/register', {
        errors,
        values: req.body
      });
    }

    // Check if user already exists
    const existingUser = await db('users')
      .where('email', email)
      .first();

    if (existingUser) {
      errors.email = 'An account with this email already exists';
      return res.render('auth/register', {
        errors,
        values: req.body
      });
    }

    // Check if there's already a pending request
    const existingRequest = await db('registration_requests')
      .where({
        email,
        department_code,
        status: 'pending'
      })
      .first();

    if (existingRequest) {
      errors.email = 'You already have a pending registration request';
      return res.render('auth/register', {
        errors,
        values: req.body
      });
    }

    // Create registration request
    await db('registration_requests').insert({
      email,
      first_name,
      last_name,
      department_code,
      department_name,
      status: 'pending',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    res.render('auth/register-confirmation');
  } catch (error) {
    console.error('Error creating registration request:', error);
    res.render('error', {
      message: 'Error creating registration request'
    });
  }
}

module.exports = {
  createRegistrationRequest
}; 