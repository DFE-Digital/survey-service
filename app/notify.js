const NotifyClient = require('notifications-node-client').NotifyClient;

const notify = new NotifyClient(process.env.NOTIFY_API_KEY);

const TEMPLATES = {
  magic_link: '4599d87d-3863-4d15-bee0-628d6c6fe8d6',
  registration: '63b7dfcc-9a3a-4d2c-a373-696415c1cdb9'
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
  sendEmail
}; 