const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\(student\.batch \|\| ''\)\.split/g, "String(student.batch || '').split");

fs.writeFileSync(file, content);
console.log("Patched StudentDetailsModal.jsx split");
