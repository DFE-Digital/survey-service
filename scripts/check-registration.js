const db = require('../app/db');

async function checkRegistration() {
  try {
    const registration = await db('registration_requests')
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
      .first();
    
    console.log('Latest pending registration:', registration);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRegistration(); 