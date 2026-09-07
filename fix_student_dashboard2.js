const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchRegex = /status: holidayEvent \? 'Holiday' : \(\(isWeekend \|\| !isClassDay\) \? 'Closed' : existingLog\.status\),/g;

const replaceStr = `status: holidayEvent ? 'Holiday' : (isWeekend ? 'Closed' : existingLog.status),`;

if (content.match(searchRegex)) {
    content = content.replace(searchRegex, replaceStr);
    fs.writeFileSync(file, content);
    console.log("Updated StudentDashboard.jsx history log logic back to safe version");
} else {
    console.log("No match in StudentDashboard.jsx history log");
}
