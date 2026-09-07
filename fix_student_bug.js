const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Correct getSemesters call
content = content.replace(
    /getSemesters\(user\.branch, user\.batch, 'Active'\)/,
    `getSemesters(user.branch, user.batch, null, 'Active')`
);

// Fix 2: Prevent calculation if no active semester
const calculationRegex = /\/\/ Re-calculate accurately by iterating day by day \([\s\S]*?if \(trueTotalClasses < 1\) trueTotalClasses = 1; \/\/ Prevent division by zero/m;
const newCalc = `
                // Re-calculate accurately by iterating day by day (matching teacher's exact logic)
                const now = new Date();
                let calcEnd = semEnd < now ? semEnd : now;
                if (calcEnd > now) calcEnd = now;

                let trueTotalClasses = 0;
                let trueClassesAttended = 0;

                if (activeSems && activeSems.length > 0 && semStart <= calcEnd) {
                    for (let d = new Date(semStart); d <= calcEnd; d.setDate(d.getDate() + 1)) {
                        const localDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        
                        const isHoliday = verifiedEvents.some(e => e.type === 'Holiday' && e.date.startsWith(localDateStr));
                        const isExtraClass = verifiedEvents.some(e => e.type === 'Class' && e.date.startsWith(localDateStr));
                        
                        const isClassDay = isExtraClass || (!isWeekend && !isHoliday);
                        
                        if (isClassDay) {
                            trueTotalClasses++;
                            const log = logs.find(l => l.date.startsWith(localDateStr) && l.status === 'Present');
                            if (log) {
                                trueClassesAttended++;
                            }
                        }
                    }
                } else {
                    // No active semester, so total classes is 0
                    trueTotalClasses = 0;
                    trueClassesAttended = 0;
                }
`;
content = content.replace(calculationRegex, newCalc);

fs.writeFileSync(file, content);
console.log("Fixed StudentDashboard active semester loading and calculation bounds");
