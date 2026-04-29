-- Pure PostgreSQL Database Schema

-- Table: users (Stores Admins, Teachers, Students)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    department VARCHAR(100),
    rollNo VARCHAR(50),
    branch VARCHAR(100),
    batch VARCHAR(20),
    registeredDeviceId VARCHAR(255),
    totalClasses INT DEFAULT 0,
    classesAttended INT DEFAULT 0,
    mobile VARCHAR(15),
    profilePic TEXT
);

-- Table: attendance_logs (Daily Check-ins)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id SERIAL PRIMARY KEY,
    studentId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    timeIn TIME,
    timeOut TIME,
    status VARCHAR(50) DEFAULT 'Absent' CHECK (status IN ('Present', 'Absent', 'Left Campus', 'Outside Hours', 'Weekend', 'Not Started')),
    sessions JSONB,
    entryCount INT DEFAULT 0,
    totalDurationMinutes INT DEFAULT 0,
    validationStatus VARCHAR(50) DEFAULT 'Valid' CHECK (validationStatus IN ('Valid', 'Late Entry', 'Early Exit', 'Insufficient Time', 'Pending Review', 'Unmarked Presence')),
    validationReason TEXT,
    UNIQUE (studentId, date)
);

-- Table: system_settings (Geofence & Timings)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL
);

-- Table: device_requests
CREATE TABLE IF NOT EXISTS device_requests (
    id VARCHAR(100) PRIMARY KEY,
    studentId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    newDeviceId VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Table: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Class', 'Holiday')),
    reason VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified')),
    teacherId VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    batch VARCHAR(50) DEFAULT 'All',
    UNIQUE (date, batch)
);

-- Insert Default Admin
INSERT INTO users (id, email, password, name, role) 
VALUES ('admin', 'admin@smartcollege.edu', 'admin', 'Admin Portal Access', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Teachers
INSERT INTO users (id, email, password, name, role, department) VALUES 
('T1', 'teacher@smartcollege.edu', 'password123', 'Dr. Sarah Smith', 'teacher', 'Computer Science'),
('T2', 'mark.t@smartcollege.edu', 'password123', 'Prof. Mark Taylor', 'teacher', 'Information Tech')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Students
INSERT INTO users (id, email, password, name, role, rollNo, branch, batch, totalClasses, classesAttended) VALUES 
('S1', 'student@smartcollege.edu', 'password123', 'Alex Johnson', 'student', 'CS-2024-042', 'Computer Science', '2024', 45, 38),
('S2', 'priya.s@smartcollege.edu', 'password123', 'Priya Sharma', 'student', 'CS-2024-055', 'Computer Science', '2024', 45, 40)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Settings
INSERT INTO system_settings (setting_key, setting_value) VALUES 
('collegeTiming', '{"startTime":"08:00","endTime":"16:00"}'),
('geofence', '{"center":[19.1334,72.9133],"radius":300}')
ON CONFLICT (setting_key) DO NOTHING;
