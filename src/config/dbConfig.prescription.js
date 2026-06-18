const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool to connect to the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE || process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Set schema search path
pool.on('connect', (client) => {
  client.query(`SET search_path TO prescription, public`);
});

module.exports = pool;
