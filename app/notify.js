const NotifyClient = require('notifications-node-client').NotifyClient;

const notify = new NotifyClient(process.env.NOTIFY_API_KEY);

const TEMPLATES = {
  magic_link: process.env.NOTIFY_MAGIC_LINK_TEMPLATE_ID,
  registration: process.env.NOTIFY_REGISTRATION_TEMPLATE_ID,
  survey_invite: process.env.NOTIFY_SURVEY_INVITE_TEMPLATE_ID,
  survey_complete: process.env.NOTIFY_SURVEY_COMPLETE_TEMPLATE_ID,
  wave_complete: process.env.NOTIFY_WAVE_COMPLETE_TEMPLATE_ID,
  org_admin_approved: process.env.NOTIFY_ORG_ADMIN_APPROVED_TEMPLATE_ID,
  org_admin_rejected: process.env.NOTIFY_ORG_ADMIN_REJECTED_TEMPLATE_ID
};

async function sendEmail(templateName, { email, personalisation }) {
  if (!TEMPLATES[templateName]) {
    throw new Error(`Template ${templateName} not found`);
  }

  try {
    return await notify.sendEmail(TEMPLATES[templateName], email, {
      personalisation,
      reference: null
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  TEMPLATES
}; 