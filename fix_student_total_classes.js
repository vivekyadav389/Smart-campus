const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Total classes should be based on the calendar[\s\S]*?const trueTotalClasses = [\s\S]*?;/;

const newLogic = `
                const pastHolidays = verifiedEvents.filter(e => {
                    if (e.type !== 'Holiday') return false;
                    const d = new Date(e.date);
                    return d >= semStart && d <= calcEnd;
                }).length;
                
                const pastExtraClasses = verifiedEvents.filter(e => {
                    if (e.type !== 'Class') return false;
                    const d = new Date(e.date);
                    return d >= semStart && d <= calcEnd;
                }).length;

                let trueTotalClasses = totalWeekdays - pastHolidays + pastExtraClasses;
                if (trueTotalClasses < 1) trueTotalClasses = 1; // Prevent division by zero
`;

content = content.replace(regex, newLogic);
fs.writeFileSync(file, content);
console.log("Fixed trueTotalClasses in StudentDashboard.jsx");
