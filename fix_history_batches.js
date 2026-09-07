const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\{uniqueBatches\.filter\(b => b !== 'All'\)\.map\(batch => \(/,
    `{[...new Set(availableExportSemesters.map(s => s.batch).filter(Boolean))].map(batch => (`
);

fs.writeFileSync(file, content);
console.log("Fixed history batches");
