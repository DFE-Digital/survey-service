require('dotenv').config();
const { Client } = require('pg');
const knex = require('knex');
const config = require('../knexfile');

async function resetDatabase() {
  // Connect to postgres to drop/create database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    
    // Terminate all connections to our database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'MaturitySurvey'
        AND pid <> pg_backend_pid();
    `);
    
    // Drop and recreate database
    await client.query('DROP DATABASE IF EXISTS "MaturitySurvey"');
    await client.query('CREATE DATABASE "MaturitySurvey"');
    
    console.log('Database reset successfully');
    await client.end();

    // Connect to our database
    const db = knex(config.development);

    // Run migrations
    await db.migrate.latest();
    console.log('Migrations completed successfully');
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetDatabase(); 