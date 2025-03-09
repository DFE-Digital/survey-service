const db = require('../db');
const crypto = require('crypto');

async function signIn(req, res) {
  const errors = {};
  const errorList = [];
  const email = req.body.email?.trim();

  if (!email) {
    errors.email = {
      text: 'Enter your email address'
    };
    errorList.push({
      text: 'Enter your email address',
      href: '#email'
    });
  } else if (!email.endsWith('.gov.uk') && !email.endsWith('.nhs.uk') && !email.endsWith('.police.uk')) {
    errors.email = {
      text: 'Enter a government email address'
    };
    errorList.push({
      text: 'Enter a government email address',
      href: '#email'
    });
  }

  if (Object.keys(errors).length > 0) {
    return res.render('admin/sign-in', {
      errors,
      errorList,
      errorMessage: true,
      data: req.body
    });
  }

  try {
    const user = await db('users')
      .where('email', email)
      .first();

    if (!user) {
      errors.email = {
        text: 'No account found with this email address'
      };
      errorList.push({
        text: 'No account found with this email address',
        href: '#email'
      });
      return res.render('admin/sign-in', {
        errors,
        errorList,
        errorMessage: true,
        data: req.body
      });
    }

    if (!user.is_approved) {
      errors.email = {
        text: 'Your account is pending approval'
      };
      errorList.push({
        text: 'Your account is pending approval',
        href: '#email'
      });
      return res.render('admin/sign-in', {
        errors,
        errorList,
        errorMessage: true,
        data: req.body
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await db('auth_tokens').insert({
      token,
      user_id: user.id,
      type: 'magic_link',
      expires_at: expiresAt,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Magic link: ${process.env.BASE_URL || 'http://localhost:3000'}/auth/t/${token}`);
    }

    res.render('admin/check-email', {
      email: user.email
    });

  } catch (error) {
    console.error('Error in admin sign-in:', error);
    return res.render('admin/sign-in', {
      errors: {
        email: {
          text: 'Something went wrong. Please try again.'
        }
      },
      errorList: [{
        text: 'Something went wrong. Please try again.',
        href: '#email'
      }],
      errorMessage: true,
      data: req.body
    });
  }
}

module.exports = {
  signIn
}; 