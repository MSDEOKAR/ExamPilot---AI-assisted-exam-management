import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { createQuestion, getQuestions, deleteQuestion, getExams } from '../services/api';
import { FiUpload, FiTrash2, FiEdit3, FiFileText, FiSave, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

const API_URL = 'http://localhost:5000';

export default function QuestionUpload() {
    const [questions, setQuestions] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // View state
    const [viewMode, setViewMode] = useState('list'); // 'list', 'batch', 'form'

    // Batch processing state
    const [rawText, setRawText] = useState('');
    const [answerKey, setAnswerKey] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [importMode, setImportMode] = useState('text'); // 'text' or 'json'
    const [ocrLoading, setOcrLoading] = useState(false);
    const [batchItems, setBatchItems] = useState([]); // Array of { question_text, options, ai_tags, ai_difficulty, ai_suggested_answer, saved: boolean }
    const [selectedExam, setSelectedExam] = useState('');

    // Single form state (for editing)
    const [formItem, setFormItem] = useState({
        id: null,
        question_text: '',
        difficulty: 'medium',
        tags: '',
        correct_option: 0,
        options: [
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
        ]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [qRes, eRes] = await Promise.all([getQuestions(), getExams()]);
            setQuestions(qRes.data);
            setExams(eRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBatchProcess = async () => {
        if (!rawText.trim()) return;

        setOcrLoading(true);
        setViewMode('batch');
        setBatchItems([]);

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/api/questions/batch-split`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: rawText, answerKey: answerKey })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Server error');

            if (data.questions && data.questions.length > 0) {
                setBatchItems(data.questions.map(q => ({
                    ...q,
                    saved: false
                })));
                setMessage({ type: 'success', text: `AI Split: Detected ${data.questions.length} questions!` });
            } else {
                setMessage({ type: 'warning', text: 'No questions detected in text. Check your formatting.' });
            }
        } catch (err) {
            console.error('Batch process failed:', err);
            setMessage({ type: 'error', text: `Process Failed: ${err.message}` });
        } finally {
            setOcrLoading(false);
        }
    };

    const handleJSONProcess = () => {
        if (!jsonText.trim()) return;
        try {
            const data = JSON.parse(jsonText);
            const questionsArray = Array.isArray(data) ? data : (data.questions || []);

            if (!Array.isArray(questionsArray)) throw new Error('JSON must be an array or contain a questions array');

            const transformed = questionsArray.map(q => {
                let answerIdx = -1;
                // Support multiple answer key names
                const rawAns = q.answer !== undefined ? q.answer : (q.ans !== undefined ? q.ans : q.ai_suggested_answer);

                // Support multiple option key names
                const rawOptions = Array.isArray(q.options) ? q.options : (Array.isArray(q.option) ? q.option : []);

                if (rawAns !== undefined && rawAns !== null) {
                    if (typeof rawAns === 'number') {
                        answerIdx = rawAns;
                    } else if (typeof rawAns === 'string') {
                        const trimmed = rawAns.trim();
                        // Handle "A", "(A)", "Option A", "Ans: A"
                        const letterMatch = trimmed.match(/(?:^|Option|Ans|Answer)[:\s\-\.]*\(?([A-E])\)?$/i);
                        if (letterMatch) {
                            answerIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
                        } else {
                            // Handle "1", "(1)", "Ans: 1"
                            const numMatch = trimmed.match(/(?:^|Option|Ans|Answer)[:\s\-\.]*\(?([1-5])\)?$/i);
                            if (numMatch) {
                                answerIdx = parseInt(numMatch[1]) - 1;
                            } else {
                                // Try to match option text directly
                                const textIdx = rawOptions.findIndex(opt => opt && opt.toString().toLowerCase() === trimmed.toLowerCase());
                                if (textIdx !== -1) answerIdx = textIdx;
                            }
                        }
                    }
                }

                return {
                    question_text: q.question || q.question_text || '',
                    options: rawOptions.map(opt => typeof opt === 'object' && opt !== null ? (opt.text || opt.option_text || JSON.stringify(opt)) : opt.toString()),
                    ai_tags: Array.isArray(q.tags) ? q.tags : (q.ai_tags || ['Imported']),
                    ai_difficulty: q.difficulty || q.ai_difficulty || 'medium',
                    ai_suggested_answer: answerIdx,
                    saved: false
                };
            });

            setBatchItems(transformed);
            setMessage({ type: 'success', text: `JSON Import: Loaded ${transformed.length} questions!` });
        } catch (err) {
            console.error('JSON parse failed:', err);
            setMessage({ type: 'error', text: `Invalid JSON format: ${err.message}` });
        }
    };

    const handleSaveBatchItem = async (index) => {
        const item = batchItems[index];
        if (item.saved) return;

        try {
            const formData = new FormData();
            formData.append('question_text', item.question_text);
            if (selectedExam) formData.append('exam_id', selectedExam);
            formData.append('difficulty', item.ai_difficulty || 'medium');
            formData.append('tags', item.ai_tags?.join(', ') || 'General');

            // Ensure correct_option is passed both as a field and embedded in options for redundancy
            const finalAnsIdx = (item.ai_suggested_answer !== undefined && item.ai_suggested_answer >= 0) ? item.ai_suggested_answer : 0;
            formData.append('correct_option', finalAnsIdx.toString());

            const ops = item.options.map((text, idx) => ({
                option_text: text,
                is_correct: idx === finalAnsIdx
            }));
            while (ops.length < 4) {
                ops.push({
                    option_text: '',
                    is_correct: ops.length === finalAnsIdx
                });
            }
            formData.append('options', JSON.stringify(ops));

            await createQuestion(formData);

            const newBatch = [...batchItems];
            newBatch[index].saved = true;
            setBatchItems(newBatch);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to save item ' + (index + 1));
        }
    };

    const handleSaveAllBatch = async () => {
        setLoading(true);
        for (let i = 0; i < batchItems.length; i++) {
            if (!batchItems[i].saved) {
                await handleSaveBatchItem(i);
            }
        }
        setLoading(false);
        setMessage({ type: 'success', text: 'Batch saved successfully!' });
    };

    const handleAISuggest = async () => {
        if (!formItem.question_text) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            // We use the batch-split endpoint with a single question block
            const res = await fetch(`${API_URL}/api/questions/batch-split`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: formItem.question_text + '\n' + formItem.options.map(o => o.text).join('\n') })
            });
            const data = await res.json();
            if (data.questions && data.questions.length > 0) {
                const suggestion = data.questions[0];
                setFormItem(prev => ({
                    ...prev,
                    difficulty: suggestion.ai_difficulty || prev.difficulty,
                    tags: suggestion.ai_tags?.join(', ') || prev.tags,
                    correct_option: suggestion.ai_suggested_answer >= 0 ? suggestion.ai_suggested_answer : prev.correct_option
                }));
                setMessage({ type: 'success', text: 'AI suggestions applied!' });
            }
        } catch (err) {
            console.error('AI Suggest failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditItem = (item, isBatchIndex = -1) => {
        setFormItem({
            id: isBatchIndex >= 0 ? null : item.id,
            batchIndex: isBatchIndex,
            question_text: item.question_text,
            difficulty: item.difficulty || item.ai_difficulty || 'medium',
            tags: item.tags || (item.ai_tags ? item.ai_tags.join(', ') : ''),
            correct_option: item.correct_option !== undefined ? item.correct_option : (item.ai_suggested_answer >= 0 ? item.ai_suggested_answer : 0),
            options: item.options.map(o => ({
                text: typeof o === 'string' ? o : o.option_text,
                image: o.option_image || null
            })).concat(Array(Math.max(0, 4 - item.options.length)).fill({ text: '', image: null }))
        });
        setViewMode('form');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('question_text', formItem.question_text);
            if (selectedExam) formData.append('exam_id', selectedExam);
            formData.append('difficulty', formItem.difficulty);
            formData.append('tags', formItem.tags);
            formData.append('correct_option', formItem.correct_option);
            formData.append('options', JSON.stringify(formItem.options.map(o => ({ option_text: o.text }))));

            await createQuestion(formData);

            if (formItem.batchIndex >= 0) {
                const newBatch = [...batchItems];
                newBatch[formItem.batchIndex].saved = true;
                setBatchItems(newBatch);
            }

            setMessage({ type: 'success', text: 'Question saved!' });
            setViewMode(batchItems.length > 0 ? 'batch' : 'list');
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save question' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this question?')) return;
        try {
            await deleteQuestion(id);
            loadData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    return (
        <AdminLayout title="Question Bank">
            {/* Header Actions */}
            <div className="admin-header-actions">
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <FiFileText /> Question List
                    </button>
                    {batchItems.length > 0 && (
                        <button
                            className={`tab-btn ${viewMode === 'batch' ? 'active' : ''}`}
                            onClick={() => setViewMode('batch')}
                        >
                            <FiCheckCircle /> Batch Review ({batchItems.length})
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        className="form-select"
                        style={{ margin: 0, width: '200px' }}
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                    >
                        <option value="">— Select Target Exam —</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                    </select>

                    <button
                        className="btn btn-primary"
                        onClick={() => { setViewMode('batch'); setBatchItems([]); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FiUpload /> Batch Paste Questions
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginBottom: '24px' }}>
                    {message.text}
                </div>
            )}

            {/* View Switching */}
            {viewMode === 'list' && (
                <div className="glass-card table-section">
                    <div className="section-header">
                        <h3>All Questions ({questions.length})</h3>
                        <button className="btn btn-sm btn-secondary" onClick={loadData}>
                            <FiRefreshCw />
                        </button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Question</th>
                                    <th>Diff</th>
                                    <th>Tags</th>
                                    <th>Options</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q, i) => (
                                    <tr key={q.id}>
                                        <td>{i + 1}</td>
                                        <td>
                                            <div className="question-cell">
                                                <span>{q.question_text || '(Empty)'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                                        </td>
                                        <td>{q.tags}</td>
                                        <td>{q.options?.length}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="action-btn edit" onClick={() => handleEditItem(q)}><FiEdit3 /></button>
                                                <button className="action-btn delete" onClick={() => handleDelete(q.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'batch' && (
                <div className="batch-grid">
                    <div className="batch-left">
                        <div className="glass-card sticky-card">
                            <div className="section-header" style={{ marginBottom: '16px' }}>
                                <h3>Batch Import</h3>
                                <div className="tabs" style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className={`btn btn-sm ${importMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setImportMode('text')}
                                    >
                                        AI Text
                                    </button>
                                    <button
                                        className={`btn btn-sm ${importMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setImportMode('json')}
                                    >
                                        JSON Data
                                    </button>
                                </div>
                            </div>

                            {importMode === 'text' ? (
                                <>
                                    <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
                                        Paste questions on the left and answer key (1-A, 2. B, etc.) on the right.
                                    </p>

                                    <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>1. Questions & Options</label>
                                            <textarea
                                                className="form-textarea"
                                                style={{ height: '350px', fontSize: '12px', fontFamily: 'monospace' }}
                                                placeholder="1. What is...?&#10;A. Option 1&#10;B. Option 2..."
                                                value={rawText}
                                                onChange={(e) => setRawText(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--success)' }}>2. Answer Key</label>
                                            <textarea
                                                className="form-textarea"
                                                style={{ height: '350px', fontSize: '12px', fontFamily: 'monospace' }}
                                                placeholder="1-A&#10;2. B&#10;3) C"
                                                value={answerKey}
                                                onChange={(e) => setAnswerKey(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary w-100"
                                        style={{ padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold' }}
                                        onClick={handleBatchProcess}
                                        disabled={ocrLoading || !rawText.trim()}
                                    >
                                        {ocrLoading ? (
                                            <><div className="spinner sm"></div> Analyzing & Matching...</>
                                        ) : (
                                            <>🔥 Auto-Match & Analyze</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
                                        Paste your JSON formatted question array here.
                                    </p>
                                    <textarea
                                        className="form-textarea"
                                        style={{ height: '425px', fontSize: '12px', fontFamily: 'monospace' }}
                                        placeholder='[&#10;  {&#10;    "question": "What is 2+2?",&#10;    "options": ["3", "4", "5", "6"],&#10;    "answer": 1&#10;  }&#10;]'
                                        value={jsonText}
                                        onChange={(e) => setJsonText(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-success w-100"
                                        style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold' }}
                                        onClick={handleJSONProcess}
                                        disabled={!jsonText.trim()}
                                    >
                                        📦 Import JSON Data
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="batch-right">
                        <div className="batch-header">
                            <h3>Detected Questions ({batchItems.length})</h3>
                            <button className="btn btn-success" onClick={handleSaveAllBatch} disabled={loading}>
                                <FiSave /> {loading ? 'Saving...' : 'Save All questions'}
                            </button>
                        </div>

                        <div className="batch-list">
                            {ocrLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>AI is splitting questions...</p>
                                </div>
                            ) : batchItems.map((item, idx) => (
                                <div key={idx} className={`batch-item ${item.saved ? 'saved' : ''}`}>
                                    <div className="batch-item-body">
                                        <div className="batch-item-meta">
                                            <span className="q-num">Q{idx + 1}</span>
                                            <span className={`badge badge-${item.ai_difficulty}`}>{item.ai_difficulty}</span>
                                            <span className="tags">{item.ai_tags?.join(', ')}</span>
                                        </div>
                                        <p className="batch-item-text">{item.question_text}</p>
                                        <div className="batch-item-options">
                                            {item.options.map((opt, oi) => (
                                                <div key={oi} className={`batch-opt ${item.ai_suggested_answer === oi ? 'suggested' : ''}`}>
                                                    <span>{String.fromCharCode(65 + oi)}.</span> {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="batch-item-actions">
                                        {item.saved ? (
                                            <span className="saved-badge"><FiCheckCircle /> Saved</span>
                                        ) : (
                                            <>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleEditItem(item, idx)}>Edit</button>
                                                <button className="btn btn-sm btn-success" onClick={() => handleSaveBatchItem(idx)}>Save</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'form' && (
                <div className="glass-card form-section">
                    <div className="section-header">
                        <h3>{formItem.id ? 'Edit Question' : 'New Question'}</h3>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleAISuggest}
                            disabled={loading || !formItem.question_text}
                        >
                            <FiRefreshCw /> AI Auto-Fill
                        </button>
                    </div>
                    <form onSubmit={handleFormSubmit}>
                        <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                                className="form-textarea"
                                value={formItem.question_text}
                                onChange={(e) => setFormItem({ ...formItem, question_text: e.target.value })}
                                rows={4}
                                required
                            />
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Difficulty</label>
                                <select
                                    className="form-select"
                                    value={formItem.difficulty}
                                    onChange={(e) => setFormItem({ ...formItem, difficulty: e.target.value })}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tags (Comma separated)</label>
                                <input
                                    className="form-input"
                                    value={formItem.tags}
                                    onChange={(e) => setFormItem({ ...formItem, tags: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="options-form">
                            <label>Options</label>
                            {formItem.options.map((opt, i) => (
                                <div key={i} className={`form-option-row ${formItem.correct_option === i ? 'correct' : ''}`}>
                                    <span className="marker">{String.fromCharCode(65 + i)}</span>
                                    <input
                                        className="form-input"
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = [...formItem.options];
                                            newOpts[i].text = e.target.value;
                                            setFormItem({ ...formItem, options: newOpts });
                                        }}
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    />
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${formItem.correct_option === i ? 'btn-success' : 'btn-secondary'}`}
                                        onClick={() => setFormItem({ ...formItem, correct_option: i })}
                                    >
                                        {formItem.correct_option === i ? 'Correct' : 'Mark Correct'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Question'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setViewMode(batchItems.length > 0 ? 'batch' : 'list')}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
