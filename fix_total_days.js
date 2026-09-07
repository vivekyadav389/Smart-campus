const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const totalDays = parseInt\(sem.totalDays\) \|\| 0;/,
    `const totalDays = Math.floor((new Date(en) - new Date(st)) / (1000 * 60 * 60 * 24)) + 1;`
);

fs.writeFileSync(file, content);
console.log("Fixed totalDays calculation in TeacherDashboard.jsx");
