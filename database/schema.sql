-- AI-Powered Mock Exam Platform Database Schema

CREATE DATABASE IF NOT EXISTS mock_exam_db;
USE mock_exam_db;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INT NOT NULL DEFAULT 60 COMMENT 'Duration in minutes',
  total_questions INT NOT NULL DEFAULT 10,
  negative_marking DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Marks deducted per wrong answer',
  marks_per_question DECIMAL(3,2) DEFAULT 1.00,
  status ENUM('draft', 'scheduled', 'active', 'completed') DEFAULT 'draft',
  scheduled_at DATETIME,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT,
  question_text TEXT,
  question_image VARCHAR(500),
  ocr_text TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  tags VARCHAR(500),
  question_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT,
  option_image VARCHAR(500),
  is_correct TINYINT(1) DEFAULT 0,
  option_order INT DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  score DECIMAL(6,2) DEFAULT 0,
  total_marks DECIMAL(6,2) DEFAULT 0,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  unanswered_count INT DEFAULT 0,
  answers JSON,
  started_at DATETIME,
  submitted_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Insert default admin (password: admin123)
INSERT INTO admins (username, password) VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
