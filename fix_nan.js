const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const truePercentage = Math\.round\(\(trueClassesAttended \/ trueTotalClasses\) \* 100\);/,
    'const truePercentage = trueTotalClasses > 0 ? Math.round((trueClassesAttended / trueTotalClasses) * 100) : 0;'
);

fs.writeFileSync(file, content);
console.log("Fixed NaN percentage");
