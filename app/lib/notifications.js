const NotifyClient = require('notifications-node-client').NotifyClient;

const notifyClient = new NotifyClient(process.env.NOTIFY_API_KEY);

async function sendSurveyInvite(email, inviteId) {
  const surveyUrl = `${process.env.BASE_URL}/survey/${inviteId}`;
  
  try {
    await notifyClient.sendEmail(
      // TODO: Replace with your GOV.UK Notify template ID
      'survey-invite-template-id',
      email,
      {
        personalisation: {
          survey_url: surveyUrl
        }
      }
    );
  } catch (error) {
    console.error('Error sending survey invite email:', error);
    throw error;
  }
}

async function sendUserInvite(email, inviteId) {
  const registrationUrl = `${process.env.BASE_URL}/register/${inviteId}`;
  
  try {
    await notifyClient.sendEmail(
      // TODO: Replace with your GOV.UK Notify template ID
      'user-invite-template-id',
      email,
      {
        personalisation: {
          registration_url: registrationUrl
        }
      }
    );
  } catch (error) {
    console.error('Error sending user invite email:', error);
    throw error;
  }
}

module.exports = {
  sendSurveyInvite,
  sendUserInvite
}; 