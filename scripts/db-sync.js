require('dotenv').config();
const sequelize = require('../src/config/sequelize');
const { User, Patient } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();

    await sequelize.query('CREATE SCHEMA IF NOT EXISTS healthify');

    // Sync identity tables first
    await User.sync({ alter: true });
    await Patient.sync({ alter: true });

    // Then sync all other models
    await sequelize.sync({ alter: true });

    console.log('Database synced successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
