const mysql = require('mysql2/promise');
const dns = require('dns').promises;
require('dotenv').config();

async function testDatabaseConnection() {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'mock_exam_db';
    const ssl = (process.env.DB_SSL === 'true' || (host && host !== 'localhost' && host !== '127.0.0.1'))
        ? { rejectUnauthorized: false }
        : undefined;

    console.log('🔍 Testing Database Connection Setup:');
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- User: ${user}`);
    console.log(`- Database: ${database}`);
    console.log(`- SSL: ${ssl ? 'Enabled' : 'Disabled'}`);
    console.log('--------------------------------------------------');

    if (host !== 'localhost' && host !== '127.0.0.1') {
        console.log(`📡 Resolving DNS for ${host}...`);
        try {
            const addresses = await dns.lookup(host);
            console.log(`✅ DNS resolved successfully: IP ${addresses.address}`);
        } catch (dnsErr) {
            console.error(`❌ DNS Lookup Failed (getaddrinfo ENOTFOUND):`);
            console.error(`   Host '${host}' does not exist or has expired.`);
            console.error(`\n👉 Solution:`);
            console.error(`   1. Verify if your cloud database (Aiven / Railway / etc.) is running.`);
            console.error(`   2. Get your active database Host, User, Password, Port, and Database name.`);
            console.error(`   3. Update your server/.env locally or Environment Variables on Render dashboard.`);
            process.exit(1);
        }
    }

    try {
        console.log(`🔌 Attempting MySQL connection...`);
        const connection = await mysql.createConnection({ host, port, user, password, database, ssl });
        console.log(`✅ MySQL Connection Successful!`);
        await connection.query('SELECT 1');
        console.log(`✅ Database ping test passed.`);
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error(`❌ Database Connection Error: ${err.message}`);
        console.error(`   Code: ${err.code || 'UNKNOWN'}`);
        process.exit(1);
    }
}

testDatabaseConnection();
