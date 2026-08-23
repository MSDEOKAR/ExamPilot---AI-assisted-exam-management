const mysql = require('mysql2/promise');
const { Client } = require('pg');
const dns = require('dns').promises;
require('dotenv').config();

async function testDatabaseConnection() {
    const dbUrl = process.env.DATABASE_URL || '';
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'mock_exam_db';

    const isPg = dbUrl.startsWith('postgres') ||
        dbUrl.startsWith('postgresql') ||
        host.includes('supabase') ||
        host.includes('neon') ||
        port === 5432 ||
        port === 6543 ||
        process.env.DB_TYPE === 'postgres';

    console.log('🔍 Testing Database Connection Setup:');
    console.log(`- Type: ${isPg ? 'PostgreSQL / Supabase' : 'MySQL'}`);
    if (dbUrl) {
        console.log(`- Connection String: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
    } else {
        console.log(`- Host: ${host}`);
        console.log(`- Port: ${port}`);
        console.log(`- User: ${user}`);
        console.log(`- Database: ${database}`);
    }
    console.log('--------------------------------------------------');

    const targetHost = dbUrl ? (new URL(dbUrl.replace('postgres://', 'http://').replace('postgresql://', 'http://'))).hostname : host;

    if (targetHost && targetHost !== 'localhost' && targetHost !== '127.0.0.1') {
        console.log(`📡 Resolving DNS for ${targetHost}...`);
        try {
            const addresses = await dns.lookup(targetHost);
            console.log(`✅ DNS resolved successfully: IP ${addresses.address}`);
        } catch (dnsErr) {
            console.error(`❌ DNS Lookup Failed (${dnsErr.code}): Host '${targetHost}' does not exist.`);
            process.exit(1);
        }
    }

    try {
        if (isPg) {
            console.log(`🔌 Attempting PostgreSQL connection...`);
            const client = new Client(dbUrl ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } } : {
                host, port: parseInt(process.env.DB_PORT || '5432', 10), user, password, database: database || 'postgres', ssl: { rejectUnauthorized: false }
            });
            await client.connect();
            console.log(`✅ PostgreSQL Connection Successful!`);
            await client.query('SELECT 1');
            console.log(`✅ Database ping test passed.`);
            await client.end();
        } else {
            console.log(`🔌 Attempting MySQL connection...`);
            const connection = await mysql.createConnection({
                host, port, user, password, database,
                ssl: (process.env.DB_SSL === 'true' || (host && host !== 'localhost' && host !== '127.0.0.1')) ? { rejectUnauthorized: false } : undefined
            });
            console.log(`✅ MySQL Connection Successful!`);
            await connection.query('SELECT 1');
            console.log(`✅ Database ping test passed.`);
            await connection.end();
        }
        process.exit(0);
    } catch (err) {
        console.error(`❌ Database Connection Error: ${err.message}`);
        console.error(`   Code: ${err.code || 'UNKNOWN'}`);
        process.exit(1);
    }
}

testDatabaseConnection();
