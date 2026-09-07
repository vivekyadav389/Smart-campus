const fs = require('fs');

const adminFile = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(adminFile, 'utf8');

// Replace fetchAllStudents body
const searchStr = `
            const [usersRes, todayLogs] = await Promise.all([
                fetch((import.meta.env.VITE_API_URL || '') + '/api/users'),
                getTodayAttendance()
            ]);

            const data = await usersRes.json();
            if (data.success) {
                const studentUsers = data.users.filter(u => u.role === 'student');
                const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

                // Map the logs to each student, matching the logic from TeacherDashboard
                const mappedStudents = studentUsers.map(student => {
                    const log = todayLogs.find(l => l.studentId === student.id);
                    return {
                        ...student,
                        status: isWeekend ? 'Weekend' : (log ? log.status : 'Absent'),
                        timeIn: isWeekend ? '-' : (log && log.timeIn ? log.timeIn : '-'),
                        timeOut: isWeekend ? '-' : (log && log.timeOut ? log.timeOut : '-')
                    };
                });
`;

const replaceStr = `
            const [usersRes, todayLogs, events] = await Promise.all([
                fetch((import.meta.env.VITE_API_URL || '') + '/api/users'),
                getTodayAttendance(),
                getCalendarEvents('Verified')
            ]);

            const data = await usersRes.json();
            if (data.success) {
                const studentUsers = data.users.filter(u => u.role === 'student');
                const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
                const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

                const mappedStudents = studentUsers.map(student => {
                    const log = todayLogs.find(l => l.studentId === student.id);
                    const eventForToday = events.find(e => e.date.startsWith(todayStr) && (e.branch === 'All' || e.branch === student.branch) && (e.batch === 'All' || e.batch === student.batch));
                    
                    const isHoliday = eventForToday && eventForToday.type === 'Holiday';
                    const hasClass = eventForToday && (eventForToday.type === 'Class' || eventForToday.type === 'Extra Class');
                    
                    let status = 'Absent';
                    if (isHoliday) status = 'Holiday';
                    else if (isWeekend && !hasClass) status = 'Weekend';
                    else if (!isWeekend && !hasClass) status = 'Closed';
                    
                    if (log && log.status) status = log.status;

                    return {
                        ...student,
                        status: status,
                        timeIn: log?.timeIn ? log.timeIn : '-',
                        timeOut: log?.timeOut ? log.timeOut : '-'
                    };
                });
`;

if(content.includes('status: isWeekend ? \'Weekend\' : (log ? log.status : \'Absent\'),')) {
    content = content.replace(searchStr.trim(), replaceStr.trim());
    fs.writeFileSync(adminFile, content);
    console.log("Updated AdminDashboard.jsx");
} else {
    console.log("Search string not found in AdminDashboard.jsx");
}

