import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up file storage for notices
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads/notices');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Serve static files from uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection pool
app.get('/api/version', (req, res) => res.json({ version: '1.0.2-notice-fix' }));
app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

// This initializes on start and holds connections to MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_college',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Run migrations on start
(async () => {
    try {
        await pool.query('ALTER TABLE attendance_logs ADD COLUMN sessions JSON;');
        console.log("DB Migration: sessions column added successfully.");
    } catch (err) {
        if (err.errno === 1060) {
            // Error 1060 is ER_DUP_FIELDNAME (Duplicate column name)
            // This means the column already exists, which is the desired state.
            console.log("DB Migration: sessions column already exists.");
        } else {
            console.error("DB Migration Error:", err.message);
        }
    }

    try {
        await pool.query('ALTER TABLE users ADD COLUMN mobile VARCHAR(15);');
        console.log("DB Migration: mobile column added successfully.");
    } catch (err) {
        if (err.errno === 1060) {
            console.log("DB Migration: mobile column already exists.");
        } else {
            console.error("DB Migration Error (mobile):", err.message);
        }
    }

    try {
        await pool.query('ALTER TABLE users ADD COLUMN profilePic LONGTEXT;');
        console.log("DB Migration: profilePic column added successfully.");
    } catch (err) {
        if (err.errno === 1060) {
            console.log("DB Migration: profilePic column already exists.");
        } else {
            console.error("DB Migration Error (profilePic):", err.message);
        }
    }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                type ENUM('Class', 'Holiday') NOT NULL,
                reason VARCHAR(255),
                status ENUM('Pending', 'Verified') DEFAULT 'Pending',
                teacherId VARCHAR(50),
                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("DB Migration: calendar_events table checked/created.");
    } catch (err) {
        console.error("DB Migration Error (calendar_events):", err.message);
    }

    // Migration for Notices
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                type ENUM('Text', 'Image', 'PDF') DEFAULT 'Text',
                file_path VARCHAR(255),
                audience ENUM('Students', 'Teachers', 'Both') DEFAULT 'Both',
                branch VARCHAR(50) DEFAULT 'All',
                batch VARCHAR(50) DEFAULT 'All',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP NULL,
                priority ENUM('Normal', 'Urgent') DEFAULT 'Normal',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("DB Migration: notices table OK.");
    } catch (err) {
        console.error("DB Migration Error (notices):", err.message);
    }

    // Migration for Notice Analytics
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notice_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notice_id INT,
                user_id VARCHAR(50),
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("DB Migration: notice_analytics table OK.");
    } catch (err) {
        console.error("DB Migration Error (notice_analytics):", err.message);
    }

    // Migration 3: ensure system_settings exists with enough column space
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value LONGTEXT NOT NULL
            )
        `);
        // Ensure defaults exist
        await pool.query(`INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
            ('collegeTiming', '{"startTime":"08:00","endTime":"16:00"}'),
            ('geofence', '{"center":[19.1334,72.9133],"radius":300}')
        `);
        // Try to ALTER in case table existed with TEXT limit
        try {
            await pool.query(`ALTER TABLE system_settings MODIFY COLUMN setting_value LONGTEXT NOT NULL`);
            console.log('DB Migration: system_settings.setting_value upgraded to LONGTEXT.');
        } catch (_) { }
        console.log('DB Migration: system_settings table OK.');
    } catch (err) {
        console.error('DB Migration Error (system_settings):', err.message);
    }
    // Migration for Geofence Events
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS geofence_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                studentId VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                eventType ENUM('ENTRY', 'EXIT') NOT NULL,
                latitude DOUBLE,
                longitude DOUBLE,
                accuracy FLOAT,
                FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("DB Migration: geofence_events table OK.");
    } catch (err) {
        console.error("DB Migration Error (geofence_events):", err.message);
    }

    // Migration for attendance_logs extensions
    try {
        await pool.query('ALTER TABLE attendance_logs ADD COLUMN entryCount INT DEFAULT 0;');
        await pool.query('ALTER TABLE attendance_logs ADD COLUMN totalDurationMinutes INT DEFAULT 0;');
        await pool.query(`ALTER TABLE attendance_logs ADD COLUMN validationStatus ENUM('Valid', 'Late Entry', 'Early Exit', 'Insufficient Time', 'Pending Review', 'Unmarked Presence') DEFAULT 'Valid';`);
        await pool.query('ALTER TABLE attendance_logs ADD COLUMN validationReason TEXT;');
        console.log("DB Migration: attendance_logs extended successfully.");
    } catch (err) {
        if (err.errno === 1060) {
            console.log("DB Migration: attendance_logs columns already exist.");
        } else {
            console.error("DB Migration Error (attendance_logs extension):", err.message);
        }
    }
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action_type VARCHAR(50) NOT NULL,
                details TEXT,
                performed_by VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("DB Migration: audit_logs table checked/created.");
    } catch (err) {
        console.error("DB Migration Error (audit_logs):", err.message);
    }
})();

// Debug echo endpoint - helps test body parsing
app.post('/api/debug-echo', (req, res) => {
    console.log('[DEBUG ECHO] body:', JSON.stringify(req.body).substring(0, 500));
    res.json({ received: req.body, bodyKeys: Object.keys(req.body), contentType: req.headers['content-type'] });
});


// Basic Health Check Route
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        res.json({ status: 'ok', db: 'connected', result: rows[0].result });
    } catch (error) {
        console.error("DB Connection Failed:", error);
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
    }
});

// --- Authentication & Device Restrictions ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password, deviceId } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const user = users[0];

        // Ensure single device policy for students
        if (user.role === 'student') {
            // NEW CHECK: Prevent proxy attendance but allow request to swap device
            const [existingBinding] = await pool.query(
                'SELECT email, name FROM users WHERE registeredDeviceId = ? AND id != ? AND role = "student"',
                [deviceId, user.id]
            );

            const isDeviceTakenByOther = existingBinding.length > 0;

            if (isDeviceTakenByOther) {
                await pool.query(
                    'INSERT INTO audit_logs (action_type, details, performed_by) VALUES (?, ?, ?)',
                    [
                        'SECURITY_ALERT',
                        `Device Swap Attempt: ${user.name} (${user.email}) requested access on a device already bound to ${existingBinding[0].name}.`,
                        user.id
                    ]
                );
            }

            if (!user.registeredDeviceId && !isDeviceTakenByOther) {
                // First login, bind device ID
                await pool.query('UPDATE users SET registeredDeviceId = ? WHERE id = ?', [deviceId, user.id]);
                user.registeredDeviceId = deviceId;
            } else if (user.registeredDeviceId !== deviceId || isDeviceTakenByOther) {
                // Device mismatch OR existing device taken by someone else - create a request
                const [existing] = await pool.query('SELECT id FROM device_requests WHERE studentId = ? AND status = "pending"', [user.id]);

                if (existing.length === 0) {
                    const reqId = `req-${Date.now()}`;
                    await pool.query(
                        'INSERT INTO device_requests (id, studentId, newDeviceId, status) VALUES (?, ?, ?, "pending")',
                        [reqId, user.id, deviceId]
                    );
                }

                return res.status(403).json({
                    success: false,
                    error: 'Unrecognized Device. Login blocked. A request has been sent to the Admin to authorize this device.'
                });
            }
        }

        res.json({ success: true, user });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/auth/verify-device/:userId', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT registeredDeviceId FROM users WHERE id = ?', [req.params.userId]);
        if (users.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, registeredDeviceId: users[0].registeredDeviceId });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/device-requests', async (req, res) => {
    try {
        const [requests] = await pool.query(`
            SELECT dr.*, u.name as studentName 
            FROM device_requests dr 
            JOIN users u ON dr.studentId = u.id 
            WHERE dr.status = 'pending'
            ORDER BY dr.timestamp DESC
        `);
        res.json({ success: true, requests });
    } catch (error) {
        console.error("Fetch Requests Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/device-requests/approve', async (req, res) => {
    const { requestId } = req.body;
    try {
        // Get the request details
        const [requests] = await pool.query('SELECT * FROM device_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) return res.status(404).json({ success: false, error: 'Request not found' });

        const request = requests[0];

        // UNBIND the device from any other student who might be using it
        await pool.query('UPDATE users SET registeredDeviceId = NULL WHERE registeredDeviceId = ? AND id != ?', [request.newDeviceId, request.studentId]);

        // Update user's registered device
        await pool.query('UPDATE users SET registeredDeviceId = ? WHERE id = ?', [request.newDeviceId, request.studentId]);

        // Mark request as approved
        await pool.query('UPDATE device_requests SET status = "approved" WHERE id = ?', [requestId]);

        res.json({ success: true });
    } catch (error) {
        console.error("Approve Request Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/device-requests/reject', async (req, res) => {
    const { requestId } = req.body;
    try {
        await pool.query('UPDATE device_requests SET status = "rejected" WHERE id = ?', [requestId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Reject Request Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- Security Alerts & Auditing (Admin) ---
app.get('/api/admin/alerts', async (req, res) => {
    try {
        const [alerts] = await pool.query(`
            SELECT a.*, u.name, u.email 
            FROM audit_logs a
            LEFT JOIN users u ON a.performed_by = u.id
            WHERE a.action_type = 'SECURITY_ALERT'
            ORDER BY a.timestamp DESC
            LIMIT 50
        `);
        res.json({ success: true, alerts });
    } catch (error) {
        console.error("Fetch Alerts Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- System Settings (Admin) ---
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        rows.forEach(row => {
            // Parse JSON since we store them as strings in the DB
            try { settings[row.setting_key] = JSON.parse(row.setting_value); }
            catch (e) { settings[row.setting_key] = row.setting_value; }
        });

        // Ensure defaults exist if DB is fresh
        if (!settings.collegeTiming) settings.collegeTiming = { startTime: "08:00", endTime: "16:00" };
        if (!settings.geofence) settings.geofence = { center: [19.1334, 72.9133], radius: 300 };

        res.json({ success: true, settings });
    } catch (error) {
        console.error("Fetch Settings Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/settings/timings', async (req, res) => {
    const { startTime, endTime, adminId } = req.body;
    try {
        // 1. Get current settings for auditing
        const [[oldSettingsRow]] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "collegeTiming"');
        const oldSettings = oldSettingsRow ? JSON.parse(oldSettingsRow.setting_value) : { startTime: '08:00', endTime: '16:00' };

        // 2. Update settings
        const valStr = JSON.stringify({ startTime, endTime });
        await pool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES ("collegeTiming", ?) ON DUPLICATE KEY UPDATE setting_value = ?', [valStr, valStr]);

        // 3. Log the change
        await pool.query('INSERT INTO audit_logs (action_type, details, performed_by) VALUES (?, ?, ?)', [
            'TIME_BOUNDARY_CHANGE',
            `Changed from ${oldSettings.startTime}-${oldSettings.endTime} to ${startTime}-${endTime}`,
            adminId || 'admin'
        ]);

        // 4. Recalculate TODAY's attendance
        const today = new Date().toISOString().split('T')[0];

        // Fetch all students
        const [students] = await pool.query('SELECT id FROM users WHERE role = "student"');

        for (const student of students) {
            // Get all geofence events for today
            const [events] = await pool.query(
                'SELECT timestamp FROM geofence_events WHERE studentId = ? AND date = ? AND eventType = "ENTRY" ORDER BY timestamp ASC',
                [student.id, today]
            );

            let isPresent = false;
            let firstEntry = null;

            if (events.length > 0) {
                for (const ev of events) {
                    const eventTime = new Date(ev.timestamp).toTimeString().substring(0, 5); // "HH:MM"
                    if (eventTime >= startTime && eventTime <= endTime) {
                        isPresent = true;
                        if (!firstEntry) firstEntry = eventTime;
                        break;
                    }
                }
            }

            // Update or Insert attendance log
            if (isPresent) {
                await pool.query(
                    'INSERT INTO attendance_logs (studentId, date, timeIn, status) VALUES (?, ?, ?, "Present") ON DUPLICATE KEY UPDATE status = "Present", timeIn = COALESCE(timeIn, ?)',
                    [student.id, today, firstEntry, firstEntry]
                );
            } else {
                // Only change to Absent if it was previously Present (rule 3)
                // and if it's not a manual mark (we can't easily distinguish manual yet, but usually status is 'Present')
                await pool.query(
                    'UPDATE attendance_logs SET status = "Absent" WHERE studentId = ? AND date = ? AND status = "Present"',
                    [student.id, today]
                );
            }
        }

        res.json({ success: true, message: 'Settings updated and attendance recalculated.' });
    } catch (error) {
        console.error("Update Timings:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/settings/geofence', async (req, res) => {
    try {
        console.log('[Geofence POST] req.body received:', JSON.stringify(req.body));
        // Store the full body — supports both old {center,radius} and new {polygon:[...]} format
        const valStr = JSON.stringify(req.body);
        console.log('[Geofence POST] storing:', valStr.substring(0, 200));
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES ("geofence", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [valStr, valStr]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Update Geofence:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- NEW: Geofence Event Tracking ---
app.post('/api/geofence/event', async (req, res) => {
    const { studentId, eventType, latitude, longitude, accuracy } = req.body;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    try {
        await pool.query(
            'INSERT INTO geofence_events (studentId, date, eventType, latitude, longitude, accuracy) VALUES (?, ?, ?, ?, ?, ?)',
            [studentId, today, eventType, latitude, longitude, accuracy]
        );

        // Update entry count in attendance_logs if it's an ENTRY
        if (eventType === 'ENTRY') {
            await pool.query(
                `INSERT INTO attendance_logs (studentId, date, entryCount) 
                 VALUES (?, ?, 1) 
                 ON DUPLICATE KEY UPDATE entryCount = entryCount + 1`,
                [studentId, today]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Geofence Event Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/geofence/events/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { date } = req.query;
    try {
        const [events] = await pool.query(
            'SELECT * FROM geofence_events WHERE studentId = ? AND date = ? ORDER BY timestamp ASC',
            [studentId, date]
        );
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- User Management (Admin & Teacher) ---
app.get('/api/migrate', async (req, res) => {
    try {
        // Check if column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'mobile'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN mobile VARCHAR(15)");
            res.json({ success: true, message: 'Column mobile added successfully' });
        } else {
            res.json({ success: true, message: 'Column mobile already exists' });
        }
    } catch (error) {
        console.error("Migration Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { requesterId } = req.query;
        let queryStr = `
            SELECT u.id, u.email, u.password, u.name, u.role, u.department, u.rollNo, u.branch, u.batch, u.registeredDeviceId, u.totalClasses, u.mobile, u.profilePic,
            (SELECT COUNT(*) FROM attendance_logs WHERE studentId = u.id AND status = 'Present') as classesAttended 
            FROM users u
        `;
        let queryParams = [];

        if (requesterId) {
            const [requesterInfo] = await pool.query('SELECT role, branch FROM users WHERE id = ?', [requesterId]);
            if (requesterInfo.length > 0) {
                const requesterRole = requesterInfo[0].role;
                const requesterBranch = requesterInfo[0].branch;

                if (requesterRole === 'teacher') {
                    // Teachers only see non-students OR students in their branch
                    queryStr += " WHERE u.role != 'student' OR (u.role = 'student' AND u.branch = ?)";
                    queryParams.push(requesterBranch);
                }
            }
        }

        const [users] = await pool.query(queryStr, queryParams);
        res.json({ success: true, users });
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic } = req.body;
    try {
        const customId = id || (role === 'teacher' ? `T-${Date.now()}` : `S-${Date.now()}`);
        await pool.query(
            'INSERT INTO users (id, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [customId, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic || null]
        );
        res.json({ success: true, message: 'User created' });
    } catch (error) {
        console.error("Create User:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, branch, batch, department, rollNo, mobile, registeredDeviceId, profilePic } = req.body;
    try {
        await pool.query(
            `UPDATE users SET
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                password = COALESCE(?, password),
                branch = COALESCE(?, branch),
                batch = COALESCE(?, batch),
                department = COALESCE(?, department),
                rollNo = COALESCE(?, rollNo),
                mobile = COALESCE(?, mobile),
                profilePic = COALESCE(?, profilePic),
                registeredDeviceId = ?
            WHERE id = ?`,
            [name, email, password, branch, batch, department, rollNo, mobile, profilePic !== undefined ? profilePic : null, registeredDeviceId ?? null, id]
        );
        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        console.error("Update User:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});



// --- Attendance Tracking APIs ---
app.post('/api/attendance/mark', async (req, res) => {
    const { studentId, status, timeIn, timeOut, sessions } = req.body;

    // Support receiving date from frontend if needed, otherwise use strict server local time
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    try {
        // Atomic Upsert to avoid race conditions (ER_DUP_ENTRY)
        const insertQuery = `
            INSERT INTO attendance_logs (studentId, date, status, timeIn, timeOut, sessions)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, JSON_ARRAY()))
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                timeIn = COALESCE(attendance_logs.timeIn, VALUES(timeIn)),
                timeOut = VALUES(timeOut),
                sessions = VALUES(sessions)
        `;
        const sessionsJson = sessions ? JSON.stringify(sessions) : null;

        await pool.query(
            insertQuery,
            [studentId, today, status, timeIn, timeOut, sessionsJson]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Mark Attendance Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/attendance/manual-mark', async (req, res) => {
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        const valStatus = status === 'Present' ? 'Valid' : 'Pending Review';
        const valReason = status === 'Present' ? 'Manually Approved' : 'Manually Rejected';
        const insertQuery = `
            INSERT INTO attendance_logs (studentId, date, status, validationStatus, validationReason)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                validationStatus = VALUES(validationStatus),
                validationReason = VALUES(validationReason)
        `;

        await pool.query(insertQuery, [studentId, date, status, valStatus, valReason]);
        res.json({ success: true });
    } catch (error) {
        console.error("Manual Mark Attendance Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/logs/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const [logs] = await pool.query('SELECT * FROM attendance_logs WHERE studentId = ? ORDER BY date DESC LIMIT 10', [studentId]);
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Fetch Logs Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/today', async (req, res) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
        const [logs] = await pool.query('SELECT * FROM attendance_logs WHERE date = ?', [today]);
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Fetch Today Logs Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/date/:date', async (req, res) => {
    const { date } = req.params;
    try {
        const [logs] = await pool.query('SELECT * FROM attendance_logs WHERE date = ?', [date]);
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Fetch Date Logs Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/range', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'Missing startDate or endDate' });
    }
    try {
        const [logs] = await pool.query('SELECT * FROM attendance_logs WHERE date >= ? AND date <= ?', [startDate, endDate]);
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Fetch Range Logs Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- NEW: Detailed Activity Log & Validation ---
app.get('/api/attendance/detailed-logs', async (req, res) => {
    const { date, branch, requesterId } = req.query;
    try {
        // 1. Determine branch filter if requester is a teacher
        let branchFilter = branch;
        if (requesterId && requesterId.startsWith('T-')) {
            const [[teacher]] = await pool.query('SELECT branch FROM users WHERE id = ?', [requesterId]);
            if (teacher) branchFilter = teacher.branch;
        }

        // 2. We want to show activity for ALL students who have EITHER an attendance_logs entry OR geofence_events entry
        // But simpler: just get all students and then check for data.
        let usersQuery = "SELECT id, name, branch, batch, rollNo FROM users WHERE role = 'student'";
        let userParams = [];
        if (branchFilter && branchFilter !== 'All') {
            usersQuery += " AND branch = ?";
            userParams.push(branchFilter);
        }
        const [students] = await pool.query(usersQuery, userParams);

        const logs = [];
        for (let s of students) {
            // Check attendance log
            const [[attLog]] = await pool.query(
                'SELECT * FROM attendance_logs WHERE studentId = ? AND date = ?',
                [s.id, date]
            );

            // Check geofence events
            const [events] = await pool.query(
                'SELECT timestamp, eventType FROM geofence_events WHERE studentId = ? AND date = ? ORDER BY timestamp ASC',
                [s.id, date]
            );

            if (attLog || events.length > 0) {
                logs.push({
                    ...s,
                    status: attLog ? attLog.status : 'No Log',
                    timeIn: attLog ? attLog.timeIn : '--',
                    timeOut: attLog ? attLog.timeOut : '--',
                    totalDurationMinutes: attLog ? attLog.totalDurationMinutes : null,
                    validationStatus: attLog ? attLog.validationStatus : 'Pending',
                    validationReason: attLog ? attLog.validationReason : null,
                    entryCount: events.filter(e => e.eventType === 'ENTRY').length,
                    timeline: events
                });
            }
        }

        res.json({ success: true, logs });
    } catch (error) {
        console.error("Detailed Logs API Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/attendance/validate', async (req, res) => {
    const { studentId, date } = req.body;
    try {
        const [[settings]] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "collegeTiming"');
        const timing = JSON.parse(settings);

        const [events] = await pool.query(
            'SELECT timestamp, eventType FROM geofence_events WHERE studentId = ? AND date = ? ORDER BY timestamp ASC',
            [studentId, date]
        );

        if (events.length === 0) {
            return res.json({ success: true, message: 'No geofence activity found' });
        }

        let totalMinutes = 0;
        let lastEntryTime = null;

        events.forEach(ev => {
            const time = new Date(ev.timestamp);
            if (ev.eventType === 'ENTRY') {
                lastEntryTime = time;
            } else if (ev.eventType === 'EXIT' && lastEntryTime) {
                totalMinutes += (time - lastEntryTime) / (1000 * 60);
                lastEntryTime = null;
            }
        });

        // If still inside, count until now (or college end time if today has passed)
        if (lastEntryTime) {
            const now = new Date();
            const collegeEndTime = new Date(date + 'T' + timing.endTime);
            const endTime = now < collegeEndTime ? now : collegeEndTime;
            if (endTime > lastEntryTime) {
                totalMinutes += (endTime - lastEntryTime) / (1000 * 60);
            }
        }

        // Simple validation logic
        let status = 'Valid';
        let reason = '';

        const firstEntry = new Date(events[0].timestamp);
        const collegeStartTime = new Date(date + 'T' + timing.startTime);

        if (firstEntry > new Date(collegeStartTime.getTime() + 15 * 60000)) {
            status = 'Late Entry';
            reason = 'Entered after 15 min buffer';
        }

        if (totalMinutes < 240) { // e.g., 4 hours minimum
            status = 'Insufficient Time';
            reason = `Spent only ${Math.round(totalMinutes)} minutes on campus`;
        }

        await pool.query(
            'UPDATE attendance_logs SET totalDurationMinutes = ?, validationStatus = ?, validationReason = ? WHERE studentId = ? AND date = ?',
            [Math.round(totalMinutes), status, reason, studentId, date]
        );

        res.json({ success: true, status, totalMinutes });
    } catch (error) {
        console.error("Validation Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Calendar APIs ---
app.get('/api/calendar', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM calendar_events ORDER BY date ASC';
        let params = [];
        if (status) {
            query = 'SELECT * FROM calendar_events WHERE status = ? ORDER BY date ASC';
            params = [status];
        }
        const [events] = await pool.query(query, params);
        res.json({ success: true, events });
    } catch (error) {
        console.error("Fetch Calendar Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/calendar', async (req, res) => {
    // Determine if it's a batch (array) or a single object. We will strictly use batch going forward.
    const eventsToProcess = Array.isArray(req.body) ? req.body : [req.body];

    try {
        const insertQuery = `
            INSERT INTO calendar_events (date, type, reason, status, teacherId)
            VALUES (?, ?, ?, 'Pending', ?)
            ON DUPLICATE KEY UPDATE
                type = ?,
                reason = ?,
                status = 'Pending',
                teacherId = ?
        `;

        for (const event of eventsToProcess) {
            const date = event.date || null;
            const type = event.type || null;
            const reason = event.reason || '';
            const teacherId = event.teacherId || null;

            try {
                // Attempt insert with the provided teacherId, passing params twice for ON DUPLICATE KEY UPDATE
                await pool.query(insertQuery, [date, type, reason, teacherId, type, reason, teacherId]);
            } catch (err) {
                // If it's a foreign key constraint error (e.g. stale teacher ID in localStorage)
                if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
                    console.warn(`Foreign key error for teacherId ${teacherId}, retrying with null...`);
                    await pool.query(insertQuery, [date, type, reason, null, type, reason, null]);
                } else {
                    throw err; // Re-throw if it's a different error
                }
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Add Calendar Event Error:", error);
        res.status(500).json({ success: false, error: error.message || error.toString() });
    }
});

app.put('/api/calendar/verify-all', async (req, res) => {
    try {
        await pool.query("UPDATE calendar_events SET status = 'Verified' WHERE status = 'Pending'");
        res.json({ success: true });
    } catch (error) {
        console.error("Verify All Calendar Events Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.put('/api/calendar/:id/verify', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE calendar_events SET status = "Verified" WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Verify Calendar Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.delete('/api/calendar/reject-all', async (req, res) => {
    try {
        await pool.query("DELETE FROM calendar_events WHERE status = 'Pending'");
        res.json({ success: true });
    } catch (error) {
        console.error("Reject All Calendar Events Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- Notice Management APIs ---
app.get('/api/notices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices ORDER BY created_at DESC');
        res.json({ success: true, notices: rows });
    } catch (error) {
        console.error("Fetch Notices Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/notices/active', async (req, res) => {
    const { userId, role, branch, batch } = req.query;
    try {
        // Admins don't get popups
        if (role === 'admin') {
            return res.json({ success: true, notices: [] });
        }

        // Fetch notices that are currently active and target the user
        const now = new Date();
        const [rows] = await pool.query(`
            SELECT n.*, 
            (SELECT COUNT(*) FROM notice_analytics WHERE notice_id = n.id AND user_id = ?) as viewCount
            FROM notices n
            WHERE (n.end_date IS NULL OR n.end_date >= ?)
            AND (n.start_date <= ?)
            AND (n.audience = 'Both' OR n.audience = ?)
            AND (n.branch = 'All' OR n.branch = ?)
            AND (n.batch = 'All' OR n.batch = ?)
            ORDER BY n.priority DESC, n.created_at DESC
        `, [userId, now, now, role === 'student' ? 'Students' : role === 'teacher' ? 'Teachers' : 'Both', branch || 'All', batch || 'All']);

        res.json({ success: true, notices: rows });
    } catch (error) {
        console.error("Fetch Active Notices Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/notices', upload.single('file'), async (req, res) => {
    const { title, description, type, audience, branch, batch, start_date, end_date, priority } = req.body;
    const file_path = req.file ? `/uploads/notices/${req.file.filename}` : null;

    // Convert empty strings to null for database
    const sDate = start_date && start_date !== '' ? start_date : null;
    const eDate = end_date && end_date !== '' ? end_date : null;

    try {
        const [result] = await pool.query(
            `INSERT INTO notices (title, description, type, file_path, audience, branch, batch, start_date, end_date, priority)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, type, file_path, audience, branch, batch, sDate, eDate, priority || 'Normal']
        );
        res.json({ success: true, noticeId: result.insertId });
    } catch (error) {
        console.error("Create Notice Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/notices/:id', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, description, type, audience, branch, batch, start_date, end_date, priority } = req.body;
    let file_path = req.body.file_path; // Keep existing if not uploading new
    if (req.file) {
        file_path = `/uploads/notices/${req.file.filename}`;
    }

    // Convert empty strings to null for database
    const sDate = start_date && start_date !== '' ? start_date : null;
    const eDate = end_date && end_date !== '' ? end_date : null;

    try {
        await pool.query(
            `UPDATE notices SET 
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                type = COALESCE(?, type),
                file_path = COALESCE(?, file_path),
                audience = COALESCE(?, audience),
                branch = COALESCE(?, branch),
                batch = COALESCE(?, batch),
                start_date = COALESCE(?, start_date),
                end_date = ?,
                priority = COALESCE(?, priority)
            WHERE id = ?`,
            [title, description, type, file_path, audience, branch, batch, sDate, eDate, priority, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Update Notice Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/notices/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Notice Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/notices/:id/view', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        await pool.query('INSERT IGNORE INTO notice_analytics (notice_id, user_id) VALUES (?, ?)', [id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Track Notice View Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/notices/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM notice_analytics WHERE notice_id = ?) as totalViews,
                u.name, u.role, u.rollNo, na.viewed_at
            FROM notice_analytics na
            JOIN users u ON na.user_id = u.id
            WHERE na.notice_id = ?
            ORDER BY na.viewed_at DESC
        `, [id, id]);

        res.json({ success: true, stats: stats });
    } catch (error) {
        console.error("Fetch Notice Stats Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.delete('/api/calendar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM calendar_events WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Calendar Event Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --- SEMESTER APIS ---

// Helper to auto-update semester states based on dates
const updateSemesterStates = async (branch, batch) => {
    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Any Approved Upcoming semester whose start date has arrived becomes Active
        await pool.query(
            `UPDATE semesters SET state = 'Active' 
             WHERE status = 'Approved' AND state = 'Upcoming' AND start_date IS NOT NULL AND start_date <= ? AND branch = ? AND batch = ?`,
            [todayStr, branch, batch]
        );

        // Any Active semester whose end date has passed becomes Ended
        await pool.query(
            `UPDATE semesters SET state = 'Ended' 
             WHERE status = 'Approved' AND state = 'Active' AND end_date IS NOT NULL AND end_date < ? AND branch = ? AND batch = ?`,
            [todayStr, branch, batch]
        );
    } catch (err) {
        console.error("Error auto-updating semester states:", err);
    }
};

app.get('/api/semesters', async (req, res) => {
    const { branch, batch } = req.query;
    try {
        if (branch && batch && branch !== 'All' && batch !== 'All') {
            await updateSemesterStates(branch, batch);
            const [rows] = await pool.query('SELECT * FROM semesters WHERE branch = ? AND batch = ? ORDER BY created_at DESC', [branch, batch]);
            res.json({ success: true, semesters: rows });
        } else {
            const [rows] = await pool.query('SELECT * FROM semesters ORDER BY created_at DESC');
            res.json({ success: true, semesters: rows });
        }
    } catch (error) {
        console.error("Fetch Semesters Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/semesters/active', async (req, res) => {
    const { branch, batch } = req.query;
    if (!branch || !batch || branch === 'All' || batch === 'All') {
        return res.json({ success: true, semester: null });
    }
    try {
        await updateSemesterStates(branch, batch);
        // Find Active first, or fallback to Upcoming
        const [rows] = await pool.query(`SELECT * FROM semesters WHERE branch = ? AND batch = ? AND status = 'Approved' AND state IN ('Active', 'Upcoming') ORDER BY state ASC LIMIT 1`, [branch, batch]);
        res.json({ success: true, semester: rows.length > 0 ? rows[0] : null });
    } catch (error) {
        console.error("Fetch Active Semester Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/semesters', async (req, res) => {
    const { name, branch, batch, start_date, end_date } = req.body;
    try {
        await pool.query(
            `INSERT INTO semesters (name, branch, batch, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
            [name, branch, batch, start_date || null, end_date || null]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Create Semester Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.put('/api/semesters/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        if (Object.keys(updates).length > 0) {
            const setClauses = [];
            const values = [];
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = ?`);
                values.push(value === '' ? null : value);
            }
            values.push(id);
            await pool.query(`UPDATE semesters SET ${setClauses.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Update Semester Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Make sure to create the database using db.sql before making API requests!`);
});
