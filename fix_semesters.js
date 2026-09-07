const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const unifiedCode = `
const updateSemesterStates = async (branch, batch) => {
    try {
        if (!branch || branch === 'All' || !batch || batch === 'All') return;
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = \`\${yyyy}-\${mm}-\${dd}\`;
        await pool.query(\`UPDATE semesters SET state = 'Active' WHERE status = 'Approved' AND state = 'Upcoming' AND start_date IS NOT NULL AND start_date <= $1 AND branch = $2 AND batch = $3\`, [todayStr, branch, batch]);
        await pool.query(\`UPDATE semesters SET state = 'Ended' WHERE status = 'Approved' AND state = 'Active' AND end_date IS NOT NULL AND end_date < $1 AND branch = $2 AND batch = $3\`, [todayStr, branch, batch]);
    } catch (err) {
        console.error("Error auto-updating semester states:", err);
    }
};

app.get('/api/semesters', async (req, res) => {
    try {
        const { branch, batch, status, state } = req.query;
        if (branch && batch) {
            await updateSemesterStates(branch, batch);
        }
        
        let query = \`
            SELECT s.*,
                (s.end_date - s.start_date) + 1 as "totalDays",
                (SELECT COUNT(*) FROM calendar_events c WHERE c.branch = s.branch AND c.batch = s.batch AND c.type = 'Holiday' AND c.status = 'Verified' AND c.date >= s.start_date AND c.date <= s.end_date) as holidays_count,
                (SELECT COUNT(*) FROM calendar_events c WHERE c.branch = s.branch AND c.batch = s.batch AND c.type = 'Class' AND c.status = 'Verified' AND c.date >= s.start_date AND c.date <= s.end_date) as extra_classes_count
            FROM semesters s WHERE 1=1
        \`;
        let params = [];
        if (branch && branch !== 'All') { params.push(branch); query += \` AND s.branch = $\${params.length}\`; }
        if (batch && batch !== 'All') { params.push(batch); query += \` AND s.batch = $\${params.length}\`; }
        if (status) { params.push(status); query += \` AND s.status = $\${params.length}\`; }
        if (state) { params.push(state); query += \` AND s.state = $\${params.length}\`; }
        
        query += ' ORDER BY s.created_at DESC';
        
        const { rows } = await pool.query(query, params);
        res.json({ success: true, semesters: rows });
    } catch (error) {
        console.error("GET /api/semesters error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/api/semesters', async (req, res) => {`;

content = content.replace(/app\.post\('\/api\/semesters', async \(req, res\) => {/, unifiedCode);
fs.writeFileSync(file, content);
console.log("Added GET /api/semesters back successfully.");
