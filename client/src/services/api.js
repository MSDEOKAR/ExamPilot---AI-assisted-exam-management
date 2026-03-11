import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ======== AUTH ========
export const loginAdmin = (data) => api.post('/auth/login', data);
export const registerAdmin = (data) => api.post('/auth/register', data);

// ======== QUESTIONS ========
export const getQuestions = (examId) => api.get('/questions', { params: examId ? { exam_id: examId } : {} });
export const getQuestion = (id) => api.get(`/questions/${id}`);
export const createQuestion = (formData) => api.post('/questions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateQuestion = (id, formData) => api.put(`/questions/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
export const ocrImage = (formData) => api.post('/questions/ocr', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const aiAnalyze = (data) => api.post('/questions/ai-analyze', data);

// ======== EXAMS ========
export const getExams = () => api.get('/exams');
export const getExam = (id) => api.get(`/exams/${id}`);
export const createExam = (data) => api.post('/exams', data);
export const updateExam = (id, data) => api.put(`/exams/${id}`, data);
export const deleteExam = (id) => api.delete(`/exams/${id}`);
export const startExam = (id) => api.post(`/exams/${id}/start`);
export const completeExam = (id) => api.post(`/exams/${id}/complete`);
export const addQuestionsToExam = (id, questionIds) => api.post(`/exams/${id}/add-questions`, { question_ids: questionIds });

// ======== STUDENTS ========
export const registerStudent = (data) => api.post('/students/register', data);
export const getActiveExams = () => api.get('/students/exams');
export const takeExam = (examId, studentId) => api.get(`/students/exams/${examId}/take`, { params: { student_id: studentId } });
export const submitExam = (examId, data) => api.post(`/students/exams/${examId}/submit`, data);

// ======== RESULTS ========
export const getExamResults = (examId) => api.get(`/results/exam/${examId}`);
export const getResult = (id) => api.get(`/results/${id}`);
export const getDashboardStats = () => api.get('/results/stats/dashboard');

export default api;
