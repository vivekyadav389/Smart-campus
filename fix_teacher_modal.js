const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const debugModalRegex = /\{selectedDetailedStudent && \([\s\S]*?<\/div>\n\s*\)\}/;
content = content.replace(
    debugModalRegex,
    `<StudentDetailsModal student={selectedDetailedStudent} onClose={() => setSelectedDetailedStudent(null)} />`
);

fs.writeFileSync(file, content);
console.log("Patched TeacherDashboard.jsx");
