const db = require('./index');

async function getDashboardStats(departmentCode = null) {
  try {
    const knex = await db.getDb();
    const baseQuery = knex('survey_responses').where('submitted_at', 'is not', null);
    
    if (departmentCode) {
      baseQuery.where('department_code', departmentCode);
    }

    // Basic stats
    const basicStats = await baseQuery.clone()
      .select(knex.raw(`
        count(*) as total_responses,
        avg(overall_score) as average_score,
        min(overall_score) as min_score,
        max(overall_score) as max_score
      `))
      .first();

    // Responses by role
    const roleStats = await baseQuery.clone()
      .select('respondent_role')
      .count('* as count')
      .whereNotNull('respondent_role')
      .groupBy('respondent_role')
      .orderBy('count', 'desc');

    // Responses by grade
    const gradeStats = await baseQuery.clone()
      .select('respondent_grade')
      .count('* as count')
      .whereNotNull('respondent_grade')
      .groupBy('respondent_grade')
      .orderBy('count', 'desc');

    // Average scores by role
    const roleScores = await baseQuery.clone()
      .select('respondent_role')
      .avg('overall_score as average_score')
      .count('* as response_count')
      .whereNotNull('respondent_role')
      .groupBy('respondent_role')
      .orderBy('average_score', 'desc');

    // Average scores by grade
    const gradeScores = await baseQuery.clone()
      .select('respondent_grade')
      .avg('overall_score as average_score')
      .count('* as response_count')
      .whereNotNull('respondent_grade')
      .groupBy('respondent_grade')
      .orderBy('average_score', 'desc');

    // Theme analysis - using a subquery to handle JSON data
    const themeScores = await knex.raw(`
      WITH theme_keys AS (
        SELECT DISTINCT jsonb_object_keys(theme_scores) as theme
        FROM survey_responses
        WHERE submitted_at IS NOT NULL
        ${departmentCode ? "AND department_code = ?" : ""}
      )
      SELECT 
        theme,
        AVG((survey_responses.theme_scores->>theme)::numeric) as average_score,
        COUNT(*) as response_count
      FROM theme_keys
      CROSS JOIN survey_responses
      WHERE submitted_at IS NOT NULL
      ${departmentCode ? "AND department_code = ?" : ""}
      GROUP BY theme
      ORDER BY average_score DESC
    `, departmentCode ? [departmentCode, departmentCode] : []);

    // Question analysis - using a subquery to handle JSON data
    const questionScores = await knex.raw(`
      WITH question_keys AS (
        SELECT DISTINCT jsonb_object_keys(answers) as question_id
        FROM survey_responses
        WHERE submitted_at IS NOT NULL
        ${departmentCode ? "AND department_code = ?" : ""}
      )
      SELECT 
        question_id,
        AVG((survey_responses.answers->>question_id)::numeric) as average_score,
        COUNT(*) as response_count
      FROM question_keys
      CROSS JOIN survey_responses
      WHERE submitted_at IS NOT NULL
      ${departmentCode ? "AND department_code = ?" : ""}
      GROUP BY question_id
      ORDER BY average_score DESC
    `, departmentCode ? [departmentCode, departmentCode] : []);

    return {
      basicStats,
      roleStats,
      gradeStats,
      roleScores,
      gradeScores,
      themeScores: themeScores.rows,
      questionScores: questionScores.rows
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}

// Get time-based trends
async function getTrends(departmentCode = null, interval = 'month') {
  try {
    const knex = await db.getDb();
    const query = knex('survey_responses')
      .select(knex.raw(`
        date_trunc('${interval}', submitted_at) as period,
        count(*) as responses,
        avg(overall_score) as average_score
      `))
      .whereNotNull('submitted_at');

    if (departmentCode) {
      query.where('department_code', departmentCode);
    }

    return query
      .groupBy('period')
      .orderBy('period', 'asc');
  } catch (error) {
    console.error('Error getting trends:', error);
    throw error;
  }
}

// Get list of departments with response counts
async function getDepartments() {
  try {
    const knex = await db.getDb();
    return knex('survey_responses')
      .select('department_code', 'organization_name')
      .count('* as response_count')
      .whereNotNull('submitted_at')
      .groupBy('department_code', 'organization_name')
      .orderBy('response_count', 'desc');
  } catch (error) {
    console.error('Error getting departments:', error);
    throw error;
  }
}

module.exports = {
  getDashboardStats,
  getTrends,
  getDepartments
}; 