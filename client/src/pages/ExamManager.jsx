import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getExams, createExam, updateExam, deleteExam, startExam, completeExam, getQuestions, addQuestionsToExam, removeQuestionFromExam } from '../services/api';

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
        const currentExam = exams.find(e => e.id === examId);
        const maxQuestions = currentExam?.total_questions || 10;
        const currentAssigned = questions.filter(q => q.exam_id === examId).length;
        const remainingCapacity = Math.max(0, maxQuestions - currentAssigned);

        if (remainingCapacity <= 0) {
            setMessage({
                type: 'warning',
                text: `⚠️ Exam limit reached! Already assigned ${currentAssigned}/${maxQuestions} questions. Edit exam to increase Total Questions.`
            });
            return;
        }

        const allowedIds = questionIds.slice(0, remainingCapacity);
        try {
            await addQuestionsToExam(examId, allowedIds);
            const newCount = currentAssigned + allowedIds.length;
            if (allowedIds.length < questionIds.length) {
                setMessage({
                    type: 'warning',
                    text: `✅ Added ${allowedIds.length} question(s). Reached limit (${newCount}/${maxQuestions}).`
                });
            } else {
                setMessage({
                    type: 'success',
                    text: `✅ ${allowedIds.length} question(s) added! (${newCount}/${maxQuestions} assigned)`
                });
            }
            await loadData();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to assign questions' });
        }
    };

    const handleRemoveQuestion = async (examId, questionId) => {
        try {
            await removeQuestionFromExam(examId, questionId);
            setMessage({ type: 'success', text: 'Question unassigned from exam.' });
            await loadData();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to remove question' });
        }
    };

    const handleAddAllQuestions = async (examId) => {
        const currentExam = exams.find(e => e.id === examId);
        const maxQuestions = currentExam?.total_questions || 10;
        const currentAssigned = questions.filter(q => q.exam_id === examId).length;
        const remainingCapacity = Math.max(0, maxQuestions - currentAssigned);

        if (remainingCapacity <= 0) {
            setMessage({
                type: 'warning',
                text: `⚠️ Exam question limit reached (${currentAssigned}/${maxQuestions} questions assigned).`
            });
            return;
        }

        const unassigned = questions.filter(q => !q.exam_id || q.exam_id !== examId);
        if (unassigned.length === 0) {
            setMessage({ type: 'info', text: 'No unassigned questions available' });
            return;
        }

        const unassignedIds = unassigned.slice(0, remainingCapacity).map(q => q.id);
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
            {showAssign && (() => {
                const currentExam = exams.find(e => e.id === showAssign);
                const maxQuestions = currentExam?.total_questions || 10;
                const assignedQuestions = questions.filter(q => q.exam_id === showAssign);
                const unassignedQuestions = questions.filter(q => !q.exam_id || q.exam_id !== showAssign);
                const remainingCapacity = Math.max(0, maxQuestions - assignedQuestions.length);

                return (
                    <div className="modal-overlay" onClick={() => setShowAssign(null)}>
                        <div className="modal" style={{ maxWidth: '650px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h2>📎 Manage Exam Questions</h2>
                                <span className={`badge ${remainingCapacity > 0 ? 'badge-success' : 'badge-warning'}`}>
                                    {assignedQuestions.length} / {maxQuestions} Questions Assigned
                                </span>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Exam: <strong>{currentExam?.title}</strong> ({remainingCapacity} remaining slot{remainingCapacity === 1 ? '' : 's'})
                            </p>

                            {message.text && <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>{message.text}</div>}

                            {/* Section 1: Assigned Questions */}
                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--success)' }}>
                                    ✅ Currently Assigned ({assignedQuestions.length})
                                </h4>
                                {assignedQuestions.length > 0 ? (
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '8px' }}>
                                        {assignedQuestions.map(q => (
                                            <div key={q.id} className="option-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <div className="option-content" style={{ fontSize: '13px' }}>
                                                    {q.question_text?.substring(0, 75) || '(Image Question)'}
                                                </div>
                                                <button className="btn btn-sm btn-danger" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleRemoveQuestion(showAssign, q.id)}>
                                                    ➖ Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No questions assigned yet.</p>
                                )}
                            </div>

                            {/* Section 2: Available Unassigned Questions */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ fontSize: '14px', color: 'var(--primary)' }}>
                                        ➕ Available Bank Questions ({unassignedQuestions.length})
                                    </h4>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleAddAllQuestions(showAssign)}
                                        disabled={remainingCapacity <= 0 || unassignedQuestions.length === 0}
                                    >
                                        ➕ Add All ({remainingCapacity} max)
                                    </button>
                                </div>

                                {remainingCapacity <= 0 ? (
                                    <div className="alert alert-warning" style={{ fontSize: '12px', padding: '10px' }}>
                                        ⚠️ Exam limit reached ({assignedQuestions.length}/{maxQuestions}). Edit "Total Questions" in Edit Exam to add more.
                                    </div>
                                ) : unassignedQuestions.length > 0 ? (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '8px' }}>
                                        {unassignedQuestions.map(q => (
                                            <div key={q.id} className="option-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <div className="option-content" style={{ fontSize: '13px' }}>
                                                    {q.question_text?.substring(0, 75) || '(Image Question)'}
                                                    <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-error' : 'badge-warning'}`} style={{ marginLeft: '8px', fontSize: '10px' }}>
                                                        {q.difficulty}
                                                    </span>
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    style={{ padding: '2px 8px', fontSize: '11px' }}
                                                    onClick={() => handleAssignQuestions(showAssign, [q.id])}
                                                >
                                                    ➕ Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>All bank questions are currently assigned.</p>
                                )}
                            </div>

                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                                <button className="btn btn-success btn-sm" onClick={() => handleStart(exam.id)}>🚀 Activate Exam</button>
                            )}
                            {exam.status === 'active' && (
                                <button className="btn btn-warning btn-sm" onClick={() => handleComplete(exam.id)}>⏹️ End Exam</button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(exam.id)}>📎 Add Questions</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(exam)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exam.id)}>🗑️ Delete Exam</button>
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
