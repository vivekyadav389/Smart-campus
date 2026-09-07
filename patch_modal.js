const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('console.log("Rendering StudentDetailsModal", student);')) {
    content = content.replace('if (!student) return null;', 'console.log("Rendering StudentDetailsModal", student);\n    if (!student) return null;');
    fs.writeFileSync(file, content);
    console.log("Patched modal");
} else {
    console.log("Already patched");
}
