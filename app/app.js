const express = require('express');
const nunjucks = require('nunjucks');
const filters = require('./filters');
const orgRoutes = require('./routes/org');

const app = express();

// Configure Nunjucks
const nunjucksEnv = nunjucks.configure('app/views', {
  autoescape: true,
  express: app
});

// Add filters
filters(nunjucksEnv);

app.use('/org', orgRoutes); 