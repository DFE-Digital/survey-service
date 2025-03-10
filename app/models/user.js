const db = require('../db');
const crypto = require('crypto');
const notify = require('../notify');

async function getUser(id) {
  const dbInstance = await db.getDb();
  return await dbInstance('users')
    .where({ id })
    .first();
}

async function getUserByEmail(email) {
  const dbInstance = await db.getDb();
  return await dbInstance('users')
    .where({ email })
    .first();
}

async function createRegistrationRequest(data) {
  const dbInstance = await db.getDb();
  const existingRequest = await dbInstance('registration_requests')
    .where({ 
      email: data.email,
      status: 'pending'
    })
    .first();

  if (existingRequest) {
    throw new Error('You already have a pending registration request');
  }

  const existingUser = await getUserByEmail(data.email);
  if (existingUser) {
    throw new Error('This email is already registered');
  }

  return await dbInstance('registration_requests')
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      department_code: data.department,
      justification: data.justification,
      status: 'pending'
    })
    .returning('*');
}

async function approveRegistration(id) {
  const registration = await db('registration_requests')
    .where('id', id)
    .first();

  if (!registration) {
    throw new Error('Registration not found');
  }

  // Start a transaction
  await db.transaction(async (trx) => {
    // Create user
    const [user] = await trx('users')
      .insert({
        email: registration.email,
        first_name: registration.first_name,
        last_name: registration.last_name,
        department_code: registration.department_code,
        department_name: registration.department_name,
        is_approved: true,
        is_admin: false,
        is_org_owner: true,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      })
      .returning('*');

    // Update registration status
    await trx('registration_requests')
      .where('id', id)
      .update({
        status: 'approved',
        updated_at: trx.fn.now()
      });

    // Send approval notification
    await notify.sendEmail('org_admin_approved', {
      email: registration.email,
      personalisation: {
        organisationName: registration.department_name,
        departmentCode: registration.department_code,
        serviceURL: process.env.BASE_URL
      }
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

async function createAuthToken(userId, type = 'magic_link') {
  const dbInstance = await db.getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

  // Get user details for the email
  const user = await dbInstance('users')
    .where({ id: userId })
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  await dbInstance('auth_tokens').insert({
    token,
    user_id: userId,
    type,
    expires_at: expiresAt
  });

  // Send magic link email
  if (type === 'magic_link') {
    await notify.sendEmail('magic_link', {
      email: user.email,
      personalisation: {
        magicLink: `${process.env.BASE_URL}/auth/verify?token=${token}`,
        departmentCode: user.department_code
      }
    });
  }

  return { token, expiresAt };
}

async function validateAuthToken(token) {
  const dbInstance = await db.getDb();
  const result = await dbInstance('auth_tokens')
    .where({
      token,
      used: false
    })
    .where('expires_at', '>', dbInstance.fn.now())
    .first();

  if (!result) {
    return null;
  }

  await dbInstance('auth_tokens')
    .where({ id: result.id })
    .update({ used: true });

  return result;
}

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

module.exports = {
  getUser,
  getUserByEmail,
  createRegistrationRequest,
  approveRegistration,
  rejectRegistration,
  createAuthToken,
  validateAuthToken,
  getPendingRegistrations,
  getRegistrationHistory
}; 