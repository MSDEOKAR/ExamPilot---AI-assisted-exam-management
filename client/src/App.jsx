import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import QuestionUpload from './pages/QuestionUpload';
import ExamManager from './pages/ExamManager';
import ResultsViewer from './pages/ResultsViewer';
import StudentEntry from './pages/StudentEntry';
import ExamInterface from './pages/ExamInterface';
import ExamResult from './pages/ExamResult';

function ProtectedRoute({ children }) {
    const { admin, loading } = useAuth();
    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
    return admin ? children : <Navigate to="/admin/login" />;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Student Routes */}
                    <Route path="/" element={<StudentEntry />} />
                    <Route path="/exam/:examId" element={<ExamInterface />} />
                    <Route path="/result/:resultId" element={<ExamResult />} />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/admin/questions" element={<ProtectedRoute><QuestionUpload /></ProtectedRoute>} />
                    <Route path="/admin/exams" element={<ProtectedRoute><ExamManager /></ProtectedRoute>} />
                    <Route path="/admin/results" element={<ProtectedRoute><ResultsViewer /></ProtectedRoute>} />
                    <Route path="/admin/results/:examId" element={<ProtectedRoute><ResultsViewer /></ProtectedRoute>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
