const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'girumsurvey',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin'
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
