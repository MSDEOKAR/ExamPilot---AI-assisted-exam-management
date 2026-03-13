const { Pool } = require('pg');
require('dotenv').config();

let poolConfig = {};

if (process.env.DATABASE_URL) {
    // Railway/Heroku style - single connection string
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
} else {
    // Local/Manual config
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mock_exam_db',
        port: process.env.DB_PORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
}

const pool = new Pool(poolConfig);

module.exports = pool;
