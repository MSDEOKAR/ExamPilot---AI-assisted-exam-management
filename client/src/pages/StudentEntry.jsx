import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStudent, getActiveExams } from '../services/api';

export default function StudentEntry() {
    const [exams, setExams] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [studentId, setStudentId] = useState(localStorage.getItem('studentId') || '');
    const [studentName, setStudentName] = useState(localStorage.getItem('studentName') || '');
    const [registered, setRegistered] = useState(!!localStorage.getItem('studentId'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => { loadExams(); }, []);

    const loadExams = async () => {
        try {
            const { data } = await getActiveExams();
            setExams(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { data } = await registerStudent({ name, email });
            localStorage.setItem('studentId', data.id);
            localStorage.setItem('studentName', data.name);
            setStudentId(data.id);
            setStudentName(data.name);
            setRegistered(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    const handleStartExam = (examId) => {
        navigate(`/exam/${examId}`);
    };

    return (
        <div className="student-page">
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="brand-icon">🧠</div>
                    ExamAI
                </div>
                <div className="navbar-links">
                    {registered && <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>👋 Welcome, {studentName}</span>}
                    <Link to="/admin/login" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Admin Login</Link>
                </div>
            </nav>

            <div className="page-container" style={{ maxWidth: '1000px', paddingTop: '40px' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeInUp 0.6s ease' }}>
                    <h1 style={{ fontSize: '40px', marginBottom: '12px', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AI-Powered Mock Exams
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
                        Practice with timed mock tests, get instant results, and review your answers.
                    </p>
                </div>

                {/* Registration */}
                {!registered && (
                    <div style={{ maxWidth: '440px', margin: '0 auto 48px', animation: 'fadeInUp 0.6s ease 0.1s both' }}>
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '20px' }}>📝 Enter Your Details to Begin</h3>
                            {error && <div className="alert alert-error">{error}</div>}
                            <form onSubmit={handleRegister}>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                    🚀 Get Started
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Available Exams */}
                {registered && (
                    <div style={{ animation: 'fadeInUp 0.6s ease 0.2s both' }}>
                        <h2 style={{ marginBottom: '24px', fontSize: '22px' }}>📚 Available Exams</h2>
                        {loading ? (
                            <div className="loading-spinner"><div className="spinner"></div></div>
                        ) : exams.length > 0 ? (
                            <div className="exam-list">
                                {exams.map((exam) => (
                                    <div key={exam.id} className="exam-card" onClick={() => handleStartExam(exam.id)}>
                                        <h3>{exam.title}</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                            {exam.description || 'Ready to take this exam.'}
                                        </p>
                                        <div className="exam-meta">
                                            <span>⏱️ {exam.duration} minutes</span>
                                            <span>❓ {exam.question_count || exam.total_questions} questions</span>
                                            <span>✅ {exam.marks_per_question || 1} marks each</span>
                                            {parseFloat(exam.negative_marking) > 0 && (
                                                <span style={{ color: 'var(--error)' }}>➖ {exam.negative_marking} negative</span>
                                            )}
                                        </div>
                                        <button className="btn btn-primary" style={{ marginTop: '8px' }}>
                                            🎯 Start Exam
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📝</div>
                                <p>No exams are currently available. Please check back later!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
