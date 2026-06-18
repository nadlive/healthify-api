require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/sequelize');
const { QueryTypes } = require('sequelize');

async function seedAll() {
  try {
    await sequelize.authenticate();

    await sequelize.query('SET search_path TO healthify');

    const queryInterface = sequelize.getQueryInterface();
    queryInterface.sequelize = sequelize;
    queryInterface.sequelize.QueryTypes = QueryTypes;

    // Get all seeder files
    const seedersDir = path.join(__dirname, '../src/seeders');
    const files = fs
      .readdirSync(seedersDir)
      .filter((file) => file.endsWith('.js'))
      .sort();

    console.log(`Found ${files.length} seeder(s)`);

    for (const file of files) {
      const filePath = path.join(seedersDir, file);
      const seeder = require(filePath);

      console.log(`Seeding ${file}...`);

      try {
        // Handle different seeder formats
        if (typeof seeder === 'function') {
          await seeder(queryInterface, sequelize);
        } else if (typeof seeder.up === 'function') {
          await seeder.up(queryInterface, sequelize);
        } else if (Array.isArray(seeder)) {
          // Array must contain {table, data} objects
          if (seeder.length > 0 && seeder[0].table && seeder[0].data) {
            for (const item of seeder) {
              await queryInterface.bulkInsert(item.table, item.data, {});
              console.log(
                `Inserted ${item.data.length} records into ${item.table}`,
              );
            }
          } else {
            console.log(
              `Skipping ${file} - array must contain {table, data} objects`,
            );
          }
        } else if (seeder.data && seeder.table) {
          await queryInterface.bulkInsert(seeder.table, seeder.data, {});
          console.log(
            `Inserted ${seeder.data.length} records into ${seeder.table}`,
          );
        } else if (seeder.model && seeder.data) {
          const { SubscriptionPlan } = require('../src/models');
          for (const item of seeder.data) {
            const where = seeder.where
              ? seeder.where(item)
              : { id: item.id || item.name };
            const [instance, created] = await SubscriptionPlan.findOrCreate({
              where,
              defaults: item,
            });
            if (!created) {
              await instance.update(item);
            }
          }
          console.log(
            `Seeded ${seeder.data.length} records using ${seeder.model}`,
          );
        } else {
          console.log(`Skipping ${file} - unknown format`);
        }
      } catch (error) {
        if (
          error.name === 'SequelizeUniqueConstraintError' ||
          error.parent?.code === '23505'
        ) {
          console.log(`Skipping ${file} - data already exists`);
        } else {
          console.error(`Error in ${file}:`, error.message);
          throw error;
        }
      }
    }

    console.log('All seeders completed');
  } catch (error) {
    console.error('Error running seeders:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seedAll()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAll;
