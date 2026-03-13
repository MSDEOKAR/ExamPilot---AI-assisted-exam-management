const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// POST /api/exams — Create exam
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, duration, total_questions, negative_marking, marks_per_question, scheduled_at } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Exam title is required' });
        }

        const result = await pool.query(
            `INSERT INTO exams (title, description, duration, total_questions, negative_marking, marks_per_question, status, scheduled_at, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8) RETURNING id`,
            [title, description || '', duration || 60, total_questions || 10, negative_marking || 0, marks_per_question || 1, scheduled_at || null, req.admin.id]
        );

        res.status(201).json({
            id: result.rows[0].id,
            title,
            duration: duration || 60,
            total_questions: total_questions || 10,
            negative_marking: negative_marking || 0,
            marks_per_question: marks_per_question || 1,
            status: 'draft'
        });
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/exams — List all exams
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
        (SELECT COUNT(*) FROM results WHERE exam_id = e.id) as attempt_count
      FROM exams e ORDER BY e.created_at DESC
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('List exams error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/exams/:id — Get exam details with questions
router.get('/:id', async (req, res) => {
    try {
        const exams = await pool.query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
        if (exams.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const exam = exams.rows[0];
        const questions = await pool.query(
            'SELECT * FROM questions WHERE exam_id = $1 ORDER BY question_order, id', [exam.id]
        );

        for (let q of questions.rows) {
            const opts = await pool.query(
                'SELECT * FROM options WHERE question_id = $1 ORDER BY option_order', [q.id]
            );
            q.options = opts.rows;
        }

        exam.questions = questions.rows;
        res.json(exam);
    } catch (error) {
        console.error('Get exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/exams/:id — Update exam
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, description, duration, total_questions, negative_marking, marks_per_question, status, scheduled_at } = req.body;

        await pool.query(
            `UPDATE exams SET title = $1, description = $2, duration = $3, total_questions = $4, 
       negative_marking = $5, marks_per_question = $6, status = $7, scheduled_at = $8 WHERE id = $9`,
            [title, description, duration, total_questions, negative_marking || 0, marks_per_question || 1, status || 'draft', scheduled_at || null, req.params.id]
        );

        res.json({ message: 'Exam updated successfully' });
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/exams/:id/start — Activate exam
router.post('/:id/start', authMiddleware, async (req, res) => {
    try {
        const questions = await pool.query('SELECT COUNT(*) as count FROM questions WHERE exam_id = $1', [req.params.id]);
        if (parseInt(questions.rows[0].count) === 0) {
            return res.status(400).json({ error: 'Cannot start exam with no questions' });
        }

        await pool.query("UPDATE exams SET status = 'active' WHERE id = $1", [req.params.id]);
        res.json({ message: 'Exam is now active' });
    } catch (error) {
        console.error('Start exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/exams/:id/complete — Complete exam
router.post('/:id/complete', authMiddleware, async (req, res) => {
    try {
        await pool.query("UPDATE exams SET status = 'completed' WHERE id = $1", [req.params.id]);
        res.json({ message: 'Exam marked as completed' });
    } catch (error) {
        console.error('Complete exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/exams/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM exams WHERE id = $1', [req.params.id]);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/exams/:id/add-questions — Add questions to exam
router.post('/:id/add-questions', authMiddleware, async (req, res) => {
    try {
        const { question_ids } = req.body;
        if (!question_ids || !Array.isArray(question_ids)) {
            return res.status(400).json({ error: 'question_ids array is required' });
        }

        for (const qid of question_ids) {
            await pool.query('UPDATE questions SET exam_id = $1 WHERE id = $2', [req.params.id, qid]);
        }

        res.json({ message: `${question_ids.length} questions added to exam` });
    } catch (error) {
        console.error('Add questions error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
