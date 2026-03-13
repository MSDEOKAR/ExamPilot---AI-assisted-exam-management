const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { tagQuestion, detectDifficulty, suggestAnswer, splitQuestions, parseAnswerKey } = require('../utils/ai');
const path = require('path');

// POST /api/questions — Create question with options
router.post('/', authMiddleware, upload.fields([
    { name: 'questionImage', maxCount: 1 },
    { name: 'optionImages', maxCount: 10 }
]), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let { question_text, exam_id, options, correct_option, difficulty, tags } = req.body;
        let question_image = null;
        let ocr_text = null;

        if (req.files && req.files.questionImage) {
            question_image = req.files.questionImage[0].filename;
            const imagePath = path.join(__dirname, '..', 'uploads', question_image);
            ocr_text = await extractText(imagePath);
            if (!question_text && ocr_text) {
                question_text = ocr_text;
            }
        }

        const textForAnalysis = question_text || ocr_text || '';
        if (!tags) tags = tagQuestion(textForAnalysis).join(', ');
        if (!difficulty) difficulty = detectDifficulty(textForAnalysis);

        const [qResult] = await conn.query(
            'INSERT INTO questions (exam_id, question_text, question_image, ocr_text, difficulty, tags) VALUES (?, ?, ?, ?, ?, ?)',
            [exam_id || null, question_text || null, question_image, ocr_text, difficulty, tags]
        );
        const questionId = qResult.insertId;

        let parsedOptions = [];
        if (typeof options === 'string') {
            try { parsedOptions = JSON.parse(options); } catch (e) { parsedOptions = []; }
        } else if (Array.isArray(options)) {
            parsedOptions = options;
        }

        const optionImages = req.files && req.files.optionImages ? req.files.optionImages : [];

        for (let i = 0; i < parsedOptions.length; i++) {
            const opt = parsedOptions[i];
            const optImage = optionImages[i] ? optionImages[i].filename : (opt.option_image || null);
            const isCorrect = (correct_option !== undefined && correct_option !== '' && correct_option !== null)
                ? (parseInt(correct_option) === i ? 1 : 0)
                : (opt.is_correct ? 1 : 0);

            await conn.query(
                'INSERT INTO options (question_id, option_text, option_image, is_correct, option_order) VALUES (?, ?, ?, ?, ?)',
                [questionId, opt.option_text || opt.text || null, optImage, isCorrect, i]
            );
        }

        await conn.commit();

        const optionTexts = parsedOptions.map(o => o.option_text || o.text || '');
        const aiSuggestedAnswer = suggestAnswer(textForAnalysis, optionTexts);

        res.status(201).json({
            id: questionId,
            question_text,
            question_image,
            ocr_text,
            difficulty,
            tags,
            ai_suggested_answer: aiSuggestedAnswer,
            options: parsedOptions
        });
    } catch (error) {
        await conn.rollback();
        console.error('Create question error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

// GET /api/questions — List all questions
router.get('/', async (req, res) => {
    try {
        const { exam_id } = req.query;
        let query = `SELECT q.*, GROUP_CONCAT(o.id ORDER BY o.option_order) as option_ids
                 FROM questions q LEFT JOIN options o ON q.id = o.question_id`;
        const params = [];

        if (exam_id) {
            query += ' WHERE q.exam_id = ?';
            params.push(exam_id);
        }

        query += ' GROUP BY q.id ORDER BY q.created_at DESC';
        const [questions] = await pool.query(query, params);

        for (let q of questions) {
            const [opts] = await pool.query(
                'SELECT * FROM options WHERE question_id = ? ORDER BY option_order', [q.id]
            );
            q.options = opts;
        }

        res.json(questions);
    } catch (error) {
        console.error('List questions error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/questions/:id
router.get('/:id', async (req, res) => {
    try {
        const [questions] = await pool.query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
        if (questions.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const question = questions[0];
        const [options] = await pool.query(
            'SELECT * FROM options WHERE question_id = ? ORDER BY option_order', [question.id]
        );
        question.options = options;
        res.json(question);
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/questions/:id
router.put('/:id', authMiddleware, upload.fields([
    { name: 'questionImage', maxCount: 1 },
    { name: 'optionImages', maxCount: 10 }
]), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let { question_text, exam_id, options, correct_option, difficulty, tags } = req.body;
        let question_image = req.body.existing_question_image || null;
        let ocr_text = null;

        if (req.files && req.files.questionImage) {
            question_image = req.files.questionImage[0].filename;
            const imagePath = path.join(__dirname, '..', 'uploads', question_image);
            ocr_text = await extractText(imagePath);
        }

        await conn.query(
            'UPDATE questions SET question_text = ?, question_image = COALESCE(?, question_image), ocr_text = COALESCE(?, ocr_text), difficulty = ?, tags = ?, exam_id = ? WHERE id = ?',
            [question_text, question_image, ocr_text, difficulty || 'medium', tags || 'General', exam_id || null, req.params.id]
        );

        if (options) {
            let parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
            await conn.query('DELETE FROM options WHERE question_id = ?', [req.params.id]);

            const optionImages = req.files && req.files.optionImages ? req.files.optionImages : [];
            for (let i = 0; i < parsedOptions.length; i++) {
                const opt = parsedOptions[i];
                const optImage = optionImages[i] ? optionImages[i].filename : (opt.option_image || null);
                const isCorrect = (correct_option !== undefined && correct_option !== '' && correct_option !== null)
                    ? (parseInt(correct_option) === i ? 1 : 0)
                    : (opt.is_correct ? 1 : 0);

                await conn.query(
                    'INSERT INTO options (question_id, option_text, option_image, is_correct, option_order) VALUES (?, ?, ?, ?, ?)',
                    [req.params.id, opt.option_text || opt.text || null, optImage, isCorrect, i]
                );
            }
        }

        await conn.commit();
        res.json({ message: 'Question updated successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

// DELETE /api/questions/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/questions/batch-split — Split and analyze raw text
router.post('/batch-split', authMiddleware, async (req, res) => {
    try {
        const { text, answerKey } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const extractedQuestions = splitQuestions(text);
        const keyMap = answerKey ? parseAnswerKey(answerKey) : {};

        const questions = extractedQuestions.map((q, index) => {
            const qNum = index + 1;
            const tags = tagQuestion(q.question_text);
            const difficulty = detectDifficulty(q.question_text);

            let suggestedAnswer = suggestAnswer(q.question_text, q.options);
            if (keyMap[qNum] !== undefined) {
                suggestedAnswer = keyMap[qNum];
            }

            return {
                ...q,
                ai_tags: tags,
                ai_difficulty: difficulty,
                ai_suggested_answer: suggestedAnswer
            };
        });

        res.json({ questions });
    } catch (error) {
        console.error('[ROUTE ERROR] Batch-split failed:', error);
        res.status(500).json({
            error: 'Batch split failed',
            details: error.message
        });
    }
});

module.exports = router;
