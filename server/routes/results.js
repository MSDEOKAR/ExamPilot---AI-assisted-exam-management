const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/results/exam/:examId — All results for an exam (admin)
router.get('/exam/:examId', authMiddleware, async (req, res) => {
    try {
        const [results] = await pool.query(`
      SELECT r.*, s.name as student_name, s.email as student_email, e.title as exam_title
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN exams e ON r.exam_id = e.id
      WHERE r.exam_id = ?
      ORDER BY r.score DESC
    `, [req.params.examId]);

        res.json(results);
    } catch (error) {
        console.error('List results error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/results/:id — Single result detail with answer review
router.get('/:id', async (req, res) => {
    try {
        const [results] = await pool.query(`
      SELECT r.*, s.name as student_name, s.email as student_email, e.title as exam_title, e.negative_marking, e.marks_per_question
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN exams e ON r.exam_id = e.id
      WHERE r.id = ?
    `, [req.params.id]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }

        const result = results[0];

        const [questions] = await pool.query(
            'SELECT * FROM questions WHERE exam_id = ? ORDER BY question_order, id',
            [result.exam_id]
        );

        for (let q of questions) {
            const [opts] = await pool.query(
                'SELECT * FROM options WHERE question_id = ? ORDER BY option_order', [q.id]
            );
            q.options = opts;
        }

        result.questions = questions;
        if (typeof result.answers === 'string') {
            result.answers = JSON.parse(result.answers);
        }

        res.json(result);
    } catch (error) {
        console.error('Get result error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/results/stats/dashboard — Dashboard stats (admin)
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
    try {
        const [examCount] = await pool.query('SELECT COUNT(*) as count FROM exams');
        const [questionCount] = await pool.query('SELECT COUNT(*) as count FROM questions');
        const [studentCount] = await pool.query('SELECT COUNT(DISTINCT student_id) as count FROM results');
        const [resultCount] = await pool.query('SELECT COUNT(*) as count FROM results');
        const [avgScore] = await pool.query('SELECT AVG(score) as avg_score, AVG(correct_count) as avg_correct FROM results');
        const [recentResults] = await pool.query(`
      SELECT r.*, s.name as student_name, e.title as exam_title
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN exams e ON r.exam_id = e.id
      ORDER BY r.created_at DESC LIMIT 5
    `);

        res.json({
            total_exams: examCount[0].count,
            total_questions: questionCount[0].count,
            total_students: studentCount[0].count,
            total_attempts: resultCount[0].count,
            avg_score: avgScore[0].avg_score ? parseFloat(avgScore[0].avg_score).toFixed(2) : 0,
            avg_correct: avgScore[0].avg_correct ? parseFloat(avgScore[0].avg_correct).toFixed(1) : 0,
            recent_results: recentResults
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
