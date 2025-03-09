const db = require('../db');

/**
 * Creates a new survey response in the database
 * @param {Object} data Survey response data
 * @param {string} data.department_code Department code
 * @param {string} data.organization_name Organization name
 * @param {Object} data.answers Survey answers in JSON format
 * @param {Object} [data.theme_scores] Theme scores in JSON format (optional)
 * @param {number} [data.overall_score] Overall survey score (optional)
 * @param {string} [data.role] User's role (optional)
 * @param {string} [data.grade] User's grade (optional)
 * @param {string} [data.feedback] User's feedback (optional)
 * @returns {Promise<Object>} Created survey response
 */
async function createSurveyResponse(data) {
  const now = new Date();
  
  const [response] = await db('survey_responses')
    .insert({
      department_code: data.department_code,
      organization_name: data.organization_name,
      answers: data.answers,
      theme_scores: data.theme_scores,
      overall_score: data.overall_score,
      started_at: data.started_at || now,
      submitted_at: now,
      created_at: now,
      updated_at: now
    })
    .returning('*');

  // If role info is provided, create a survey_feedback record
  if (data.role || data.grade || data.feedback) {
    await db('survey_feedback').insert({
      survey_response_id: response.id,
      role: data.role,
      grade: data.grade,
      feedback: data.feedback,
      created_at: now,
      updated_at: now
    });
  }

  return response;
}

/**
 * Gets all survey responses for a department
 * @param {string} departmentCode Department code
 * @returns {Promise<Array>} Array of survey responses
 */
async function getSurveyResponses(departmentCode) {
  const responses = await db('survey_responses')
    .where('department_code', departmentCode)
    .orderBy('created_at', 'desc');

  // Get feedback for responses that have it
  const responseIds = responses.map(r => r.id);
  const feedback = await db('survey_feedback')
    .whereIn('survey_response_id', responseIds);

  // Merge feedback into responses
  return responses.map(response => {
    const responseFeedback = feedback.find(f => f.survey_response_id === response.id);
    return {
      ...response,
      role: responseFeedback?.role,
      grade: responseFeedback?.grade,
      feedback: responseFeedback?.feedback
    };
  });
}

/**
 * Gets a single survey response by ID
 * @param {string} id Survey response ID
 * @returns {Promise<Object>} Survey response with feedback if available
 */
async function getSurveyResponseById(id) {
  const response = await db('survey_responses')
    .where('id', id)
    .first();

  if (!response) {
    return null;
  }

  const feedback = await db('survey_feedback')
    .where('survey_response_id', id)
    .first();

  return {
    ...response,
    role: feedback?.role,
    grade: feedback?.grade,
    feedback: feedback?.feedback
  };
}

module.exports = {
  createSurveyResponse,
  getSurveyResponses,
  getSurveyResponseById
}; 