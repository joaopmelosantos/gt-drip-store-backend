const { Sequelize } = require('sequelize');
const allConfigs = require('./config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = allConfigs[env] || allConfigs.development;

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
  }
);

module.exports = sequelize;
