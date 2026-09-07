const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add states
content = content.replace(
    /const \[detailedStudentStats, setDetailedStudentStats\] = useState\(\{ present: 0, total: 0 \}\);/,
    `const [detailedStudentStats, setDetailedStudentStats] = useState({ present: 0, total: 0 });
    const [studentLogs, setStudentLogs] = useState([]);
    const [studentEvents, setStudentEvents] = useState([]);`
);

// Update loadData
content = content.replace(
    /student\._logs = logs \|\| \[\];\n\s*student\._events = events \|\| \[\];\n\s*calculateDetailedStats\(student, 'Current', activeSems && activeSems\.length > 0 \? activeSems\[0\] : null, allSems\);/,
    `setStudentLogs(logs || []);
                setStudentEvents(events || []);
                calculateDetailedStats(student, 'Current', activeSems && activeSems.length > 0 ? activeSems[0] : null, allSems, logs || [], events || []);`
);

// Update calculateDetailedStats signature
content = content.replace(
    /const calculateDetailedStats = \(stu, semId, defaultSem = null, allSems = detailedStudentSemesters\) => \{/,
    `const calculateDetailedStats = (stu, semId, defaultSem = null, allSems = detailedStudentSemesters, logs = studentLogs, events = studentEvents) => {`
);

// Update usage inside calculateDetailedStats
content = content.replace(
    /const eventForDay = \(stu\._events \|\| \[\]\)\.find\(e => e\.date\.startsWith\(dateStr\) && e\.status === 'Verified'\);/,
    `const eventForDay = (events || []).find(e => e.date.startsWith(dateStr) && e.status === 'Verified');`
);

content = content.replace(
    /const log = \(stu\._logs \|\| \[\]\)\.find\(l => l\.date\.startsWith\(dateStr\) && l\.status === 'Present'\);/,
    `const log = (logs || []).find(l => l.date.startsWith(dateStr) && l.status === 'Present');`
);

// Prevent RangeError: Invalid time value on toISOString()
content = content.replace(
    /const st = new Date\(targetSem\.start_date \|\| targetSem\.startdate\);\n\s*const en = new Date\(targetSem\.end_date \|\| targetSem\.enddate \|\| new Date\(\)\);/,
    `const st = new Date(targetSem.start_date || targetSem.startdate);
        const en = new Date(targetSem.end_date || targetSem.enddate || new Date());
        if (isNaN(st.getTime())) return; // Prevent Invalid Date crash`
);

fs.writeFileSync(file, content);
console.log("Patched StudentDetailsModal.jsx mutations");
