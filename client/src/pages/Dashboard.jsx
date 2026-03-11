import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getDashboardStats } from '../services/api';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const { data } = await getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            setStats({ total_exams: 0, total_questions: 0, total_students: 0, total_attempts: 0, avg_score: 0, recent_results: [] });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AdminLayout title="Dashboard"><div className="loading-spinner"><div className="spinner"></div></div></AdminLayout>;

    return (
        <AdminLayout title="Dashboard">
            <div className="grid-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-value">{stats?.total_exams || 0}</div>
                    <div className="stat-label">Total Exams</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-tertiary)' }}>❓</div>
                    <div className="stat-value">{stats?.total_questions || 0}</div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>👨‍🎓</div>
                    <div className="stat-value">{stats?.total_students || 0}</div>
                    <div className="stat-label">Students</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>🎯</div>
                    <div className="stat-value">{stats?.avg_score || 0}</div>
                    <div className="stat-label">Avg Score</div>
                </div>
            </div>

            <div className="glass-card">
                <h3 style={{ marginBottom: '20px' }}>📋 Recent Exam Attempts</h3>
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
                        <p>No exam attempts yet. Create an exam and share it with students!</p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
