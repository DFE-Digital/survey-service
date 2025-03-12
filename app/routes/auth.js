const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const { 
  getUserByEmail,
  createRegistrationRequest,
  createAuthToken,
  validateAuthToken
} = require('../models/user');
const notify = require('../notify');
const organizations = require('../data/organizations.json');
const db = require('../db');

// Sign in page
router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in', {
    errors: {},
    success: req.query.success === 'true'
  });
});

// Handle sign in
router.post('/sign-in', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.render('auth/sign-in', {
        errors: {
          email: {
            text: 'Email address not found'
          }
        }
      });
    }

    if (!user.is_approved) {
      return res.render('auth/sign-in', {
        errors: {
          email: {
            text: 'Your account is pending approval'
          }
        }
      });
    }

    const token = await createAuthToken(user.id);
    
    await notify.sendEmail('magic_link', {
      email: user.email,
      personalisation: {
        serviceURL: process.env.BASE_URL,
        magiclink: token.token
      }
    });

    res.redirect('/sign-in?success=true');
  } catch (error) {
    console.error('Sign in error:', error);
    res.render('auth/sign-in', {
      errors: {
        email: {
          text: 'Something went wrong. Please try again.'
        }
      }
    });
  }
});

// Sign up page
router.get('/sign-up', (req, res) => {
  res.render('auth/sign-up', {
    departments: organizations.map(org => ({
      value: org.analytics_identifier,
      text: org.title
    })),
    errors: {}
  });
});

// Handle sign up
router.post('/sign-up', async (req, res) => {
  const { firstName, lastName, email, department, justification } = req.body;

  try {
    const [request] = await createRegistrationRequest({
      firstName,
      lastName,
      email,
      department,
      justification
    });

    // Get organization name from code
    const org = organizations.find(o => o.analytics_identifier === department);

    // Send registration confirmation email
    await notify.sendEmail('registration', {
      email,
      personalisation: {
        firstName,
        lastName,
        organisation: org.title
      }
    });

    res.render('auth/sign-up', {
      departments: organizations.map(org => ({
        value: org.analytics_identifier,
        text: org.title
      })),
      success: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/sign-up', {
      departments: organizations.map(org => ({
        value: org.analytics_identifier,
        text: org.title
      })),
      errors: {
        email: {
          text: error.message
        }
      }
    });
  }
});

// Handle magic link tokens
router.get('/t/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Find and validate the token
    const authToken = await db('auth_tokens')
      .where({
        token,
        type: 'magic_link',
        used: false
      })
      .where('expires_at', '>', db.fn.now())
      .first();

    if (!authToken) {
      return res.render('error', {
        title: 'Invalid or expired link',
        text: 'This sign in link is no longer valid. Please request a new one.'
      });
    }

    // Get the user
    const user = await db('users')
      .where('id', authToken.user_id)
      .first();

    if (!user) {
      return res.render('error', {
        title: 'User not found',
        text: 'The user associated with this link no longer exists.'
      });
    }

    if (!user.is_approved) {
      return res.render('error', {
        title: 'Account not approved',
        text: 'Your account is still pending approval.'
      });
    }

    // Mark token as used
    await db('auth_tokens')
      .where('id', authToken.id)
      .update({
        used: true,
        updated_at: db.fn.now()
      });

    // Set session data
    req.session.data = {
      ...req.session.data,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        departmentCode: user.department_code,
        isAdmin: user.is_admin,
        isOrgOwner: user.is_org_owner
      }
    };

    // Redirect based on user type
    if (user.is_admin) {
      res.redirect('/admin/registrations');
    } else if (user.is_org_owner) {
      res.redirect('/org/dashboard');
    } else {
      res.redirect('/dashboard');
    }

  } catch (error) {
    console.error('Error processing auth token:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try signing in again.'
    });
  }
});

// Sign out
router.get('/sign-out', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router; 