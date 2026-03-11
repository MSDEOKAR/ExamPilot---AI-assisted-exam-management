const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/students/register — Register student for exam
router.post('/register', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if student already exists
        const [existing] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.json({ id: existing[0].id, name: existing[0].name, email: existing[0].email });
        }

        const [result] = await pool.query(
            'INSERT INTO students (name, email) VALUES (?, ?)',
            [name, email]
        );

        res.status(201).json({ id: result.insertId, name, email });
    } catch (error) {
        console.error('Register student error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/students/exams — Get available active exams
router.get('/exams', async (req, res) => {
    try {
        const [exams] = await pool.query(`
      SELECT e.id, e.title, e.description, e.duration, e.total_questions, e.negative_marking, e.marks_per_question, e.status,
        (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
      FROM exams e 
      WHERE e.status = 'active' 
      ORDER BY e.created_at DESC
    `);
        res.json(exams);
    } catch (error) {
        console.error('List exams error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/students/exams/:id/take — Get exam questions for taking
router.get('/exams/:id/take', async (req, res) => {
    try {
        const { student_id } = req.query;

        const [exams] = await pool.query('SELECT * FROM exams WHERE id = ? AND status = ?', [req.params.id, 'active']);
        if (exams.length === 0) {
            return res.status(404).json({ error: 'Exam not found or not active' });
        }

        // Check if student already submitted this exam
        if (student_id) {
            const [existingResult] = await pool.query(
                'SELECT * FROM results WHERE student_id = ? AND exam_id = ?', [student_id, req.params.id]
            );
            if (existingResult.length > 0) {
                return res.status(400).json({ error: 'You have already taken this exam', result_id: existingResult[0].id });
            }
        }

        const exam = exams[0];
        const [questions] = await pool.query(
            'SELECT id, question_text, question_image, ocr_text FROM questions WHERE exam_id = ? ORDER BY question_order, id',
            [exam.id]
        );

        for (let q of questions) {
            const [opts] = await pool.query(
                'SELECT id, option_text, option_image, option_order FROM options WHERE question_id = ? ORDER BY option_order',
                [q.id]
            );
            q.options = opts;
        }

        res.json({
            exam: {
                id: exam.id,
                title: exam.title,
                description: exam.description,
                duration: exam.duration,
                total_questions: exam.total_questions,
                negative_marking: parseFloat(exam.negative_marking),
                marks_per_question: parseFloat(exam.marks_per_question)
            },
            questions
        });
    } catch (error) {
        console.error('Take exam error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/students/exams/:id/submit — Submit exam answers
router.post('/exams/:id/submit', async (req, res) => {
    try {
        const { student_id, answers, started_at } = req.body;
        // answers format: { "question_id": selected_option_id, ... }

        if (!student_id || !answers) {
            return res.status(400).json({ error: 'student_id and answers are required' });
        }

        // Check if student exists (foreign key safety)
        const [students] = await pool.query('SELECT id FROM students WHERE id = ?', [student_id]);
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student profile not found. Please register again.' });
        }

        // Check for duplicate submission
        const [existingResult] = await pool.query(
            'SELECT * FROM results WHERE student_id = ? AND exam_id = ?', [student_id, req.params.id]
        );
        if (existingResult.length > 0) {
            return res.status(400).json({ error: 'You have already submitted this exam.', result_id: existingResult[0].id });
        }

        // Get exam details
        const [exams] = await pool.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (exams.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const exam = exams[0];

        // Get all questions with correct options
        const [questions] = await pool.query(
            'SELECT q.id, o.id as correct_option_id FROM questions q JOIN options o ON q.id = o.question_id WHERE q.exam_id = ? AND o.is_correct = 1',
            [req.params.id]
        );

        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;
        const detailedAnswers = {};

        // Get all questions for the exam
        const [allQuestions] = await pool.query('SELECT id FROM questions WHERE exam_id = ?', [req.params.id]);

        for (const q of allQuestions) {
            const questionId = q.id.toString();
            const selectedOptionId = answers[questionId];
            const correctOption = questions.find(cq => cq.id === q.id);

            if (!selectedOptionId || selectedOptionId === null) {
                unansweredCount++;
                detailedAnswers[questionId] = { selected: null, correct: correctOption ? correctOption.correct_option_id : null, status: 'unanswered' };
            } else if (correctOption && parseInt(selectedOptionId) === correctOption.correct_option_id) {
                correctCount++;
                detailedAnswers[questionId] = { selected: parseInt(selectedOptionId), correct: correctOption.correct_option_id, status: 'correct' };
            } else if (correctOption) {
                // Only count as wrong if a correct option actually exists in DB
                wrongCount++;
                detailedAnswers[questionId] = { selected: parseInt(selectedOptionId), correct: correctOption.correct_option_id, status: 'wrong' };
            } else {
                // If system is missing the correct answer key, don't penalize student
                unansweredCount++;
                detailedAnswers[questionId] = { selected: parseInt(selectedOptionId), correct: null, status: 'key_missing' };
            }
        }

        const marksPerQuestion = parseFloat(exam.marks_per_question) || 1;
        const negativeMarking = parseFloat(exam.negative_marking) || 0;
        const score = (correctCount * marksPerQuestion) - (wrongCount * negativeMarking);
        const totalMarks = allQuestions.length * marksPerQuestion;

        let finalScore = Math.max(0, score);
        if (isNaN(finalScore)) finalScore = 0;
        let finalTotalMarks = totalMarks;
        if (isNaN(finalTotalMarks)) finalTotalMarks = allQuestions.length * 1; // Fallback

        const [result] = await pool.query(
            `INSERT INTO results (student_id, exam_id, score, total_marks, correct_count, wrong_count, unanswered_count, answers, started_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [student_id, req.params.id, finalScore, finalTotalMarks, correctCount, wrongCount, unansweredCount, JSON.stringify(detailedAnswers), started_at ? new Date(started_at).toISOString().slice(0, 19).replace('T', ' ') : null]
        );

        res.json({
            result_id: result.insertId,
            score: Math.max(0, score),
            total_marks: totalMarks,
            correct_count: correctCount,
            wrong_count: wrongCount,
            unanswered_count: unansweredCount,
            percentage: totalMarks > 0 ? ((Math.max(0, score) / totalMarks) * 100).toFixed(2) : 0,
            negative_marks_deducted: wrongCount * negativeMarking
        });
    } catch (error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            exam_id: req.params.id,
            student_id: req.body?.student_id,
            body: req.body
        };
        require('fs').appendFileSync(path.join(__dirname, '../submission_error.log'), JSON.stringify(errorLog, null, 2) + '\n---\n');

        console.error('--- SUBMIT EXAM ERROR DEBUG ---');
        console.error('Error Details:', error);
        console.error('Exam ID:', req.params.id);
        console.error('Student ID:', req.body?.student_id);

        // Use try-catch or optional chaining for logging calculated values
        try {
            console.error('Score calculation state:', {
                correct: typeof correctCount !== 'undefined' ? correctCount : 'N/A',
                wrong: typeof wrongCount !== 'undefined' ? wrongCount : 'N/A'
            });
        } catch (e) { }

        res.status(500).json({
            error: 'Server error during submission',
            details: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
});

module.exports = router;
