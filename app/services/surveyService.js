const db = require('../db');

class SurveyService {
  async findAppropriateWave(departmentCode, submissionDate = new Date()) {
    // First try to find an active wave
    const activeWave = await db('survey_waves')
      .where({
        department_code: departmentCode.toUpperCase(),
        status: 'active'
      })
      .first();

    if (activeWave) {
      return activeWave;
    }

    // If no active wave, find a wave that covers the submission date
    const wave = await db('survey_waves')
      .where('department_code', departmentCode.toUpperCase())
      .where('start_date', '<=', submissionDate)
      .where('end_date', '>=', submissionDate)
      .orderBy('created_at', 'desc')
      .first();

    return wave;
  }

  async getActiveWave(departmentCode) {
    return await db('survey_waves')
      .where({
        department_code: departmentCode.toUpperCase(),
        status: 'active'
      })
      .first();
  }

  async createSurveyResponse(data) {
    const now = new Date();
    
    // Find appropriate wave for the submission
    const wave = await this.findAppropriateWave(data.department_code, now);
    
    if (!wave) {
      throw new Error('No active survey wave found. Please contact your department administrator.');
    }

    const [response] = await db('survey_responses')
      .insert({
        department_code: data.department_code.toUpperCase(),
        organization_name: data.organization_name,
        answers: data.answers,
        theme_scores: data.theme_scores,
        overall_score: data.overall_score,
        started_at: data.started_at || now,
        submitted_at: now,
        survey_wave_id: wave.id,
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

  async getSurveyResponses(departmentCode, waveId = null) {
    const query = db('survey_responses')
      .where('department_code', departmentCode.toUpperCase())
      .orderBy('created_at', 'desc');

    if (waveId) {
      query.where('survey_wave_id', waveId);
    }

    const responses = await query;

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

  async getSurveyResponseById(id) {
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
}

module.exports = new SurveyService(); 