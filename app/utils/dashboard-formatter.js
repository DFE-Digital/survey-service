function formatDashboardData(stats, trends, departments, selectedDepartment) {
  // Format basic stats
  const basicStats = {
    total_responses: stats.basicStats?.total_responses || 0,
    average_score: (stats.basicStats?.average_score || 0).toFixed(2),
    min_score: (stats.basicStats?.min_score || 0).toFixed(2),
    max_score: (stats.basicStats?.max_score || 0).toFixed(2)
  };

  // Format theme scores
  const themeScores = (stats.themeScores || []).map(theme => ({
    theme: theme.theme || 'Unknown',
    average_score: (theme.average_score || 0).toFixed(2),
    response_count: theme.response_count || 0
  }));

  // Format role stats with scores
  const roleStats = (stats.roleStats || []).map(role => {
    const roleScore = (stats.roleScores || [])
      .find(score => score.respondent_role === role.respondent_role);
    
    return {
      role: role.respondent_role || 'Not specified',
      count: role.count || 0,
      average_score: roleScore ? roleScore.average_score.toFixed(2) : '0.00'
    };
  });

  // Format grade stats with scores
  const gradeStats = (stats.gradeStats || []).map(grade => {
    const gradeScore = (stats.gradeScores || [])
      .find(score => score.respondent_grade === grade.respondent_grade);
    
    return {
      grade: grade.respondent_grade || 'Not specified',
      count: grade.count || 0,
      average_score: gradeScore ? gradeScore.average_score.toFixed(2) : '0.00'
    };
  });

  // Format trends data
  const formattedTrends = (trends || []).map(trend => ({
    period: trend.period,
    responses: trend.responses || 0,
    average_score: (trend.average_score || 0).toFixed(2)
  }));

  // Format departments data
  const formattedDepartments = (departments || []).map(dept => ({
    value: dept.department_code,
    text: `${dept.organization_name} (${dept.response_count} responses)`,
    selected: selectedDepartment && selectedDepartment.department_code === dept.department_code
  }));

  // Format insights
  const insights = stats.themeScores && stats.themeScores.length > 0 && stats.questionScores && stats.questionScores.length > 0
    ? {
        bestTheme: {
          theme: stats.themeScores[0].theme || 'Unknown',
          score: (stats.themeScores[0].average_score || 0).toFixed(2)
        },
        worstTheme: {
          theme: stats.themeScores[stats.themeScores.length - 1].theme || 'Unknown',
          score: (stats.themeScores[stats.themeScores.length - 1].average_score || 0).toFixed(2)
        },
        bestQuestion: {
          id: stats.questionScores[0].question_id || 'Unknown',
          score: (stats.questionScores[0].average_score || 0).toFixed(2)
        },
        worstQuestion: {
          id: stats.questionScores[stats.questionScores.length - 1].question_id || 'Unknown',
          score: (stats.questionScores[stats.questionScores.length - 1].average_score || 0).toFixed(2)
        }
      }
    : null;

  return {
    basicStats,
    themeScores,
    roleStats,
    gradeStats,
    trends: formattedTrends,
    departments: formattedDepartments,
    insights,
    selectedDepartment
  };
}

module.exports = { formatDashboardData }; 