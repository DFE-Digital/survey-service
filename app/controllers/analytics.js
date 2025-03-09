const SurveyResponse = require('../models/survey-response');
const { formatDashboardData } = require('../utils/dashboard-formatter');

class AnalyticsController {
  static async showLoginPage(req, res) {
    if (req.session.isAuthenticated) {
      return res.redirect('/analytics/departments');
    }
    res.render('analytics/login');
  }

  static async handleLogin(req, res) {
    const { password } = req.body;

    if (!password) {
      return res.render('analytics/login', {
        error: 'Enter a password'
      });
    }

    if (password === process.env.ANALYTICS_PASSWORD) {
      req.session.isAuthenticated = true;
      res.redirect('/analytics/departments');
    } else {
      res.render('analytics/login', {
        error: 'Invalid password'
      });
    }
  }

  static async showDashboard(req, res) {
    try {
      const departmentCode = req.query.department;

      // Fetch all required data in parallel
      const [
        basicStats,
        themeScores,
        roleStats,
        gradeStats,
        trends,
        departments
      ] = await Promise.all([
        SurveyResponse.getBasicStats(departmentCode),
        SurveyResponse.getThemeScores(departmentCode),
        SurveyResponse.getRoleStats(departmentCode),
        SurveyResponse.getGradeStats(departmentCode),
        SurveyResponse.getTrends(departmentCode),
        SurveyResponse.getDepartments()
      ]);

      const selectedDepartment = departmentCode 
        ? departments.find(d => d.department_code === departmentCode)
        : null;

      // Ensure data is properly initialized
      const viewData = {
        basicStats: basicStats || { total_responses: 0, average_score: 0, min_score: 0, max_score: 0 },
        themeScores: themeScores || [],
        roleStats: roleStats || [],
        gradeStats: gradeStats || [],
        trends: trends || [],
        departments: (departments || []).map(dept => ({
          value: dept.department_code,
          text: `${dept.organization_name} (${dept.response_count} responses)`,
          selected: selectedDepartment && selectedDepartment.department_code === dept.department_code
        })),
        selectedDepartment
      };

      res.render('analytics/dashboard', viewData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('analytics/dashboard', {
        error: 'Error loading dashboard data',
        basicStats: { total_responses: 0, average_score: 0, min_score: 0, max_score: 0 },
        themeScores: [],
        roleStats: [],
        gradeStats: [],
        trends: [],
        departments: [],
        selectedDepartment: null
      });
    }
  }

  static async handleLogout(req, res) {
    req.session.isAuthenticated = false;
    res.redirect('/analytics/login');
  }

  // Show the list of departments
  static async showDepartments(req, res) {
    try {
      const departments = await SurveyResponse.getDepartments();
      res.render('analytics/departments', { departments });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.render('analytics/departments', { error: 'Error loading departments' });
    }
  }

  // Show the dashboard for a specific department
  static async showDepartmentDashboard(req, res) {
    try {
      const departmentCode = req.params.departmentCode;
      const department = await SurveyResponse.getDepartmentByCode(departmentCode);
      const completionStats = await SurveyResponse.getCompletionStats(departmentCode);
      const scoreStats = await SurveyResponse.getScoreStats(departmentCode);
      const averageScore = await SurveyResponse.getAverageScore(departmentCode);
      const averageScorePerTheme = await SurveyResponse.getAverageScorePerTheme(departmentCode);
      const averageScorePerQuestion = await SurveyResponse.getAverageScorePerQuestion(departmentCode);

      console.log('Department:', department);
      console.log('Completion Stats:', completionStats);
      console.log('Score Stats:', scoreStats);
      console.log('Average Score:', averageScore);
      console.log('Average Score Per Theme:', averageScorePerTheme);
      console.log('Average Score Per Question:', averageScorePerQuestion);

      res.render('analytics/department-dashboard', {
        department,
        completionStats,
        scoreStats,
        averageScore,
        averageScorePerTheme,
        averageScorePerQuestion
      });
    } catch (error) {
      console.error('Error fetching department dashboard:', error);
      res.render('analytics/department-dashboard', {
        error: 'Error loading department dashboard',
        department: {},
        completionStats: { completed: 0, pending: 0 },
        scoreStats: {
          range_0_20: 0,
          range_21_40: 0,
          range_41_60: 0,
          range_61_80: 0,
          range_81_100: 0
        }
      });
    }
  }
}

module.exports = AnalyticsController; 