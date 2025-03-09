const Survey = require('../models/survey');
const Question = require('../models/question');
const Organization = require('../models/organization');

class SurveyController {
  static async showStartPage(req, res) {
    if (!req.session.data?.organization) {
      return res.redirect('/');
    }
    res.render('survey/start');
  }

  static async startSurvey(req, res) {
    try {
      if (!req.session.data?.organization) {
        return res.redirect('/');
      }

      // Create a new empty survey response
      const response = await Survey.createResponse(
        req.session.data.organization.analytics_identifier,
        req.session.data.organization.title
      );

      req.session.surveyId = response.id;
      res.redirect('/survey/questions');
    } catch (error) {
      console.error('Error starting survey:', error);
      res.render('survey/start', {
        error: 'Error starting survey. Please try again.'
      });
    }
  }

  static async showQuestions(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        return res.redirect('/survey/start');
      }

      const surveyResponse = await Survey.getResponse(req.session.surveyId);
      if (!surveyResponse) {
        return res.redirect('/survey/start');
      }

      const questions = Question.getAllQuestions();
      const ratingScale = Question.getRatingScale();

      res.render('survey/questions', {
        questions,
        ratingScale,
        answers: surveyResponse.answers || {},
        errors: req.session.errors || []
      });

      // Clear any errors from session
      delete req.session.errors;
    } catch (error) {
      console.error('Error showing questions:', error);
      res.render('survey/questions', {
        error: 'Error loading survey questions'
      });
    }
  }

  static async handleAnswers(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        return res.redirect('/survey/start');
      }

      const answers = req.body;
      const errors = Question.validateAnswers(answers);

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect('/survey/questions');
      }

      const questions = Question.getAllQuestions();
      const themeScores = await Survey.calculateThemeScores(answers, questions);
      const overallScore = Survey.calculateOverallScore(themeScores);

      await Survey.updateResponse(req.session.surveyId, {
        answers,
        theme_scores: themeScores,
        overall_score: overallScore
      });

      res.redirect('/survey/role-info');
    } catch (error) {
      console.error('Error saving answers:', error);
      req.session.errors = [{
        error: 'Error saving your answers. Please try again.'
      }];
      res.redirect('/survey/questions');
    }
  }

  static async showRoleInfo(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        return res.redirect('/survey/start');
      }

      const surveyResponse = await Survey.getResponse(req.session.surveyId);
      if (!surveyResponse) {
        return res.redirect('/survey/start');
      }

      res.render('survey/role-info', {
        roleInfo: {
          role: surveyResponse.role,
          grade: surveyResponse.grade,
          feedback: surveyResponse.feedback
        },
        errors: req.session.errors || []
      });

      // Clear any errors from session
      delete req.session.errors;
    } catch (error) {
      console.error('Error showing role info:', error);
      res.render('survey/role-info', {
        error: 'Error loading role information form'
      });
    }
  }

  static async handleRoleInfo(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        console.log('No survey ID or organization in session');
        return res.redirect('/survey/start');
      }

      const { role, grade, feedback, action } = req.body;
      console.log('Role info submitted:', { role, grade, feedback, action });
      console.log('Survey ID:', req.session.surveyId);

      // If they clicked skip, just mark as submitted without role info
      if (action === 'skip') {
        await Survey.submitResponse(req.session.surveyId, {
          role: null,
          grade: null,
          feedback: null
        });
      } else {
        // Save the role info
        await Survey.submitResponse(req.session.surveyId, {
          role: role?.trim() || null,
          grade: grade?.trim() || null,
          feedback: feedback?.trim() || null
        });
      }

      // Clear survey ID from session as it's now complete
      delete req.session.surveyId;

      res.redirect('/survey/submit');
    } catch (error) {
      console.error('Error saving role info:', error);
      req.session.errors = [{
        error: 'Error saving role information. Please try again.'
      }];
      res.redirect('/survey/role-info');
    }
  }

  static async showCheckAnswers(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        return res.redirect('/survey/start');
      }

      const surveyResponse = await Survey.getResponse(req.session.surveyId);
      if (!surveyResponse) {
        return res.redirect('/survey/start');
      }

      const questions = Question.getAllQuestions();

      res.render('survey/check-answers', {
        questions,
        answers: surveyResponse.answers || {},
        errors: req.session.errors || []
      });

      // Clear any errors from session
      delete req.session.errors;
    } catch (error) {
      console.error('Error showing check answers:', error);
      res.render('survey/check-answers', {
        error: 'Error loading answers for review'
      });
    }
  }

  static async showSubmit(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        return res.redirect('/survey/start');
      }

      const surveyResponse = await Survey.getResponse(req.session.surveyId);
      if (!surveyResponse) {
        return res.redirect('/survey/start');
      }

      res.render('survey/submit', {
        data: {
          organization: req.session.data.organization,
          role_info: {
            role: surveyResponse.role,
            grade: surveyResponse.grade,
            feedback: surveyResponse.feedback
          }
        }
      });
    } catch (error) {
      console.error('Error showing submit page:', error);
      res.render('survey/submit', {
        error: 'Error loading submission page'
      });
    }
  }

  static async handleSubmit(req, res) {
    try {
      if (!req.session.surveyId || !req.session.data?.organization) {
        console.log('No survey ID or organization in session');
        return res.redirect('/survey/start');
      }

      console.log('Submitting survey:', req.session.surveyId);

      const surveyResponse = await Survey.getResponse(req.session.surveyId);
      if (!surveyResponse) {
        return res.redirect('/survey/start');
      }

      // Submit the response with existing role info
      await Survey.submitResponse(req.session.surveyId, {
        role: surveyResponse.role,
        grade: surveyResponse.grade,
        feedback: surveyResponse.feedback
      });

      // Clear survey ID from session as it's now complete
      delete req.session.surveyId;

      res.redirect('/survey/complete');
    } catch (error) {
      console.error('Error submitting survey:', error);
      res.render('survey/submit', {
        errorMessage: 'Error submitting survey. Please try again.',
        data: {
          organization: req.session.data.organization
        }
      });
    }
  }

  static async showComplete(req, res) {
    res.render('survey/complete');
  }
}

module.exports = SurveyController; 