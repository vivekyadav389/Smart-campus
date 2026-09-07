const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\(s\.start_date\|\|s\.startdate\)\?\.substring\(0,4\)/g, "String(s.start_date||s.startdate || '').substring(0,4)");

fs.writeFileSync(file, content);
console.log("Patched substring");
