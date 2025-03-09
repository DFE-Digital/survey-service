const fs = require('fs');
const path = require('path');

class Question {
  static #surveyData = null;
  static #ratingScale = null;

  static loadSurveyData() {
    if (!this.#surveyData) {
      const questionsPath = path.join(__dirname, '../data/questions.json');
      const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
      this.#surveyData = data.survey;
      this.#ratingScale = data.scoring.rating_scale;
    }
    return {
      survey: this.#surveyData,
      ratingScale: this.#ratingScale
    };
  }

  static getThemes() {
    const { survey } = this.loadSurveyData();
    return survey.themes;
  }

  static getRatingScale() {
    const { ratingScale } = this.loadSurveyData();
    return ratingScale;
  }

  static getAllQuestions() {
    const { survey } = this.loadSurveyData();
    return survey.themes.flatMap(theme => 
      theme.questions.map(q => ({
        ...q,
        theme_name: theme.theme_name,
        theme_id: theme.theme_id
      }))
    );
  }

  static getQuestionById(questionId) {
    const { survey } = this.loadSurveyData();
    for (const theme of survey.themes) {
      const question = theme.questions.find(q => q.question_id === parseInt(questionId));
      if (question) {
        return {
          ...question,
          theme_name: theme.theme_name,
          theme_id: theme.theme_id
        };
      }
    }
    return null;
  }

  static validateAnswers(answers) {
    const questions = this.getAllQuestions();
    const ratingScale = this.getRatingScale();
    const validScores = ratingScale.map(r => r.value);
    const errors = [];

    // Check that all required questions are answered
    for (const question of questions) {
      const answer = answers[question.question_id];
      if (question.required && !answer) {
        errors.push({
          questionId: question.question_id,
          error: 'This question requires an answer'
        });
      }
    }

    // Validate answer values
    for (const [questionId, score] of Object.entries(answers)) {
      const numericScore = parseInt(score);
      if (isNaN(numericScore) || !validScores.includes(numericScore)) {
        errors.push({
          questionId: parseInt(questionId),
          error: 'Invalid score value'
        });
      }
    }

    return errors;
  }
}

module.exports = Question; 