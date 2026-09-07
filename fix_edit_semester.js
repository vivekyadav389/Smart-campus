const fs = require('fs');

// Update mockDb.js
let mockDb = fs.readFileSync('/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/utils/mockDb.js', 'utf8');
mockDb = mockDb.replace(
    /export const updateSemesterStatus = async \(id, status\) => {/,
    `export const updateSemester = async (id, payload) => {
    try {
        const res = await fetch(\`\${API_BASE_URL}/api/semesters/\${id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        return data.success;
    } catch (err) {
        return false;
    }
};

export const updateSemesterStatus = async (id, status) => {`
);
fs.writeFileSync('/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/utils/mockDb.js', mockDb);

// Update TeacherDashboard.jsx
let dashboard = fs.readFileSync('/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx', 'utf8');

// Import updateSemester
dashboard = dashboard.replace(
    /import { API_BASE_URL.*?createSemester.*? } from '\.\.\/utils\/mockDb';/,
    match => match.replace('createSemester', 'createSemester, updateSemester')
);

// Add id to form state
dashboard = dashboard.replace(
    /const \[semesterForm, setSemesterForm\] = useState\(\{ batch: '', startDate: '', endDate: '' \}\);/,
    `const [semesterForm, setSemesterForm] = useState({ id: null, batch: '', startDate: '', endDate: '' });`
);

// Update handleCreateSemester
dashboard = dashboard.replace(
    /const handleCreateSemester = async \(e\) => {[\s\S]*?if \(success\) {/,
    `const handleCreateSemester = async (e) => {
        e.preventDefault();
        let success = false;
        if (semesterForm.id) {
            success = await updateSemester(semesterForm.id, { start_date: semesterForm.startDate, end_date: semesterForm.endDate, batch: semesterForm.batch });
        } else {
            success = await createSemester({
                branch: user.branch,
                batch: semesterForm.batch,
                startDate: semesterForm.startDate,
                endDate: semesterForm.endDate
            });
        }
        if (success) {`
);

// Reset id on cancel and success
dashboard = dashboard.replace(
    /setSemesterForm\(\{ batch: '', startDate: '', endDate: '' \}\);/g,
    `setSemesterForm({ id: null, batch: '', startDate: '', endDate: '' });`
);

// Pass id to edit
dashboard = dashboard.replace(
    /setSemesterForm\(\{ batch: sem\.batch, startDate: st, endDate: en \}\);/,
    `setSemesterForm({ id: sem.id, batch: sem.batch, startDate: st, endDate: en });`
);

fs.writeFileSync('/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx', dashboard);

console.log("Updated edit semester logic.");
