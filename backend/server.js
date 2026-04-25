import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Render/Vercel Root check
app.get('/', (req, res) => {
    res.send("Backend running 🚀");
});

app.get('/api/version', (req, res) => res.json({ version: '1.0.3-pg-native' }));
app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Run migrations on start
(async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Check sessions column in attendance_logs
        let res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='sessions'`);
        if (res.rowCount === 0) {
            await client.query('ALTER TABLE attendance_logs ADD COLUMN sessions JSONB');
            console.log("DB Migration: sessions column added.");
        }

        // Check mobile column in users
        res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='mobile'`);
        if (res.rowCount === 0) {
            await client.query('ALTER TABLE users ADD COLUMN mobile VARCHAR(15)');
            console.log("DB Migration: mobile column added.");
        }

        // Check profilePic column in users
        res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='profilepic'`);
        if (res.rowCount === 0) {
            await client.query('ALTER TABLE users ADD COLUMN profilePic TEXT');
            console.log("DB Migration: profilePic column added.");
        }

        // Create notices
        await client.query(`
            CREATE TABLE IF NOT EXISTS notices (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                type VARCHAR(50) DEFAULT 'Text',
                file_path VARCHAR(255),
                audience VARCHAR(50) DEFAULT 'Both',
                branch VARCHAR(50) DEFAULT 'All',
                batch VARCHAR(50) DEFAULT 'All',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP NULL,
                priority VARCHAR(50) DEFAULT 'Normal',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create notice_analytics
        await client.query(`
            CREATE TABLE IF NOT EXISTS notice_analytics (
                id SERIAL PRIMARY KEY,
                notice_id INT REFERENCES notices(id) ON DELETE CASCADE,
                user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(notice_id, user_id)
            )
        `);

        // Create geofence_events
        await client.query(`
            CREATE TABLE IF NOT EXISTS geofence_events (
                id SERIAL PRIMARY KEY,
                studentId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                eventType VARCHAR(50) NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                accuracy REAL
            )
        `);

        // Check attendance_logs extra columns
        res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='entrycount'`);
        if (res.rowCount === 0) {
            await client.query('ALTER TABLE attendance_logs ADD COLUMN entryCount INT DEFAULT 0');
            await client.query('ALTER TABLE attendance_logs ADD COLUMN totalDurationMinutes INT DEFAULT 0');
            await client.query(`ALTER TABLE attendance_logs ADD COLUMN validationStatus VARCHAR(50) DEFAULT 'Valid'`);
            await client.query('ALTER TABLE attendance_logs ADD COLUMN validationReason TEXT');
            console.log("DB Migration: attendance_logs extended.");
        }

        // Create audit_logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                action_type VARCHAR(50) NOT NULL,
                details TEXT,
                performed_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create semesters table (missing from previous init)
        await client.query(`
            CREATE TABLE IF NOT EXISTS semesters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                branch VARCHAR(100) NOT NULL,
                batch VARCHAR(50) NOT NULL,
                start_date DATE,
                end_date DATE,
                status VARCHAR(50) DEFAULT 'Approved',
                state VARCHAR(50) DEFAULT 'Upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query("COMMIT");
        console.log("DB Migrations completed successfully.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DB Migration Error:", err.message);
    } finally {
        client.release();
    }
})();

app.post('/api/debug-echo', (req, res) => {
    res.json({ received: req.body, bodyKeys: Object.keys(req.body), contentType: req.headers['content-type'] });
});

