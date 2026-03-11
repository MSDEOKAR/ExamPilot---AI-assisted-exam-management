import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { takeExam, submitExam } from '../services/api';

const API_URL = `http://${window.location.hostname}:5000`;

export default function ExamInterface() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const startedAt = useRef(new Date().toISOString());
    const timerRef = useRef(null);
    const studentId = localStorage.getItem('studentId');

    useEffect(() => {
        if (!studentId) {
            navigate('/');
            return;
        }
        loadExam();
        return () => clearInterval(timerRef.current);
    }, []);

    const loadExam = async () => {
        try {
            const { data } = await takeExam(examId, studentId);
            setExam(data.exam);
            setQuestions(data.questions);
            setTimeLeft(data.exam.duration * 60);
            setLoading(false);

            // Start timer
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load exam');
            setLoading(false);
            if (err.response?.data?.result_id) {
                navigate(`/result/${err.response.data.result_id}`);
            }
        }
    };

    // Auto-submit when timer reaches zero
    const handleSubmit = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);

        try {
            const { data } = await submitExam(examId, {
                student_id: studentId,
                answers,
                started_at: startedAt.current
            });
            navigate(`/result/${data.result_id}`);
        } catch (err) {
            if (err.response?.data?.result_id) {
                navigate(`/result/${err.response.data.result_id}`);
            } else {
                const errorData = err.response?.data;
                const errorMsg = errorData?.error || err.message;
                const errorDetails = errorData?.details ? `\n\nDetails: ${errorData.details}` : '';
                const errorCode = errorData?.code ? `\nCode: ${errorData.code}` : '';

                alert(`Submission failed: ${errorMsg}${errorDetails}${errorCode}`);
                setSubmitting(false);
            }
        }
    }, [answers, examId, studentId, submitting, navigate]);

    useEffect(() => {
        if (timeLeft === 0 && exam && !submitting) {
            handleSubmit();
        }
    }, [timeLeft, exam, submitting, handleSubmit]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getTimerClass = () => {
        if (timeLeft <= 60) return 'timer danger';
        if (timeLeft <= 300) return 'timer warning';
        return 'timer';
    };

    const selectAnswer = (questionId, optionId) => {
        setAnswers({ ...answers, [questionId]: optionId });
    };

    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;
    if (error) return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
            <div className="alert alert-error">{error}</div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
    );

    const question = questions[currentQ];

    return (
        <div className="exam-container">
            {/* Header with timer */}
            <div className="exam-header">
                <div>
                    <h3 style={{ fontSize: '16px', marginBottom: '2px' }}>{exam?.title}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Q {currentQ + 1} of {questions.length}
                    </span>
                </div>
                <div className={getTimerClass()}>
                    ⏱️ {formatTime(timeLeft)}
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { if (confirm('Are you sure you want to submit?')) handleSubmit(); }}
                    disabled={submitting}
                >
                    {submitting ? 'Submitting...' : '📤 Submit Exam'}
                </button>
            </div>

            {/* Question Navigation */}
            <div className="question-nav">
                {questions.map((q, i) => (
                    <button
                        key={q.id}
                        className={`question-nav-btn ${i === currentQ ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
                        onClick={() => setCurrentQ(i)}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>

            {/* Question */}
            {question && (
                <div className="question-card">
                    <div className="question-number">Question {currentQ + 1}</div>

                    {question.question_image && (
                        <img
                            src={`${API_URL}/uploads/${question.question_image}`}
                            alt="Question"
                            className="question-image"
                        />
                    )}

                    {question.question_text && (
                        <div className="question-text">{question.question_text}</div>
                    )}

                    {/* Options */}
                    <div style={{ marginTop: '24px' }}>
                        {question.options?.map((opt, i) => (
                            <div
                                key={opt.id}
                                className={`exam-option ${answers[question.id] === opt.id ? 'selected' : ''}`}
                                onClick={() => selectAnswer(question.id, opt.id)}
                            >
                                <div className="option-marker">{optionLetters[i]}</div>
                                {opt.option_image && (
                                    <img src={`${API_URL}/uploads/${opt.option_image}`} alt="" className="option-image" />
                                )}
                                {opt.option_text && <div className="option-text">{opt.option_text}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                            disabled={currentQ === 0}
                        >
                            ← Previous
                        </button>
                        {currentQ < questions.length - 1 ? (
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentQ(currentQ + 1)}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                className="btn btn-success"
                                onClick={() => { if (confirm('Submit your exam?')) handleSubmit(); }}
                                disabled={submitting}
                            >
                                📤 Submit Exam
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Stats bar */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', gap: '32px', padding: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    ✅ Answered: <strong style={{ color: 'var(--success)' }}>{Object.keys(answers).length}</strong>
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    ⏭️ Remaining: <strong style={{ color: 'var(--warning)' }}>{questions.length - Object.keys(answers).length}</strong>
                </span>
                {exam?.negative_marking > 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        ➖ Negative: <strong style={{ color: 'var(--error)' }}>{exam.negative_marking} per wrong</strong>
                    </span>
                )}
            </div>
        </div>
    );
}
