const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

let activePool = null;
let activeIsPg = false;

function repairConnectionString(url) {
    if (!url) return '';
    // If password contains unencoded '@', encode it automatically
    // Matches postgres://user:password_with_at@host:port/db
    const lastAt = url.lastIndexOf('@');
    const firstColonAfterProto = url.indexOf(':', url.indexOf('://') + 3);
    if (firstColonAfterProto !== -1 && lastAt !== -1 && lastAt > firstColonAfterProto) {
        const protoAndUser = url.substring(0, firstColonAfterProto + 1);
        const rawPass = url.substring(firstColonAfterProto + 1, lastAt);
        const hostAndRest = url.substring(lastAt);
        // Only encode if rawPass actually contains '@' or unencoded special chars
        if (rawPass.includes('@')) {
            const encodedPass = encodeURIComponent(rawPass);
            return protoAndUser + encodedPass + hostAndRest;
        }
    }
    return url;
}

function getPool() {
    if (activePool) return { pool: activePool, isPg: activeIsPg };

    const rawDbUrl = (process.env.DATABASE_URL || '').trim();
    const dbUrl = repairConnectionString(rawDbUrl);
    const dbHost = (process.env.DB_HOST || '').trim();
    const dbPort = String(process.env.DB_PORT || '').trim();

    const isPg = Boolean(
        dbUrl ||
        dbHost.includes('supabase') ||
        dbHost.includes('neon') ||
        dbHost.includes('postgres') ||
        dbPort === '5432' ||
        dbPort === '6543' ||
        process.env.DB_TYPE === 'postgres'
    );

    activeIsPg = isPg;

    if (isPg) {
        console.log('🐘 Initializing PostgreSQL / Supabase connection pool...');
        const pgConfig = dbUrl ? {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        } : {
            host: dbHost,
            port: parseInt(dbPort || '5432', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'postgres',
            ssl: { rejectUnauthorized: false }
        };

        const pgPool = new Pool(pgConfig);

        activePool = {
            isPg: true,
            query: async (sql, params = []) => {
                let paramIndex = 1;
                let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                pgSql = pgSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

                if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                    pgSql += ' RETURNING id';
                }

                const rawRes = await pgPool.query(pgSql, params);
                const res = Array.isArray(rawRes) ? (rawRes[rawRes.length - 1] || {}) : (rawRes || {});
                const rows = Array.isArray(res.rows) ? res.rows : [];
                const insertId = rows.length > 0 && rows[0] && rows[0].id !== undefined ? rows[0].id : null;
                const resultHeader = { insertId, rowCount: res.rowCount || 0 };
                return [rows, resultHeader];
            },
            getConnection: async () => {
                const client = await pgPool.connect();
                return {
                    beginTransaction: async () => client.query('BEGIN'),
                    commit: async () => client.query('COMMIT'),
                    rollback: async () => client.query('ROLLBACK'),
                    release: () => client.release(),
                    query: async (sql, params = []) => {
                        let paramIndex = 1;
                        let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                        pgSql = pgSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

                        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                            pgSql += ' RETURNING id';
                        }

                        const rawRes = await client.query(pgSql, params);
                        const res = Array.isArray(rawRes) ? (rawRes[rawRes.length - 1] || {}) : (rawRes || {});
                        const rows = Array.isArray(res.rows) ? res.rows : [];
                        const insertId = rows.length > 0 && rows[0] && rows[0].id !== undefined ? rows[0].id : null;
                        const resultHeader = { insertId, rowCount: res.rowCount || 0 };
                        return [rows, resultHeader];
                    }
                };
            }
        };
    } else {
        console.log('🐬 Initializing MySQL connection pool...');
        const mysqlPool = mysql.createPool({
            host: dbHost || 'localhost',
            port: parseInt(dbPort || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mock_exam_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: (process.env.DB_SSL === 'true' || (dbHost && dbHost !== 'localhost' && dbHost !== '127.0.0.1'))
                ? { rejectUnauthorized: false }
                : undefined
        });

        activePool = {
            isPg: false,
            query: async (sql, params) => {
                const res = await mysqlPool.query(sql, params);
                const rows = Array.isArray(res[0]) ? res[0] : [];
                return [rows, res[1]];
            },
            getConnection: async () => {
                const conn = await mysqlPool.getConnection();
                return {
                    beginTransaction: async () => conn.beginTransaction(),
                    commit: async () => conn.commit(),
                    rollback: async () => conn.rollback(),
                    release: () => conn.release(),
                    query: async (sql, params) => {
                        const res = await conn.query(sql, params);
                        const rows = Array.isArray(res[0]) ? res[0] : [];
                        return [rows, res[1]];
                    }
                };
            }
        };
    }

    return { pool: activePool, isPg: activeIsPg };
}

module.exports = {
    get isPg() {
        return getPool().isPg;
    },
    query: async (...args) => {
        return getPool().pool.query(...args);
    },
    getConnection: async () => {
        return getPool().pool.getConnection();
    }
};
