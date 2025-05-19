const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config(); // Add this to load environment variables

// Connect to your database with SSL disabled for local development
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // Only use SSL if connecting to a remote database that requires it
  ssl: process.env.DATABASE_URL.includes('localhost')
    ? false
    : {
        rejectUnauthorized: false,
      },
});

async function seedAdmin() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Delete existing admin
    await client.query(`DELETE FROM users WHERE role = 'admin'`);
    console.log('Deleted existing admin accounts');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Bo@3456_', salt);
    console.log('Password hashed');

    // Insert new admin
    const insertQuery = `
      INSERT INTO users (
        username, email, password, role, "isEmailVerified", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        'admin', 'admin@must.edu.mn', $1, 'admin', true, true, NOW(), NOW()
      ) RETURNING id;
    `;

    const result = await client.query(insertQuery, [hashedPassword]);
    console.log('Admin created with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await client.end();
  }
}

seedAdmin();
