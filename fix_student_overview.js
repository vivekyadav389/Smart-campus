const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Only count 'Present' logs that do NOT fall on a weekend[\s\S]*?if \(trueTotalClasses < 1\) trueTotalClasses = 1; \/\/ Prevent division by zero/m;

const newLogic = `
                // Re-calculate accurately by iterating day by day (matching teacher's exact logic)
                const now = new Date();
                let calcEnd = semEnd < now ? semEnd : now;
                if (calcEnd > now) calcEnd = now;

                let trueTotalClasses = 0;
                let trueClassesAttended = 0;

                if (semStart <= calcEnd) {
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
                }
                
                if (trueTotalClasses < 1) trueTotalClasses = 1; // Prevent division by zero
`;

content = content.replace(regex, newLogic);
fs.writeFileSync(file, content);
console.log("Fixed StudentDashboard accurately day by day");
