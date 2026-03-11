const bcrypt = require('bcryptjs');
const pool = require('./config/db');
require('dotenv').config();

async function seed() {
    try {
        const password = await bcrypt.hash('admin123', 10);

        // Delete existing admin and re-insert with correct hash
        await pool.query('DELETE FROM admins WHERE username = ?', ['admin']);
        await pool.query(
            'INSERT INTO admins (username, password) VALUES (?, ?)',
            ['admin', password]
        );

        console.log('✅ Admin account created successfully!');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        process.exit(1);
    }
}

seed();
