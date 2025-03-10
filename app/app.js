const express = require('express');
const nunjucks = require('nunjucks');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const filters = require('./filters');
const orgRoutes = require('./routes/org');
const db = require('./db');

const app = express();

// Configure sessions with PostgreSQL storage
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'DEV-SECRET-KEY',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 180 * 24 * 60 * 60 * 1000 // 180 days (6 months)
  }
}));

// Configure Nunjucks
const nunjucksEnv = nunjucks.configure('app/views', {
  autoescape: true,
  express: app
});

// Add filters
filters(nunjucksEnv);

app.use('/org', orgRoutes); 