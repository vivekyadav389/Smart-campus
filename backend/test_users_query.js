import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function test() {
    try {
        const queryStr = `
            SELECT u.id, u.email, u.password, u.name, u.role, u.department, u.rollno AS "rollNo", u.branch, u.batch, u.registereddeviceid AS "registeredDeviceId", u.mobile, u.profilepic AS "profilePic",
            (SELECT COUNT(*) FROM attendance_logs a 
             LEFT JOIN semesters s ON s.branch = u.branch AND s.batch = u.batch AND s.status = 'Active'
             WHERE a.studentId = u.id AND a.status = 'Present' 
             AND (s.id IS NULL OR (a.date >= s.startDate AND a.date <= s.endDate))) as "classesAttended",
            (SELECT COUNT(*) FROM calendar_events c
             LEFT JOIN semesters s ON s.branch = u.branch AND s.batch = u.batch AND s.status = 'Active'
             WHERE c.status = 'Verified' AND c.type = 'Class' AND c.branch = u.branch AND c.batch = u.batch
             AND (s.id IS NULL OR (c.date >= s.startDate AND c.date <= s.endDate))) as "totalClasses"
            FROM users u
        `;
        await pool.query(queryStr);
        console.log("Query successful");
    } catch (e) {
        console.error("Query failed:", e);
    }
    process.exit(0);
}
test();
