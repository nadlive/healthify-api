const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool to connect to the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Set schema search path
pool.on('connect', (client) => {
  client.query(`SET search_path TO evercare, public`);
});

module.exports = pool;
