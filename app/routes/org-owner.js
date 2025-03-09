const express = require('express');
const router = express.Router();
const { requireOrgOwner } = require('../middleware/auth');
const notify = require('../notify');
const db = require('../db');

// Get the analytics_identifier
const departments = require('../data/organizations.json');



// Organization owner dashboard
router.get('/dashboard', requireOrgOwner, async (req, res) => {
  try {
    const [totalResponses, pendingInvites, averageScore, invites] = await Promise.all([
      db('survey_responses')
        .where({ department_code: req.user.department_code })
        .count('id')
        .first()
        .then(result => parseInt(result.count)),
      
      db('survey_invites')
        .where({ 
          department_code: req.user.department_code,
          status: 'sent'
        })
        .count('id')
        .first()
        .then(result => parseInt(result.count)),
      
      db('survey_responses')
        .where({ department_code: req.user.department_code })
        .avg('score')
        .first()
        .then(result => parseFloat(result.avg) || 0),
      
      db('survey_invites')
        .where({ department_code: req.user.department_code })
        .orderBy('sent_at', 'desc')
    ]);

    const department = await db('departments')
      .where({ code: req.user.department_code })
      .first()
      .then(dept => dept.name);

    res.render('org-owner/dashboard', {
      department,
      departmentCode: req.user.department_code,
      totalResponses,
      pendingInvites,
      averageScore,
      invites,
      user: req.user,
      surveyUrl: `${process.env.BASE_URL}/survey`
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
});

// Send survey invites
router.post('/send-invites', requireOrgOwner, async (req, res) => {
  const { emails } = req.body;
  const emailList = emails.split('\n').map(email => email.trim()).filter(Boolean);

  try {
    await db.transaction(async (trx) => {
      for (const email of emailList) {
        // Create invite record
        const [invite] = await trx('survey_invites')
          .insert({
            sender_id: req.user.id,
            recipient_email: email,
            department_code: req.user.department_code
          })
          .returning('*');

        // Send invite email
        await notify.sendEmail('survey_invite', {
          email,
          personalisation: {
            senderName: `${req.user.first_name} ${req.user.last_name}`,
            department: req.user.department_code,
            surveyUrl: `${process.env.BASE_URL}/survey`,
            departmentCode: req.user.department_code
          }
        });
      }
    });

    res.redirect('/org-owner/dashboard?success=true');
  } catch (error) {
    console.error('Error sending invites:', error);
    res.render('error', {
      title: 'Something went wrong',
      text: 'Please try again later.'
    });
  }
});

module.exports = router; 