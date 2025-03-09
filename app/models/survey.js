const db = require('../db');

class Survey {
  static async createResponse(departmentCode, organizationName) {
    const [response] = await db('survey_responses')
      .insert({
        department_code: departmentCode,
        organization_name: organizationName,
        started_at: db.fn.now(),
        answers: '{}',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return response;
  }

  static async getResponse(id) {
    const response = await db('survey_responses')
      .where('id', id)
      .first();

    if (!response) {
      return null;
    }

    // Get feedback if it exists
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

  static async updateResponse(id, data) {
    const { answers, theme_scores, overall_score } = data;
    
    await db('survey_responses')
      .where('id', id)
      .update({
        answers,
        theme_scores,
        overall_score,
        updated_at: db.fn.now()
      });
  }

  static async submitResponse(id, roleInfo) {
    console.log('Submitting response for survey ID:', id);
    console.log('Role info:', roleInfo);

    const { role, grade, feedback } = roleInfo;

    // Start a transaction
    const trx = await db.transaction();

    try {
      console.log('Starting transaction');

      // Update survey response
      const [updatedResponse] = await trx('survey_responses')
        .where('id', id)
        .update({
          submitted_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');

      console.log('Updated survey response:', updatedResponse);

      // Create feedback record
      if (role || grade || feedback) {
        console.log('Creating feedback record');
        const [feedbackRecord] = await trx('survey_feedback').insert({
          survey_response_id: id,
          role,
          grade,
          feedback,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');

        console.log('Created feedback record:', feedbackRecord);
      }

      console.log('Committing transaction');
      await trx.commit();
      console.log('Transaction committed successfully');
    } catch (error) {
      console.error('Error in submitResponse:', error);
      await trx.rollback();
      throw error;
    }
  }

  static async calculateThemeScores(answers, questions) {
    const themeScores = {};
    const themeQuestionCounts = {};

    // Group questions by theme and calculate average scores
    for (const [questionId, score] of Object.entries(answers)) {
      const question = questions.find(q => q.question_id === parseInt(questionId));
      if (question) {
        const themeId = question.theme_id;
        if (!themeScores[themeId]) {
          themeScores[themeId] = 0;
          themeQuestionCounts[themeId] = 0;
        }
        themeScores[themeId] += parseInt(score);
        themeQuestionCounts[themeId]++;
      }
    }

    // Calculate average for each theme
    for (const themeId of Object.keys(themeScores)) {
      themeScores[themeId] = themeScores[themeId] / themeQuestionCounts[themeId];
    }

    return themeScores;
  }

  static calculateOverallScore(themeScores) {
    const scores = Object.values(themeScores);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}

module.exports = Survey; 