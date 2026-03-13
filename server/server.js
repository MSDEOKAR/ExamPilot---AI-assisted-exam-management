const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/students', require('./routes/students'));
app.use('/api/results', require('./routes/results'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database init endpoint (call once to setup)
app.post('/api/init-db', async (req, res) => {
    try {
        const pool = require('./config/db');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                duration INT NOT NULL DEFAULT 60,
                total_questions INT NOT NULL DEFAULT 10,
                negative_marking DECIMAL(3,2) DEFAULT 0.00,
                marks_per_question DECIMAL(3,2) DEFAULT 1.00,
                status VARCHAR(20) DEFAULT 'draft',
                scheduled_at TIMESTAMP,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                exam_id INT,
                question_text TEXT,
                question_image VARCHAR(500),
                ocr_text TEXT,
                difficulty VARCHAR(20) DEFAULT 'medium',
                tags VARCHAR(500),
                question_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS options (
                id SERIAL PRIMARY KEY,
                question_id INT NOT NULL,
                option_text TEXT,
                option_image VARCHAR(500),
                is_correct BOOLEAN DEFAULT FALSE,
                option_order INT DEFAULT 0,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                email VARCHAR(200) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS results (
                id SERIAL PRIMARY KEY,
                student_id INT NOT NULL,
                exam_id INT NOT NULL,
                score DECIMAL(6,2) DEFAULT 0,
                total_marks DECIMAL(6,2) DEFAULT 0,
                correct_count INT DEFAULT 0,
                wrong_count INT DEFAULT 0,
                unanswered_count INT DEFAULT 0,
                answers JSONB,
                started_at TIMESTAMP,
                submitted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);
        
        // Insert default admin if not exists
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(`
            INSERT INTO admins (username, password) 
            VALUES ('admin', $1)
            ON CONFLICT (username) DO NOTHING
        `, [hashedPassword]);
        
        res.json({ message: 'Database initialized successfully!' });
    } catch (error) {
        console.error('Init DB error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Mock Exam Server running on http://localhost:${PORT}`);
});
