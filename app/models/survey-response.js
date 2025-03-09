const db = require('../db');

class SurveyResponse {
  static async getBasicStats(departmentCode = null) {
    const knex = await db.getDb();
    const query = knex('survey_responses')
      .select(knex.raw(`
        count(*) as total_responses,
        avg(overall_score) as average_score,
        min(overall_score) as min_score,
        max(overall_score) as max_score
      `))
      .whereNotNull('submitted_at');

    if (departmentCode) {
      query.where('department_code', departmentCode);
    }

    return query.first();
  }

  static async getThemeScores(departmentCode = null) {
    const knex = await db.getDb();
    const query = knex.raw(`
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

    return query.then(result => result.rows);
  }

  static async getRoleStats(departmentCode = null) {
    const knex = await db.getDb();
    const query = knex('survey_responses')
      .select('respondent_role')
      .count('* as count')
      .avg('overall_score as average_score')
      .whereNotNull('submitted_at')
      .whereNotNull('respondent_role')
      .groupBy('respondent_role')
      .orderBy('count', 'desc');

    if (departmentCode) {
      query.where('department_code', departmentCode);
    }

    return query;
  }

  static async getGradeStats(departmentCode = null) {
    const knex = await db.getDb();
    const query = knex('survey_responses')
      .select('respondent_grade')
      .count('* as count')
      .avg('overall_score as average_score')
      .whereNotNull('submitted_at')
      .whereNotNull('respondent_grade')
      .groupBy('respondent_grade')
      .orderBy('count', 'desc');

    if (departmentCode) {
      query.where('department_code', departmentCode);
    }

    return query;
  }

  static async getTrends(departmentCode = null, interval = 'month') {
    const knex = await db.getDb();
    const query = knex('survey_responses')
      .select(knex.raw(`
        date_trunc('${interval}', submitted_at) as period,
        count(*) as responses,
        avg(overall_score) as average_score
      `))
      .whereNotNull('submitted_at')
      .groupBy('period')
      .orderBy('period', 'asc');

    if (departmentCode) {
      query.where('department_code', departmentCode);
    }

    return query;
  }

  static async getDepartments() {
    const knex = await db.getDb();
    return knex('survey_responses')
      .select('department_code', 'organization_name')
      .count('* as response_count')
      .whereNotNull('submitted_at')
      .groupBy('department_code', 'organization_name')
      .orderBy('response_count', 'desc');
  }

  static async getCompletionStats(departmentCode) {
    const knex = await db.getDb();
    const completed = await knex('survey_responses')
      .whereNotNull('submitted_at')
      .andWhere('department_code', departmentCode)
      .count('* as count');

    const pending = await knex('survey_responses')
      .whereNull('submitted_at')
      .andWhere('department_code', departmentCode)
      .count('* as count');

    return {
      completed: completed[0].count,
      pending: pending[0].count
    };
  }

  static async getScoreStats(departmentCode) {
    const knex = await db.getDb();
    const scoreRanges = await knex('survey_responses')
      .select(knex.raw(`
        CASE
          WHEN overall_score BETWEEN 0 AND 20 THEN 'range_0_20'
          WHEN overall_score BETWEEN 21 AND 40 THEN 'range_21_40'
          WHEN overall_score BETWEEN 41 AND 60 THEN 'range_41_60'
          WHEN overall_score BETWEEN 61 AND 80 THEN 'range_61_80'
          WHEN overall_score BETWEEN 81 AND 100 THEN 'range_81_100'
        END as score_range,
        COUNT(*) as count
      `))
      .whereNotNull('submitted_at')
      .andWhere('department_code', departmentCode)
      .groupBy('score_range');

    const scoreStats = {
      range_0_20: 0,
      range_21_40: 0,
      range_41_60: 0,
      range_61_80: 0,
      range_81_100: 0
    };

    scoreRanges.forEach(row => {
      scoreStats[row.score_range] = row.count;
    });

    return scoreStats;
  }

  static async getDepartmentByCode(departmentCode) {
    const knex = await db.getDb();
    return knex('survey_responses')
      .select('department_code', 'organization_name')
      .where('department_code', departmentCode)
      .first();
  }

  static async getAverageScore(departmentCode) {
    const knex = await db.getDb();
    const result = await knex('survey_responses')
      .whereNotNull('submitted_at')
      .andWhere('department_code', departmentCode)
      .avg('overall_score as average_score')
      .first();
    return result.average_score;
  }

  static async getAverageScorePerTheme(departmentCode) {
    const knex = await db.getDb();
    const query = knex.raw(`
      SELECT theme, AVG(score::numeric) as average_score
      FROM survey_responses,
      LATERAL jsonb_each_text(theme_scores) AS theme_score(theme, score)
      WHERE submitted_at IS NOT NULL
      AND department_code = ?
      GROUP BY theme
      ORDER BY average_score DESC
    `, [departmentCode]);

    return query.then(result => result.rows);
  }

  static async getAverageScorePerQuestion(departmentCode) {
    const knex = await db.getDb();
    const query = knex.raw(`
      WITH question_scores AS (
        SELECT 
          key as question_id,
          value::numeric as score
        FROM survey_responses,
        LATERAL jsonb_each_text(answers) as q(key, value)
        WHERE submitted_at IS NOT NULL
        AND department_code = ?
      )
      SELECT 
        qs.question_id,
        ROUND(AVG(qs.score), 2) as average_score
      FROM question_scores qs
      GROUP BY qs.question_id
      ORDER BY qs.question_id::integer ASC
    `, [departmentCode]);

    const scores = await query.then(result => result.rows);
    const questions = require('../data/questions.json');
    
    // Helper function to convert to sentence case and improve text
    const toSentenceCase = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const improveThemeName = (name) => {
      return toSentenceCase(name.replace(/&/g, 'and'));
    };
    
    // Create a map of question_id to theme and question text
    const questionMap = new Map();
    questions.survey.themes.forEach(theme => {
      theme.questions.forEach(question => {
        questionMap.set(question.question_id.toString(), {
          theme_name: improveThemeName(theme.theme_name),
          question_text: question.question_text
        });
      });
    });

    // Combine scores with question info
    return scores.map(score => ({
      question_id: score.question_id,
      theme_name: questionMap.get(score.question_id).theme_name,
      question_text: questionMap.get(score.question_id).question_text,
      average_score: score.average_score
    }));
  }
}

module.exports = SurveyResponse; 