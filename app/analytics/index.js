function sendGAEvent(req, eventName, params = {}) {
  if (!req.session.data.cookies_policy?.analytics) {
    return;
  }

  // Initialize dataLayer array in session if it doesn't exist
  if (!req.session.data.dataLayer) {
    req.session.data.dataLayer = [];
  }

  // Add event to session dataLayer
  req.session.data.dataLayer.push({
    event: eventName,
    ...params
  });
}

function trackSurveyStart(req) {
  const { organization } = req.session.data;
  
  sendGAEvent(req, 'survey_start', {
    department_code: organization.code,
    department_name: organization.title,
    timestamp: new Date().toISOString()
  });
}

function trackSurveyCompletion(req, themeScores, overallScore) {
  const { organization, survey_start_time } = req.session.data;
  const timeTaken = Date.now() - new Date(survey_start_time).getTime();
  
  sendGAEvent(req, 'survey_complete', {
    department_code: organization.code,
    department_name: organization.title,
    overall_score: overallScore,
    theme_scores: themeScores,
    time_taken_ms: timeTaken,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  sendGAEvent,
  trackSurveyStart,
  trackSurveyCompletion
}; 