const knex = require('knex');
const config = require('../../knexfile');

// Initialize knex with retries
async function initializeDatabase(maxRetries = 3, retryDelay = 2000) {
  let lastError;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Use the correct environment configuration
      const environment = process.env.NODE_ENV || 'development';
      const db = knex(config[environment]);
      
      // Test the connection
      await db.raw('SELECT 1');
      console.log('Database connection established successfully');
      return db;
    } catch (error) {
      lastError = error;
      retries++;
      console.error(`Database connection attempt ${retries} failed:`, {
        error: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw new Error(`Failed to connect to database after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

// Lazy load database connection
let dbInstance = null;
async function getDb() {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}

// Helper to handle database errors
function handleDbError(error, operation) {
  console.error('Database operation failed:', {
    operation,
    error: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Detect connection issues
  if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
    dbInstance = null; // Reset connection
  }

  throw error;
}

async function createSurveyResponse(departmentCode, organizationName, roleInfo = null) {
  try {
    const db = await getDb();
    const [response] = await db('survey_responses')
      .insert({
        department_code: departmentCode,
        organization_name: organizationName,
        started_at: new Date(),
        respondent_role: roleInfo?.role,
        respondent_grade: roleInfo?.grade,
        feedback: roleInfo?.feedback
      })
      .returning('*');
    
    return response;
  } catch (error) {
    handleDbError(error, 'createSurveyResponse');
  }
}

async function submitSurvey(surveyId, answers, themeScores, overallScore) {
  try {
    const db = await getDb();
    await db.transaction(async (trx) => {
      // Update the survey response
      await trx('survey_responses')
        .where('id', surveyId)
        .update({
          submitted_at: new Date(),
          answers: JSON.stringify(answers),
          theme_scores: JSON.stringify(themeScores),
          overall_score: overallScore
        });

      // Log the submission
      await trx('survey_logs').insert({
        survey_id: surveyId,
        event_type: 'submission',
        event_data: JSON.stringify({
          timestamp: new Date(),
          theme_scores: themeScores,
          overall_score: overallScore
        })
      });
    });
  } catch (error) {
    handleDbError(error, 'submitSurvey');
  }
}

// Verify survey exists and is not already submitted
async function validateSurveyState(surveyId) {
  try {
    const db = await getDb();
    const survey = await db('survey_responses')
      .where('id', surveyId)
      .first();
    
    if (!survey) {
      throw new Error('Survey not found');
    }
    
    if (survey.submitted_at) {
      throw new Error('Survey already submitted');
    }
    
    return survey;
  } catch (error) {
    handleDbError(error, 'validateSurveyState');
  }
}

// Get analytics data for a date range
async function getAnalytics(startDate, endDate) {
  try {
    const db = await getDb();
    const results = await db('survey_responses')
      .whereBetween('submitted_at', [startDate, endDate])
      .select(
        'department_code',
        'organization_name',
        'started_at',
        'submitted_at',
        'overall_score',
        'theme_scores'
      );
    
    return results;
  } catch (error) {
    handleDbError(error, 'getAnalytics');
  }
}

module.exports = {
  getDb,
  createSurveyResponse,
  submitSurvey,
  validateSurveyState,
  getAnalytics
}; 