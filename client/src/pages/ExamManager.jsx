import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getExams, createExam, updateExam, deleteExam, startExam, completeExam, getQuestions, addQuestionsToExam } from '../services/api';

export default function ExamManager() {
    const [exams, setExams] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showAssign, setShowAssign] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form state
    const [form, setForm] = useState({
        title: '', description: '', duration: 60, total_questions: 10,
        negative_marking: 0, marks_per_question: 1, scheduled_at: ''
    });
    const [editId, setEditId] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [eRes, qRes] = await Promise.all([getExams(), getQuestions()]);
            setExams(eRes.data);
            setQuestions(qRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await updateExam(editId, form);
                setMessage({ type: 'success', text: 'Exam updated!' });
            } else {
                await createExam(form);
                setMessage({ type: 'success', text: 'Exam created!' });
            }
            setShowForm(false);
            setEditId(null);
            setForm({ title: '', description: '', duration: 60, total_questions: 10, negative_marking: 0, marks_per_question: 1, scheduled_at: '' });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save exam' });
        }
    };

    const handleEdit = (exam) => {
        setForm({
            title: exam.title, description: exam.description || '', duration: exam.duration,
            total_questions: exam.total_questions, negative_marking: exam.negative_marking || 0,
            marks_per_question: exam.marks_per_question || 1,
            scheduled_at: exam.scheduled_at ? exam.scheduled_at.slice(0, 16) : ''
        });
        setEditId(exam.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this exam? All associated results will be lost.')) return;
        try { await deleteExam(id); loadData(); } catch { alert('Failed to delete'); }
    };

    const handleStart = async (id) => {
        try { await startExam(id); setMessage({ type: 'success', text: 'Exam is now active!' }); loadData(); }
        catch (err) { setMessage({ type: 'error', text: err.response?.data?.error || 'Cannot start exam' }); }
    };

    const handleComplete = async (id) => {
        try { await completeExam(id); loadData(); } catch { alert('Failed'); }
    };

    const handleAssignQuestions = async (examId, questionIds) => {
        try {
            await addQuestionsToExam(examId, questionIds);
            setMessage({ type: 'success', text: `${questionIds.length} Questions assigned!` });
            setShowAssign(null);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to assign questions' });
        }
    };

    const handleAddAllQuestions = async (examId) => {
        const unassignedIds = questions.filter(q => !q.exam_id || q.exam_id !== examId).map(q => q.id);
        if (unassignedIds.length === 0) {
            setMessage({ type: 'info', text: 'No unassigned questions available' });
            return;
        }
        await handleAssignQuestions(examId, unassignedIds);
    };

    const statusColors = { draft: 'badge-info', scheduled: 'badge-warning', active: 'badge-success', completed: 'badge-purple' };

    if (loading) return <AdminLayout title="Exam Management"><div className="loading-spinner"><div className="spinner"></div></div></AdminLayout>;

    return (
        <AdminLayout title="Exam Management">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: '', description: '', duration: 60, total_questions: 10, negative_marking: 0, marks_per_question: 1, scheduled_at: '' }); }}>
                    {showForm ? '✕ Close' : '➕ Create Exam'}
                </button>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {showForm && (
                <div className="glass-card" style={{ marginBottom: '32px', animation: 'fadeInUp 0.3s ease' }}>
                    <h3 style={{ marginBottom: '24px' }}>{editId ? '✏️ Edit Exam' : '📝 New Exam'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Exam Title *</label>
                            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics Mid-Term Mock Test" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Exam description..." rows={2} />
                        </div>
                        <div className="grid-3">
                            <div className="form-group">
                                <label className="form-label">⏱️ Duration (minutes)</label>
                                <input type="number" className="form-input" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 60 })} min="1" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📊 Total Questions</label>
                                <input type="number" className="form-input" value={form.total_questions} onChange={(e) => setForm({ ...form, total_questions: parseInt(e.target.value) || 10 })} min="1" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">✅ Marks per Question</label>
                                <input type="number" className="form-input" value={form.marks_per_question} onChange={(e) => setForm({ ...form, marks_per_question: parseFloat(e.target.value) || 1 })} min="0" step="0.25" />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">➖ Negative Marking (per wrong answer)</label>
                                <input type="number" className="form-input" value={form.negative_marking} onChange={(e) => setForm({ ...form, negative_marking: parseFloat(e.target.value) || 0 })} min="0" step="0.25" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📅 Schedule (optional)</label>
                                <input type="datetime-local" className="form-input" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-primary">{editId ? '💾 Update Exam' : '💾 Create Exam'}</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assign Questions Modal */}
            {showAssign && (
                <div className="modal-overlay" onClick={() => setShowAssign(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2>📎 Assign Questions</h2>
                            <button className="btn btn-success btn-sm" onClick={() => handleAddAllQuestions(showAssign)}>
                                ➕ Add All Unassigned
                            </button>
                        </div>
                        <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Select questions from the bank to add:</p>
                        {(() => {
                            const unassigned = questions.filter(q => !q.exam_id || q.exam_id !== showAssign);
                            if (unassigned.length === 0) return <p>No unassigned questions available.</p>;
                            return (
                                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    {unassigned.map(q => (
                                        <div key={q.id} className="option-item" onClick={() => handleAssignQuestions(showAssign, [q.id])} style={{ cursor: 'pointer' }}>
                                            <div className="option-letter">+</div>
                                            <div className="option-content">
                                                <div style={{ fontSize: '14px' }}>{q.question_text?.substring(0, 80) || '(Image Question)'}</div>
                                                <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-error' : 'badge-warning'}`} style={{ marginTop: '4px' }}>{q.difficulty}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exams List */}
            <div className="exam-list">
                {exams.length > 0 ? exams.map((exam) => (
                    <div key={exam.id} className="glass-card" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                            <span className={`badge ${statusColors[exam.status] || 'badge-info'}`}>{exam.status}</span>
                        </div>
                        <h3 style={{ marginBottom: '8px', paddingRight: '80px' }}>{exam.title}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{exam.description || 'No description'}</p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <span>⏱️ {exam.duration} min</span>
                            <span>❓ {exam.question_count || 0} / {exam.total_questions} questions</span>
                            <span>👥 {exam.attempt_count || 0} attempts</span>
                            <span>➖ {exam.negative_marking || 0} negative</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {(exam.status === 'draft' || exam.status === 'scheduled') && (
                                <>
                                    <button className="btn btn-success btn-sm" onClick={() => handleStart(exam.id)}>🚀 Upload Exam</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(exam.id)}>📎 Add Questions</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(exam)}>✏️ Edit</button>
                                </>
                            )}
                            {exam.status === 'active' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleComplete(exam.id)}>⏹️ End Exam</button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exam.id)}>🗑️</button>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-icon">📝</div>
                        <p>No exams yet. Create your first mock exam!</p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
