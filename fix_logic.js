const fs = require('fs');

const fixLogic = (content) => {
    const searchRegex = /let status = 'Absent';\s*if \(isHoliday\) status = 'Holiday';\s*else if \(isWeekend && !hasClass\) status = 'Weekend';\s*else if \(!isWeekend && !hasClass\) status = 'Closed';\s*if \(log && log\.status\) status = log\.status;/g;
    
    const replaceStr = `let status = 'Absent';
                    if (isHoliday) status = 'Holiday';
                    else if (isWeekend && !hasClass) status = 'Weekend';
                    else if (!isWeekend && !hasClass) status = 'Closed';
                    
                    if (log && log.status) {
                        if (log.status !== 'Absent') {
                            status = log.status;
                        } else {
                            // If log is Absent, only apply it if it's a regular class day
                            if (!isHoliday && !(!isWeekend && !hasClass) && !(isWeekend && !hasClass)) {
                                status = 'Absent';
                            }
                        }
                    }`;
    return content.replace(searchRegex, replaceStr);
};

['frontend/src/pages/TeacherDashboard.jsx', 'frontend/src/pages/AdminDashboard.jsx', 'frontend/src/pages/StudentDashboard.jsx'].forEach(file => {
    const path = '/Users/apple/Desktop/Smart Campuss/Smart-campus/' + file;
    let content = fs.readFileSync(path, 'utf8');
    let newContent = fixLogic(content);
    if (content !== newContent) {
        fs.writeFileSync(path, newContent);
        console.log(`Updated ${file}`);
    } else {
        console.log(`No match in ${file}`);
    }
});
