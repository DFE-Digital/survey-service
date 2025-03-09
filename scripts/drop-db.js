require('dotenv').config();
const { Client } = require('pg');

async function dropDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();

    // Terminate all connections to the database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'MaturitySurvey'
        AND pid <> pg_backend_pid();
    `);

    // Drop the database
    await client.query('DROP DATABASE IF EXISTS "MaturitySurvey"');
    console.log('Database dropped successfully');
  } catch (error) {
    console.error('Error dropping database:', error);
  } finally {
    await client.end();
  }
}

dropDatabase(); 