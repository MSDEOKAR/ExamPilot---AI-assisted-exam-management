import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getResult } from '../services/api';

const API_URL = 'http://localhost:5000';

export default function ExamResult() {
    const { resultId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);

    useEffect(() => { loadResult(); }, [resultId]);

    const loadResult = async () => {
        try {
            const { data } = await getResult(resultId);
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;
    if (!result) return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
            <div className="alert alert-error">Result not found</div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
    );

    const percentage = result.total_marks > 0 ? ((result.score / result.total_marks) * 100).toFixed(1) : 0;
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const negativeDeducted = (result.wrong_count * parseFloat(result.negative_marking || 0));

    return (
        <div className="student-page">
            <nav className="navbar">
                <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
                    <div className="brand-icon">🧠</div>
                    ExamAI
                </Link>
                <div className="navbar-links">
                    <Link to="/" className="btn btn-secondary btn-sm">← Back to Exams</Link>
                </div>
            </nav>

            <div className="page-container" style={{ maxWidth: '900px', paddingTop: '32px' }}>
                {/* Score Hero */}
                <div className="result-hero" style={{ animation: 'fadeInUp 0.6s ease' }}>
                    <h2 style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {result.exam_title}
                    </h2>
                    <div className="result-score">{result.score} / {result.total_marks}</div>
                    <div className="result-percentage">
                        {percentage >= 70 ? '🎉' : percentage >= 40 ? '👍' : '📚'} {percentage}%
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
                        {result.student_name}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid-4" style={{ marginBottom: '32px', animation: 'fadeInUp 0.6s ease 0.1s both' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>✅</div>
                        <div className="stat-value">{result.correct_count}</div>
                        <div className="stat-label">Correct</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>❌</div>
                        <div className="stat-value">{result.wrong_count}</div>
                        <div className="stat-label">Wrong</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>⏭️</div>
                        <div className="stat-value">{result.unanswered_count}</div>
                        <div className="stat-label">Skipped</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>➖</div>
                        <div className="stat-value">{negativeDeducted.toFixed(1)}</div>
                        <div className="stat-label">Negative Marks</div>
                    </div>
                </div>

                {/* Review Toggle */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setShowReview(!showReview)}
                    >
                        {showReview ? '🔼 Hide Answer Review' : '🔽 Show All Questions & Answers'}
                    </button>
                </div>

                {/* Answer Review */}
                {showReview && result.questions && (
                    <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                        <h2 style={{ marginBottom: '24px', fontSize: '22px' }}>📋 Answer Review</h2>
                        {result.questions.map((q, i) => {
                            const ans = result.answers?.[q.id.toString()] || {};
                            return (
                                <div key={q.id} className="question-card" style={{
                                    borderLeft: `4px solid ${ans.status === 'correct' ? 'var(--success)' : ans.status === 'wrong' ? 'var(--error)' : 'var(--warning)'}`,
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div className="question-number">Question {i + 1}</div>
                                        <span className={`badge ${ans.status === 'correct' ? 'badge-success' : ans.status === 'wrong' ? 'badge-error' : 'badge-warning'}`}>
                                            {ans.status === 'correct' ? '✅ Correct' : ans.status === 'wrong' ? '❌ Wrong' : '⏭️ Skipped'}
                                        </span>
                                    </div>

                                    {q.question_image && (
                                        <img src={`${API_URL}/uploads/${q.question_image}`} alt="Q" className="question-image" style={{ maxHeight: '200px' }} />
                                    )}
                                    {q.question_text && <div className="question-text" style={{ fontSize: '16px' }}>{q.question_text}</div>}

                                    <div style={{ marginTop: '16px' }}>
                                        {q.options?.map((opt, oi) => {
                                            let cls = 'exam-option';
                                            if (opt.is_correct) cls += ' correct-answer';
                                            else if (ans.selected === opt.id && !opt.is_correct) cls += ' wrong-answer';

                                            return (
                                                <div key={opt.id} className={cls} style={{ cursor: 'default' }}>
                                                    <div className="option-marker" style={{
                                                        background: opt.is_correct ? 'var(--success)' : (ans.selected === opt.id ? 'var(--error)' : ''),
                                                        color: (opt.is_correct || ans.selected === opt.id) ? 'white' : ''
                                                    }}>
                                                        {opt.is_correct ? '✓' : (ans.selected === opt.id ? '✗' : optionLetters[oi])}
                                                    </div>
                                                    {opt.option_image && (
                                                        <img src={`${API_URL}/uploads/${opt.option_image}`} alt="" className="option-image" />
                                                    )}
                                                    {opt.option_text && <div className="option-text">{opt.option_text}</div>}
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                        {opt.is_correct && '✅ Correct Answer'}
                                                        {ans.selected === opt.id && !opt.is_correct && '❌ Your Answer'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
