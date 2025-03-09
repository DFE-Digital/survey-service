require('dotenv').config();
const { Client } = require('pg');
const knex = require('knex');
const config = require('../knexfile');

async function setupDatabase() {
  // First connect to postgres database to create/drop our database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();

    // Terminate existing connections
    console.log('Terminating existing connections...');
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'MaturitySurvey'
        AND pid <> pg_backend_pid();
    `);

    // Drop database if it exists
    console.log('Dropping existing database...');
    await client.query('DROP DATABASE IF EXISTS "MaturitySurvey"');

    // Create fresh database
    console.log('Creating new database...');
    await client.query('CREATE DATABASE "MaturitySurvey"');

    // Close postgres connection
    await client.end();

    // Connect to our new database using knex
    console.log('Running migrations...');
    const db = knex(config.development);
    await db.migrate.latest();
    
    console.log('Database setup completed successfully!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 