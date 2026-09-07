const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const search = `style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}`;
const replace = `style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }}`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
    console.log("Fixed TeacherDashboard style prop");
} else {
    console.log("String not found!");
}
