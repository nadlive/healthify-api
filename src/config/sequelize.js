const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create a sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    schema: 'healthify',
    define: {
      schema: 'healthify',
    },
  },
);

module.exports = sequelize;