app.get('/api/health', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT 1 + 1 AS result');
        res.json({ status: 'ok', db: 'connected', result: rows[0].result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
    }
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
    const { email, password, deviceId } = req.body;
    try {
        const { rows: users } = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        let user = users[0];
        user = { ...user, profilePic: user.profilepic, registeredDeviceId: user.registereddeviceid };

        if (user.role === 'student') {
            const { rows: existingBinding } = await pool.query(
                'SELECT email, name FROM users WHERE registeredDeviceId = $1 AND id != $2 AND role = $3',
                [deviceId, user.id, 'student']
            );

            const isDeviceTakenByOther = existingBinding.length > 0;

            if (isDeviceTakenByOther) {
                await pool.query(
                    'INSERT INTO audit_logs (action_type, details, performed_by) VALUES ($1, $2, $3)',
                    [
                        'SECURITY_ALERT',
                        `Device Swap Attempt: ${user.name} (${user.email}) requested access on a device already bound to ${existingBinding[0].name}.`,
                        user.id
                    ]
                );
            }

            if (!user.registeredDeviceId && !isDeviceTakenByOther) {
                await pool.query('UPDATE users SET registeredDeviceId = $1 WHERE id = $2', [deviceId, user.id]);
                user.registeredDeviceId = deviceId;
            } else if (user.registeredDeviceId !== deviceId || isDeviceTakenByOther) {
                const { rows: existing } = await pool.query('SELECT id FROM device_requests WHERE studentId = $1 AND status = $2', [user.id, 'pending']);
                if (existing.length === 0) {
                    const reqId = `req-${Date.now()}`;
                    await pool.query(
                        'INSERT INTO device_requests (id, studentId, newDeviceId, status) VALUES ($1, $2, $3, $4)',
                        [reqId, user.id, deviceId, 'pending']
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
        const { rows: users } = await pool.query('SELECT registeredDeviceId FROM users WHERE id = $1', [req.params.userId]);
        if (users.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, registeredDeviceId: users[0].registereddeviceid });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/device-requests', async (req, res) => {
    try {
        const { rows: requests } = await pool.query(`
            SELECT dr.*, u.name as studentName 
            FROM device_requests dr 
            JOIN users u ON dr.studentId = u.id 
            WHERE dr.status = 'pending'
            ORDER BY dr.timestamp DESC
        `);
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/device-requests/approve', async (req, res) => {
    const { requestId } = req.body;
    try {
        const { rows: requests } = await pool.query('SELECT * FROM device_requests WHERE id = $1', [requestId]);
        if (requests.length === 0) return res.status(404).json({ success: false, error: 'Request not found' });
        const request = requests[0];

        await pool.query('UPDATE users SET registeredDeviceId = NULL WHERE registeredDeviceId = $1 AND id != $2', [request.newdeviceid, request.studentid]);
        await pool.query('UPDATE users SET registeredDeviceId = $1 WHERE id = $2', [request.newdeviceid, request.studentid]);
        await pool.query('UPDATE device_requests SET status = $1 WHERE id = $2', ['approved', requestId]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/device-requests/reject', async (req, res) => {
    const { requestId } = req.body;
    try {
        await pool.query('UPDATE device_requests SET status = $1 WHERE id = $2', ['rejected', requestId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/admin/alerts', async (req, res) => {
    try {
        const { rows: alerts } = await pool.query(`
            SELECT a.*, u.name, u.email 
            FROM audit_logs a
            LEFT JOIN users u ON a.performed_by = u.id
            WHERE a.action_type = 'SECURITY_ALERT'
            ORDER BY a.timestamp DESC
            LIMIT 50
        `);
        res.json({ success: true, alerts });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        rows.forEach(row => {
            try { settings[row.setting_key] = JSON.parse(row.setting_value); }
            catch (e) { settings[row.setting_key] = row.setting_value; }
        });
        if (!settings.collegeTiming) settings.collegeTiming = { startTime: "08:00", endTime: "16:00" };
        if (!settings.geofence) settings.geofence = { center: [19.1334, 72.9133], radius: 300 };
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/settings/timings', async (req, res) => {
    const { startTime, endTime, adminId } = req.body;
    try {
        const { rows: oldSettingsRow } = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', ['collegeTiming']);
        const oldSettings = oldSettingsRow.length > 0 ? JSON.parse(oldSettingsRow[0].setting_value) : { startTime: '08:00', endTime: '16:00' };

        const valStr = JSON.stringify({ startTime, endTime });
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
            ['collegeTiming', valStr]
        );

        await pool.query('INSERT INTO audit_logs (action_type, details, performed_by) VALUES ($1, $2, $3)', [
            'TIME_BOUNDARY_CHANGE',
            `Changed from ${oldSettings.startTime}-${oldSettings.endTime} to ${startTime}-${endTime}`,
            adminId || 'admin'
        ]);

        const today = new Date().toISOString().split('T')[0];
        const { rows: students } = await pool.query('SELECT id FROM users WHERE role = $1', ['student']);

        for (const student of students) {
            const { rows: events } = await pool.query(
                'SELECT timestamp FROM geofence_events WHERE studentId = $1 AND date = $2 AND eventType = $3 ORDER BY timestamp ASC',
                [student.id, today, 'ENTRY']
            );
            let isPresent = false;
            let firstEntry = null;
            if (events.length > 0) {
                for (const ev of events) {
                    const eventTime = new Date(ev.timestamp).toTimeString().substring(0, 5);
                    if (eventTime >= startTime && eventTime <= endTime) {
                        isPresent = true;
                        if (!firstEntry) firstEntry = eventTime;
                        break;
                    }
                }
            }
            if (isPresent) {
                await pool.query(
                    'INSERT INTO attendance_logs (studentId, date, timeIn, status) VALUES ($1, $2, $3, $4) ON CONFLICT (studentId, date) DO UPDATE SET status = $5, timeIn = COALESCE(attendance_logs.timeIn, EXCLUDED.timeIn)',
                    [student.id, today, firstEntry, 'Present', 'Present']
                );
            } else {
                await pool.query(
                    'UPDATE attendance_logs SET status = $1 WHERE studentId = $2 AND date = $3 AND status = $4',
                    ['Absent', student.id, today, 'Present']
                );
            }
        }
        res.json({ success: true, message: 'Settings updated and attendance recalculated.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/settings/geofence', async (req, res) => {
    try {
        const valStr = JSON.stringify(req.body);
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
            ['geofence', valStr]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/geofence/event', async (req, res) => {
    const { studentId, eventType, latitude, longitude, accuracy } = req.body;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
        await pool.query(
            'INSERT INTO geofence_events (studentId, date, eventType, latitude, longitude, accuracy) VALUES ($1, $2, $3, $4, $5, $6)',
            [studentId, today, eventType, latitude, longitude, accuracy]
        );
        if (eventType === 'ENTRY') {
            await pool.query(
                `INSERT INTO attendance_logs (studentId, date, entryCount) VALUES ($1, $2, 1) ON CONFLICT (studentId, date) DO UPDATE SET entryCount = attendance_logs.entryCount + 1`,
                [studentId, today]
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/geofence/events/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { date } = req.query;
    try {
        const { rows: events } = await pool.query(
            'SELECT * FROM geofence_events WHERE studentId = $1 AND date = $2 ORDER BY timestamp ASC',
            [studentId, date]
        );
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/migrate', async (req, res) => {
    try {
        const { rowCount } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='mobile'");
        if (rowCount === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN mobile VARCHAR(15)");
            res.json({ success: true, message: 'Column mobile added successfully' });
        } else {
            res.json({ success: true, message: 'Column mobile already exists' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { requesterId } = req.query;
        let queryStr = `
            SELECT u.id, u.email, u.password, u.name, u.role, u.department, u.rollNo, u.branch, u.batch, u.registereddeviceid AS "registeredDeviceId", u.totalclasses AS "totalClasses", u.mobile, u.profilepic AS "profilePic",
            (SELECT COUNT(*) FROM attendance_logs WHERE studentId = u.id AND status = 'Present') as "classesAttended" 
            FROM users u
        `;
        let queryParams = [];

        if (requesterId) {
            const { rows: requesterInfo } = await pool.query('SELECT role, branch FROM users WHERE id = $1', [requesterId]);
            if (requesterInfo.length > 0) {
                const requesterRole = requesterInfo[0].role;
                const requesterBranch = requesterInfo[0].branch;
                if (requesterRole === 'teacher') {
                    queryStr += " WHERE u.role != 'student' OR (u.role = 'student' AND u.branch = $1)";
                    queryParams.push(requesterBranch);
                }
            }
        }
        const { rows: users } = await pool.query(queryStr, queryParams);
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic } = req.body;
    try {
        const customId = id || (role === 'teacher' ? `T-${Date.now()}` : `S-${Date.now()}`);
        await pool.query(
            'INSERT INTO users (id, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [customId, email, password, name, role, department, rollNo, branch, batch, mobile, profilePic || null]
        );
        res.json({ success: true, message: 'User created' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, branch, batch, department, rollNo, mobile, registeredDeviceId, profilePic } = req.body;
    try {
        await pool.query(
            `UPDATE users SET
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                password = COALESCE($3, password),
                branch = COALESCE($4, branch),
                batch = COALESCE($5, batch),
                department = COALESCE($6, department),
                rollNo = COALESCE($7, rollNo),
                mobile = COALESCE($8, mobile),
                profilePic = COALESCE($9, profilePic),
                registeredDeviceId = $10
            WHERE id = $11`,
            [name, email, password, branch, batch, department, rollNo, mobile, profilePic !== undefined ? profilePic : null, registeredDeviceId || null, id]
        );
        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/attendance/mark', async (req, res) => {
    const { studentId, status, timeIn, timeOut, sessions } = req.body;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
        const insertQuery = `
            INSERT INTO attendance_logs (studentId, date, status, timeIn, timeOut, sessions)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6::jsonb, '[]'::jsonb))
            ON CONFLICT (studentId, date) DO UPDATE SET
                status = EXCLUDED.status,
                timeIn = COALESCE(attendance_logs.timeIn, EXCLUDED.timeIn),
                timeOut = EXCLUDED.timeOut,
                sessions = EXCLUDED.sessions
        `;
        const sessionsJson = sessions ? JSON.stringify(sessions) : null;
        await pool.query(insertQuery, [studentId, today, status, timeIn, timeOut, sessionsJson]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/attendance/manual-mark', async (req, res) => {
    const { studentId, date, status } = req.body;
    if (!studentId || !date || !status) return res.status(400).json({ success: false, error: 'Missing required fields' });
    try {
        const valStatus = status === 'Present' ? 'Valid' : 'Pending Review';
        const valReason = status === 'Present' ? 'Manually Approved' : 'Manually Rejected';
        const insertQuery = `
            INSERT INTO attendance_logs (studentId, date, status, validationStatus, validationReason)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (studentId, date) DO UPDATE SET
                status = EXCLUDED.status,
                validationStatus = EXCLUDED.validationStatus,
                validationReason = EXCLUDED.validationReason
        `;
        await pool.query(insertQuery, [studentId, date, status, valStatus, valReason]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/logs/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const { rows: logs } = await pool.query('SELECT * FROM attendance_logs WHERE studentId = $1 ORDER BY date DESC LIMIT 10', [studentId]);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/today', async (req, res) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
        const { rows: logs } = await pool.query('SELECT * FROM attendance_logs WHERE date = $1', [today]);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/date/:date', async (req, res) => {
    const { date } = req.params;
    try {
        const { rows: logs } = await pool.query('SELECT * FROM attendance_logs WHERE date = $1', [date]);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/range', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Missing startDate or endDate' });
    try {
        const { rows: logs } = await pool.query('SELECT * FROM attendance_logs WHERE date >= $1 AND date <= $2', [startDate, endDate]);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/attendance/detailed-logs', async (req, res) => {
    const { date, branch, requesterId } = req.query;
    try {
        let branchFilter = branch;
        if (requesterId && requesterId.startsWith('T-')) {
            const { rows: teacher } = await pool.query('SELECT branch FROM users WHERE id = $1', [requesterId]);
            if (teacher.length > 0) branchFilter = teacher[0].branch;
        }

        let usersQuery = "SELECT id, name, branch, batch, rollNo FROM users WHERE role = 'student'";
        let userParams = [];
        if (branchFilter && branchFilter !== 'All') {
            usersQuery += " AND branch = $1";
            userParams.push(branchFilter);
        }
        const { rows: students } = await pool.query(usersQuery, userParams);

        const logs = [];
        for (let s of students) {
            const { rows: attLogRows } = await pool.query('SELECT * FROM attendance_logs WHERE studentId = $1 AND date = $2', [s.id, date]);
            const attLog = attLogRows.length > 0 ? attLogRows[0] : null;

            const { rows: events } = await pool.query('SELECT timestamp, eventType FROM geofence_events WHERE studentId = $1 AND date = $2 ORDER BY timestamp ASC', [s.id, date]);

            if (attLog || events.length > 0) {
                logs.push({
                    ...s,
                    status: attLog ? attLog.status : 'No Log',
                    timeIn: attLog ? attLog.timein : '--',
                    timeOut: attLog ? attLog.timeout : '--',
                    totalDurationMinutes: attLog ? attLog.totaldurationminutes : null,
                    validationStatus: attLog ? attLog.validationstatus : 'Pending',
                    validationReason: attLog ? attLog.validationreason : null,
                    entryCount: events.filter(e => e.eventtype === 'ENTRY').length,
                    timeline: events
                });
            }
        }
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/attendance/validate', async (req, res) => {
    const { studentId, date } = req.body;
    try {
        const { rows: settingsRows } = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', ['collegeTiming']);
        const timing = settingsRows.length > 0 ? JSON.parse(settingsRows[0].setting_value) : { startTime: '08:00', endTime: '16:00' };

        const { rows: events } = await pool.query('SELECT timestamp, eventType FROM geofence_events WHERE studentId = $1 AND date = $2 ORDER BY timestamp ASC', [studentId, date]);
        
        if (events.length === 0) return res.json({ success: true, message: 'No geofence activity found' });

        let totalMinutes = 0;
        let lastEntryTime = null;
        events.forEach(ev => {
            const time = new Date(ev.timestamp);
            if (ev.eventtype === 'ENTRY') {
                lastEntryTime = time;
            } else if (ev.eventtype === 'EXIT' && lastEntryTime) {
                totalMinutes += (time - lastEntryTime) / (1000 * 60);
                lastEntryTime = null;
            }
        });

        if (lastEntryTime) {
            const now = new Date();
            const collegeEndTime = new Date(date + 'T' + timing.endTime);
            const endTime = now < collegeEndTime ? now : collegeEndTime;
            if (endTime > lastEntryTime) {
                totalMinutes += (endTime - lastEntryTime) / (1000 * 60);
            }
        }

        let status = 'Valid';
        let reason = '';
        const firstEntry = new Date(events[0].timestamp);
        const collegeStartTime = new Date(date + 'T' + timing.startTime);

        if (firstEntry > new Date(collegeStartTime.getTime() + 15 * 60000)) {
            status = 'Late Entry';
            reason = 'Entered after 15 min buffer';
        }

        if (totalMinutes < 240) {
            status = 'Insufficient Time';
            reason = `Spent only ${Math.round(totalMinutes)} minutes on campus`;
        }

        await pool.query(
            'UPDATE attendance_logs SET totalDurationMinutes = $1, validationStatus = $2, validationReason = $3 WHERE studentId = $4 AND date = $5',
            [Math.round(totalMinutes), status, reason, studentId, date]
        );

        res.json({ success: true, status, totalMinutes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/calendar', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM calendar_events ORDER BY date ASC';
        let params = [];
        if (status) {
            query = 'SELECT * FROM calendar_events WHERE status = $1 ORDER BY date ASC';
            params = [status];
        }
        const { rows: events } = await pool.query(query, params);
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/calendar', async (req, res) => {
    const eventsToProcess = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const insertQuery = `
            INSERT INTO calendar_events (date, type, reason, status, teacherId)
            VALUES ($1, $2, $3, 'Pending', $4)
            ON CONFLICT (date) DO UPDATE SET
                type = EXCLUDED.type,
                reason = EXCLUDED.reason,
                status = 'Pending',
                teacherId = EXCLUDED.teacherId
        `;
        for (const event of eventsToProcess) {
            const date = event.date || null;
            const type = event.type || null;
            const reason = event.reason || '';
            const teacherId = event.teacherId || null;
            try {
                await pool.query(insertQuery, [date, type, reason, teacherId]);
            } catch (err) {
                if (err.code === '23503') { 
                    await pool.query(insertQuery, [date, type, reason, null]);
                } else { throw err; }
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error.toString() });
    }
});

app.put('/api/calendar/verify-all', async (req, res) => {
    try {
        await pool.query("UPDATE calendar_events SET status = 'Verified' WHERE status = 'Pending'");
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.put('/api/calendar/:id/verify', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE calendar_events SET status = $1 WHERE id = $2', ['Verified', id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.delete('/api/calendar/reject-all', async (req, res) => {
    try {
        await pool.query("DELETE FROM calendar_events WHERE status = 'Pending'");
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.delete('/api/calendar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM calendar_events WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/notices', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM notices ORDER BY created_at DESC');
        res.json({ success: true, notices: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/notices/active', async (req, res) => {
    const { userId, role, branch, batch } = req.query;
    try {
        if (role === 'admin') return res.json({ success: true, notices: [] });
        const now = new Date();
        const audienceFilter = role === 'student' ? 'Students' : role === 'teacher' ? 'Teachers' : 'Both';
        const branchFilter = branch || 'All';
        const batchFilter = batch || 'All';
        
        const { rows } = await pool.query(`
            SELECT n.*, 
            (SELECT COUNT(*) FROM notice_analytics WHERE notice_id = n.id AND user_id = $1) as viewCount
            FROM notices n
            WHERE (n.end_date IS NULL OR n.end_date >= $2)
            AND (n.start_date <= $3)
            AND (n.audience = 'Both' OR n.audience = $4)
            AND (n.branch = 'All' OR n.branch = $5)
            AND (n.batch = 'All' OR n.batch = $6)
            ORDER BY n.priority DESC, n.created_at DESC
        `, [userId, now, now, audienceFilter, branchFilter, batchFilter]);
        res.json({ success: true, notices: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/notices', upload.single('file'), async (req, res) => {
    const { title, description, type, audience, branch, batch, start_date, end_date, priority } = req.body;
    const file_path = req.file ? `/uploads/notices/${req.file.filename}` : null;
    const sDate = start_date && start_date !== '' ? start_date : null;
    const eDate = end_date && end_date !== '' ? end_date : null;
    try {
        const { rows } = await pool.query(
            `INSERT INTO notices (title, description, type, file_path, audience, branch, batch, start_date, end_date, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [title, description, type, file_path, audience, branch, batch, sDate, eDate, priority || 'Normal']
        );
        res.json({ success: true, noticeId: rows[0].id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/notices/:id', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, description, type, audience, branch, batch, start_date, end_date, priority } = req.body;
    let file_path = req.body.file_path;
    if (req.file) file_path = `/uploads/notices/${req.file.filename}`;
    const sDate = start_date && start_date !== '' ? start_date : null;
    const eDate = end_date && end_date !== '' ? end_date : null;
    try {
        await pool.query(
            `UPDATE notices SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                type = COALESCE($3, type),
                file_path = COALESCE($4, file_path),
                audience = COALESCE($5, audience),
                branch = COALESCE($6, branch),
                batch = COALESCE($7, batch),
                start_date = COALESCE($8, start_date),
                end_date = $9,
                priority = COALESCE($10, priority)
            WHERE id = $11`,
            [title, description, type, file_path, audience, branch, batch, sDate, eDate, priority, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/notices/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM notices WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/notices/:id/view', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        await pool.query('INSERT INTO notice_analytics (notice_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/notices/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: stats } = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM notice_analytics WHERE notice_id = $1) as totalViews,
                u.name, u.role, u.rollNo, na.viewed_at
            FROM notice_analytics na
            JOIN users u ON na.user_id = u.id
            WHERE na.notice_id = $2
            ORDER BY na.viewed_at DESC
        `, [id, id]);
        res.json({ success: true, stats: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const updateSemesterStates = async (branch, batch) => {
    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        await pool.query(`UPDATE semesters SET state = 'Active' WHERE status = 'Approved' AND state = 'Upcoming' AND start_date IS NOT NULL AND start_date <= $1 AND branch = $2 AND batch = $3`, [todayStr, branch, batch]);
        await pool.query(`UPDATE semesters SET state = 'Ended' WHERE status = 'Approved' AND state = 'Active' AND end_date IS NOT NULL AND end_date < $1 AND branch = $2 AND batch = $3`, [todayStr, branch, batch]);
    } catch (err) {
        console.error("Error auto-updating semester states:", err);
    }
};

app.get('/api/semesters', async (req, res) => {
    const { branch, batch } = req.query;
    try {
        if (branch && batch && branch !== 'All' && batch !== 'All') {
            await updateSemesterStates(branch, batch);
            const { rows } = await pool.query('SELECT * FROM semesters WHERE branch = $1 AND batch = $2 ORDER BY created_at DESC', [branch, batch]);
            res.json({ success: true, semesters: rows });
        } else {
            const { rows } = await pool.query('SELECT * FROM semesters ORDER BY created_at DESC');
            res.json({ success: true, semesters: rows });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/semesters/active', async (req, res) => {
    const { branch, batch } = req.query;
    if (!branch || !batch || branch === 'All' || batch === 'All') return res.json({ success: true, semester: null });
    try {
        await updateSemesterStates(branch, batch);
        const { rows } = await pool.query(`SELECT * FROM semesters WHERE branch = $1 AND batch = $2 AND status = 'Approved' AND state IN ('Active', 'Upcoming') ORDER BY state ASC LIMIT 1`, [branch, batch]);
        res.json({ success: true, semester: rows.length > 0 ? rows[0] : null });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/semesters', async (req, res) => {
    const { name, branch, batch, start_date, end_date } = req.body;
    try {
        await pool.query(
            `INSERT INTO semesters (name, branch, batch, start_date, end_date) VALUES ($1, $2, $3, $4, $5)`,
            [name, branch, batch, start_date || null, end_date || null]
        );
        res.json({ success: true });
    } catch (error) {
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
            let i = 1;
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = $${i++}`);
                values.push(value === '' ? null : value);
            }
            values.push(id);
            await pool.query(`UPDATE semesters SET ${setClauses.join(', ')} WHERE id = $${i}`, values);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Pure PostgreSQL backend loaded successfully!`);
});
