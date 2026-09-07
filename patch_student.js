const fs = require('fs');

const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `
            const isWeekend = now.getDay() === 0 || now.getDay() === 6;

            if (isWeekend) {
                setLiveStatus('Weekend');
                setIsCheckingLocation(false);
                return; // Stop execution: no attendance marked on weekends
            }
`;

const replaceStr = `
            const isWeekend = now.getDay() === 0 || now.getDay() === 6;
            
            const hasClass = calendarEvents.some(e => {
                if (e.type !== 'Class' && e.type !== 'Extra Class') return false;
                return toISODate(e.date) === localTodayStrISO;
            });

            if (isWeekend && !hasClass) {
                setLiveStatus('Weekend');
                setIsCheckingLocation(false);
                return; // Stop execution: no attendance marked on weekends
            }

            if (!isWeekend && !hasClass) {
                setLiveStatus('Closed');
                setIsCheckingLocation(false);
                return;
            }
`;

if(content.includes('const isWeekend = now.getDay() === 0 || now.getDay() === 6;')) {
    content = content.replace(searchStr.trim(), replaceStr.trim());
    fs.writeFileSync(file, content);
    console.log("Updated StudentDashboard.jsx");
}

