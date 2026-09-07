const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const updateSemesterStates = async \(branch, batch\) => {[\s\S]*?};/;
const newLogic = `const updateSemesterStates = async () => {
    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = \`\${yyyy}-\${mm}-\${dd}\`;
        await pool.query(\`UPDATE semesters SET state = 'Active' WHERE status = 'Approved' AND state = 'Upcoming' AND start_date IS NOT NULL AND start_date <= $1\`, [todayStr]);
        await pool.query(\`UPDATE semesters SET state = 'Ended' WHERE status = 'Approved' AND state = 'Active' AND end_date IS NOT NULL AND end_date < $1\`, [todayStr]);
    } catch (err) {
        console.error("Error auto-updating semester states:", err);
    }
};`;

content = content.replace(regex, newLogic);
content = content.replace(/await updateSemesterStates\(branch, batch\);/g, 'await updateSemesterStates();');

fs.writeFileSync(file, content);
console.log("Fixed updateSemesterStates in server.js");
