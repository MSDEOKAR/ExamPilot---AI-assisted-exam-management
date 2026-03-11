import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getExams, getExamResults, getResult } from '../services/api';

const API_URL = 'http://localhost:5000';

export default function ResultsViewer() {
    const { examId } = useParams();
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(examId || '');
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadExams(); }, []);
    useEffect(() => { if (selectedExam) loadResults(selectedExam); }, [selectedExam]);

    const loadExams = async () => {
        try { const { data } = await getExams(); setExams(data); } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadResults = async (eId) => {
        try { const { data } = await getExamResults(eId); setResults(data); } catch (err) { console.error(err); setResults([]); }
    };

    const viewDetail = async (resultId) => {
        try {
            const { data } = await getResult(resultId);
            setSelectedResult(data);
        } catch (err) { alert('Failed to load result'); }
    };

    if (loading) return <AdminLayout title="Results"><div className="loading-spinner"><div className="spinner"></div></div></AdminLayout>;

    return (
        <AdminLayout title="Student Results">
            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '24px' }}>
                <label className="form-label">Select Exam</label>
                <select className="form-select" value={selectedExam} onChange={(e) => { setSelectedExam(e.target.value); setSelectedResult(null); }}>
                    <option value="">— Choose an Exam —</option>
                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
            </div>

            {/* Result Detail Modal */}
            {selectedResult && (
                <div className="modal-overlay" onClick={() => setSelectedResult(null)}>
                    <div className="modal" style={{ maxWidth: '700px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
                        <h2>📋 Answer Review — {selectedResult.student_name}</h2>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <span className="badge badge-success">✅ {selectedResult.correct_count} correct</span>
                            <span className="badge badge-error">❌ {selectedResult.wrong_count} wrong</span>
                            <span className="badge badge-warning">⏭️ {selectedResult.unanswered_count} skipped</span>
                            <span className="badge badge-purple">🎯 Score: {selectedResult.score}/{selectedResult.total_marks}</span>
                        </div>

                        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            {selectedResult.questions?.map((q, i) => {
                                const ans = selectedResult.answers?.[q.id.toString()] || {};
                                return (
                                    <div key={q.id} style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: `1px solid ${ans.status === 'correct' ? 'var(--success)' : ans.status === 'wrong' ? 'var(--error)' : 'var(--border-glass)'}` }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '8px' }}>Q{i + 1}</div>
                                        {q.question_image && <img src={`${API_URL}/uploads/${q.question_image}`} alt="" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', marginBottom: '8px' }} />}
                                        <p style={{ marginBottom: '12px' }}>{q.question_text || '(Image question)'}</p>
                                        {q.options?.map(opt => (
                                            <div key={opt.id} style={{
                                                padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', fontSize: '13px',
                                                background: opt.is_correct ? 'rgba(16,185,129,0.1)' : (ans.selected === opt.id && !opt.is_correct) ? 'rgba(239,68,68,0.1)' : 'transparent',
                                                border: `1px solid ${opt.is_correct ? 'var(--success)' : ans.selected === opt.id ? 'var(--error)' : 'var(--border-glass)'}`,
                                                display: 'flex', alignItems: 'center', gap: '8px'
                                            }}>
                                                {opt.is_correct && <span>✅</span>}
                                                {ans.selected === opt.id && !opt.is_correct && <span>❌</span>}
                                                {opt.option_image && <img src={`${API_URL}/uploads/${opt.option_image}`} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                {opt.option_text || '(Image option)'}
                                            </div>
                                        ))}
                                        <span className={`badge ${ans.status === 'correct' ? 'badge-success' : ans.status === 'wrong' ? 'badge-error' : 'badge-warning'}`} style={{ marginTop: '8px' }}>
                                            {ans.status === 'correct' ? '✅ Correct' : ans.status === 'wrong' ? '❌ Wrong' : '⏭️ Skipped'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setSelectedResult(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedExam && (
                <div className="glass-card">
                    <h3 style={{ marginBottom: '20px' }}>📊 Results ({results.length} submissions)</h3>
                    {results.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Student</th>
                                        <th>Email</th>
                                        <th>Score</th>
                                        <th>Correct</th>
                                        <th>Wrong</th>
                                        <th>Skipped</th>
                                        <th>Submitted</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, i) => (
                                        <tr key={r.id}>
                                            <td><span style={{ fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)' }}>#{i + 1}</span></td>
                                            <td>{r.student_name}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{r.student_email}</td>
                                            <td><span className="badge badge-success">{r.score} / {r.total_marks}</span></td>
                                            <td style={{ color: 'var(--success)' }}>{r.correct_count}</td>
                                            <td style={{ color: 'var(--error)' }}>{r.wrong_count}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{r.unanswered_count}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</td>
                                            <td><button className="btn btn-secondary btn-sm" onClick={() => viewDetail(r.id)}>👁️ Review</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📊</div>
                            <p>No submissions yet for this exam.</p>
                        </div>
                    )}
                </div>
            )}

            {!selectedExam && (
                <div className="empty-state">
                    <div className="empty-icon">📈</div>
                    <p>Select an exam above to view student results.</p>
                </div>
            )}
        </AdminLayout>
    );
}
