# ExamPilot - AI-Assisted Exam Management System

<p>
  <img src="https://img.shields.io/badge/React-18.3-blue?style=flat&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Express-4.21-green?style=flat&logo=node.js" alt="Express">
  <img src="https://img.shields.io/badge/MySQL-8.0-orange?style=flat&logo=mysql" alt="MySQL">
  <img src="https://img.shields.io/badge/OCR-Tesseract.js-red?style=flat" alt="Tesseract">
</p>

AI-Powered exam management system with automated question extraction, intelligent tagging, and seamless exam conduction.

## Features

- **AI-Powered Question Processing**
  - OCR-based text extraction from images using Tesseract.js
  - Automatic question splitting from bulk text
  - Intelligent answer matching from answer keys
  - Auto-tagging questions by subject (Math, Physics, Chemistry, Biology, etc.)
  - Automatic difficulty detection (Easy/Medium/Hard)

- **Question Management**
  - Batch question import (Text & JSON)
  - Manual question creation with rich options
  - Image support for questions and options
  - Question tagging and categorization

- **Exam Management**
  - Create and schedule exams
  - Configurable duration, marks, and negative marking
  - Multiple exam status (Draft, Scheduled, Active, Completed)

- **Student Interface**
  - Clean exam interface with timer
  - Auto-submit on time expiry
  - Instant result calculation

- **Admin Dashboard**
  - View all exams and results
  - Student performance analytics
  - Manage question bank

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Express.js, Node.js |
| Database | MySQL |
| OCR/AI | Tesseract.js, Sharp (Image Processing) |
| Authentication | JWT, bcryptjs |

## Project Structure

```
ExamPilot/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React context (Auth)
│   │   └── App.jsx        # Main app component
│   └── package.json
├── server/                 # Express Backend
│   ├── config/            # Database configuration
│   ├── middleware/        # Auth & Upload middleware
│   ├── routes/           # API routes
│   ├── utils/            # AI & OCR utilities
│   ├── uploads/          # Uploaded files
│   ├── package.json
│   └── server.js         # Entry point
└── database/              # SQL Schema
    └── schema.sql
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL (v8.0+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MSDEOKAR/ExamPilot---AI-assisted-exam-management.git
   cd ExamPilot
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Database Setup**

   Create a MySQL database and run the schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Environment Variables**

   Edit `server/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=mock_exam_db
   JWT_SECRET=your_secret_key
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   Server runs on: http://localhost:5000

2. **Start the frontend (in a new terminal)**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on: http://localhost:5173 (or 3000)

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin

### Questions
- `GET /api/questions` - Get all questions
- `POST /api/questions` - Create question
- `POST /api/questions/batch-split` - AI process text
- `DELETE /api/questions/:id` - Delete question

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Register student
- `GET /api/students/:id/exam/:examId` - Get student's exam

### Results
- `GET /api/results` - Get all results
- `POST /api/results` - Submit exam result

## AI Features Explained

### Question Auto-Tagging
The system analyzes question text and automatically tags it with relevant subjects:
- Mathematics, Physics, Chemistry, Biology
- Computer Science, English, General Knowledge

### Difficulty Detection
Analyzes keywords and question length to determine:
- **Easy**: Basic recall questions (< 15 words)
- **Medium**: Standard questions
- **Hard**: Analytical/prove questions (> 80 words)

### Answer Matching
Supports multiple answer key formats:
- `1-A, 2. B, 3) C`
- `1 A, 2 B, 3 C`

## License

This project is licensed under the MIT License.

---

Built with love using React and Express
