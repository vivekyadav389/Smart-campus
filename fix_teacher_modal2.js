const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<StudentDetailsModal student={selectedDetailedStudent} onClose={\(\) => setSelectedDetailedStudent\(null\)} \/>\n\s*<StudentDetailsModal student={selectedDetailedStudent} onClose={\(\) => setSelectedDetailedStudent\(null\)} \/>/,
    `<StudentDetailsModal student={selectedDetailedStudent} onClose={() => setSelectedDetailedStudent(null)} />`
);

fs.writeFileSync(file, content);
console.log("Removed duplicate modal");
