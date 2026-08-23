const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

const dbHost = process.env.DB_HOST || '';
const dbUrl = process.env.DATABASE_URL || '';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

const isPg = dbUrl.startsWith('postgres') ||
    dbUrl.startsWith('postgresql') ||
    dbHost.includes('supabase') ||
    dbHost.includes('neon') ||
    dbPort === 5432 ||
    dbPort === 6543 ||
    process.env.DB_TYPE === 'postgres';

let pool;

if (isPg) {
    console.log('🐘 Initializing PostgreSQL / Supabase connection pool...');
    const pgConfig = dbUrl ? {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    } : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: { rejectUnauthorized: false }
    };

    const pgPool = new Pool(pgConfig);

    pool = {
        isPg: true,
        query: async (sql, params = []) => {
            let paramIndex = 1;
            let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

            // Handle MySQL ON DUPLICATE KEY UPDATE / JSON / NOW() syntax adaptations if needed
            pgSql = pgSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

            // Handle AUTO_INCREMENT / insertId compatibility
            if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                pgSql += ' RETURNING id';
            }

            const res = await pgPool.query(pgSql, params);
            const insertId = res.rows.length > 0 && res.rows[0].id !== undefined ? res.rows[0].id : null;
            const resultHeader = { insertId, rowCount: res.rowCount };
            return [res.rows, resultHeader];
        }
    };
} else {
    console.log('🐬 Initializing MySQL connection pool...');
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: dbPort,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mock_exam_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: (process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
            ? { rejectUnauthorized: false }
            : undefined
    });
}

module.exports = pool;
