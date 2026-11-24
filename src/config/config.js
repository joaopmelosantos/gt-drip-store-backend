require('dotenv').config();

const commonConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME || 'drip_store',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

module.exports = {
  development: { ...commonConfig },
  test: {
    ...commonConfig,
    database: process.env.DB_NAME_TEST || `${commonConfig.database}_test`,
  },
  production: { ...commonConfig },
};
