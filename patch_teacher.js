const fs = require('fs');

const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `
                const usersRes = await fetch(\`\${API_BASE_URL}/api/users\`);
                const usersData = await usersRes.json();
                const users = usersData.success ? usersData.users : [];
                
                const todayLogs = await getTodayAttendance();

                // Map users to their matching log
                const studentUsers = users.filter(u => u.role === 'student');
                setBaseStudents(studentUsers);

                const isWeekend = isDateWeekend(getLocalYMD());

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
                const usersRes = await fetch(\`\${API_BASE_URL}/api/users\`);
                const usersData = await usersRes.json();
                const users = usersData.success ? usersData.users : [];
                
                const [todayLogs, events] = await Promise.all([
                    getTodayAttendance(),
                    getCalendarEvents('Verified')
                ]);

                // Map users to their matching log
                const studentUsers = users.filter(u => u.role === 'student');
                setBaseStudents(studentUsers);

                const isWeekend = isDateWeekend(getLocalYMD());
                const todayStr = getLocalYMD();

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
    fs.writeFileSync(file, content);
    console.log("Updated TeacherDashboard.jsx");
} else {
    console.log("Search string not found in TeacherDashboard.jsx");
}
