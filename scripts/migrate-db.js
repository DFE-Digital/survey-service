require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');

async function migrateDatabase() {
  const db = knex(config.development);

  try {
    // Run migrations
    await db.migrate.latest();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await db.destroy();
  }
}

migrateDatabase(); 