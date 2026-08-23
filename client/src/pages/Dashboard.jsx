import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getDashboardStats, getExams, getQuestions } from '../services/api';
import { FiFileText, FiHelpCircle, FiUsers, FiAward, FiArrowRight } from 'react-icons/fi';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [exams, setExams] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [sRes, eRes, qRes] = await Promise.all([
                getDashboardStats(),
                getExams(),
                getQuestions(null, 5)
            ]);
            setStats(sRes.data);
            setExams(eRes.data || []);
            setQuestions(qRes.data || []);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setStats({ total_exams: 0, total_questions: 0, total_students: 0, total_attempts: 0, avg_score: 0, recent_results: [] });
        } finally {
            setLoading(false);
        }
    };

    const statusColors = { draft: 'badge-info', scheduled: 'badge-warning', active: 'badge-success', completed: 'badge-purple' };

    if (loading) return <AdminLayout title="Dashboard"><div className="loading-spinner"><div className="spinner"></div></div></AdminLayout>;

    return (
        <AdminLayout title="Dashboard">
            {/* Top Stat Cards */}
            <div className="grid-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon"><FiFileText /></div>
                    <div className="stat-value">{stats?.total_exams || exams.length || 0}</div>
                    <div className="stat-label">Total Exams</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-tertiary)' }}><FiHelpCircle /></div>
                    <div className="stat-value">{stats?.total_questions || questions.length || 0}</div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}><FiUsers /></div>
                    <div className="stat-value">{stats?.total_students || 0}</div>
                    <div className="stat-label">Students</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}><FiAward /></div>
                    <div className="stat-value">{stats?.avg_score || 0}</div>
                    <div className="stat-label">Avg Score</div>
                </div>
            </div>

            {/* Created Exams Section */}
            <div className="glass-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>📝 Created Exams ({exams.length})</h3>
                    <Link to="/admin/exams" className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Manage Exams <FiArrowRight />
                    </Link>
                </div>
                {exams.length > 0 ? (
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {exams.map((ex) => (
                            <div key={ex.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '15px' }}>{ex.title}</strong>
                                    <span className={`badge ${statusColors[ex.status] || 'badge-info'}`}>{ex.status}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <span>⏱️ {ex.duration} min</span>
                                    <span>❓ {ex.question_count || 0} questions</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No exams created yet. Go to Exam Management to create an exam!</p>
                    </div>
                )}
            </div>

            {/* Recent Questions Preview Section */}
            <div className="glass-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>❓ Question Bank Overview ({questions.length})</h3>
                    <Link to="/admin/questions" className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Question Bank <FiArrowRight />
                    </Link>
                </div>
                {questions.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Question</th>
                                    <th>Difficulty</th>
                                    <th>Tags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.slice(0, 5).map((q, idx) => (
                                    <tr key={q.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td>{q.question_text?.substring(0, 90) || '(Image Question)'}</td>
                                        <td><span className={`badge badge-${q.difficulty || 'medium'}`}>{q.difficulty || 'medium'}</span></td>
                                        <td>{q.tags || 'General'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No questions in bank. Go to Question Bank to add or import questions!</p>
                    </div>
                )}
            </div>

            {/* Recent Exam Attempts Section */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '20px' }}>📋 Recent Student Attempts</h3>
                {stats?.recent_results?.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Exam</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_results.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.student_name}</td>
                                        <td>{r.exam_title}</td>
                                        <td>
                                            <span className="badge badge-success">{r.score} / {r.total_marks}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <p>No exam attempts yet. Share active exams with students!</p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
