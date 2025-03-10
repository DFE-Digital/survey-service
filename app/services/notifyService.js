const NotifyClient = require('notifications-node-client').NotifyClient;

class NotifyService {
  constructor() {
    this.client = new NotifyClient(process.env.NOTIFY_API_KEY);
  }

  async sendSurveyInvite(email, departmentName, surveyUrl) {
    try {
      const response = await this.client.sendEmail(
        process.env.NOTIFY_SURVEY_INVITE_TEMPLATE_ID,
        email,
        {
          personalisation: {
            department_name: departmentName,
            survey_url: surveyUrl
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error sending survey invite:', error);
      throw error;
    }
  }

  async sendSurveyComplete(email, departmentName, organizationName) {
    try {
      const response = await this.client.sendEmail(
        process.env.NOTIFY_SURVEY_COMPLETE_TEMPLATE_ID,
        email,
        {
          personalisation: {
            department_name: departmentName,
            organization_name: organizationName
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error sending survey complete notification:', error);
      throw error;
    }
  }

  async sendWaveComplete(email, departmentName, waveName) {
    try {
      const response = await this.client.sendEmail(
        process.env.NOTIFY_WAVE_COMPLETE_TEMPLATE_ID,
        email,
        {
          personalisation: {
            department_name: departmentName,
            wave_name: waveName
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error sending wave complete notification:', error);
      throw error;
    }
  }
}

module.exports = new NotifyService(); 