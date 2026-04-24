-- Database Creation
CREATE DATABASE IF NOT EXISTS smart_college;
USE smart_college;

-- Table: users (Stores Admins, Teachers, Students)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL,
    department VARCHAR(100),
    rollNo VARCHAR(50),
    branch VARCHAR(100),
    batch VARCHAR(20),
    registeredDeviceId VARCHAR(255),
    totalClasses INT DEFAULT 0,
    classesAttended INT DEFAULT 0,
    mobile VARCHAR(15)
);

-- Table: attendance_logs (Daily Check-ins)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentId VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    timeIn TIME,
    timeOut TIME,
    status ENUM('Present', 'Absent', 'Left Campus', 'Outside Hours', 'Weekend', 'Not Started') DEFAULT 'Absent',
    sessions JSON,
    FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_log (studentId, date)
);

-- Table: system_settings (Geofence & Timings)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL
);

-- Table: device_requests
CREATE TABLE IF NOT EXISTS device_requests (
    id VARCHAR(100) PRIMARY KEY,
    studentId VARCHAR(50) NOT NULL,
    newDeviceId VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    type ENUM('Class', 'Holiday') NOT NULL,
    reason VARCHAR(255),
    status ENUM('Pending', 'Verified') DEFAULT 'Pending',
    teacherId VARCHAR(50),
    FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert Default Admin
INSERT IGNORE INTO users (id, email, password, name, role) 
VALUES ('admin', 'admin@smartcollege.edu', 'admin', 'Admin Portal Access', 'admin');

-- Insert Default Teachers
INSERT IGNORE INTO users (id, email, password, name, role, department) VALUES 
('T1', 'teacher@smartcollege.edu', 'password123', 'Dr. Sarah Smith', 'teacher', 'Computer Science'),
('T2', 'mark.t@smartcollege.edu', 'password123', 'Prof. Mark Taylor', 'teacher', 'Information Tech');

-- Insert Default Students
INSERT IGNORE INTO users (id, email, password, name, role, rollNo, branch, batch, totalClasses, classesAttended) VALUES 
('S1', 'student@smartcollege.edu', 'password123', 'Alex Johnson', 'student', 'CS-2024-042', 'Computer Science', '2024', 45, 38),
('S2', 'priya.s@smartcollege.edu', 'password123', 'Priya Sharma', 'student', 'CS-2024-055', 'Computer Science', '2024', 45, 40);

-- Insert Default Settings
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
('collegeTiming', '{"startTime":"08:00","endTime":"16:00"}'),
('geofence', '{"center":[19.1334,72.9133],"radius":300}');
