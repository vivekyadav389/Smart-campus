const fs = require('fs');

const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Patch loadHistory
const searchHistoryStr = `
                const logs = await getAttendanceByDate(historyDate);
                const isWeekend = isDateWeekend(historyDate);

                const mapped = baseStudents.map(student => {
                    const log = logs.find(l => l.studentId === student.id);
                    return {
                        ...student,
                        status: isWeekend ? 'Weekend' : (log ? log.status : 'Absent'),
                        timeIn: isWeekend ? '-' : (log && log.timeIn ? log.timeIn : '-'),
                        timeOut: isWeekend ? '-' : (log && log.timeOut ? log.timeOut : '-')
                    };
                });
`;

const replaceHistoryStr = `
                const [logs, events] = await Promise.all([
                    getAttendanceByDate(historyDate),
                    getCalendarEvents('Verified')
                ]);
                const isWeekend = isDateWeekend(historyDate);

                const mapped = baseStudents.map(student => {
                    const log = logs.find(l => l.studentId === student.id);
                    
                    const eventForDay = events.find(e => e.date.startsWith(historyDate) && (e.branch === 'All' || e.branch === student.branch) && (e.batch === 'All' || e.batch === student.batch));
                    const isHoliday = eventForDay && eventForDay.type === 'Holiday';
                    const hasClass = eventForDay && (eventForDay.type === 'Class' || eventForDay.type === 'Extra Class');
                    
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
    content = content.replace(searchHistoryStr.trim(), replaceHistoryStr.trim());
}

// 2. Add Modal imports and state
if (!content.includes('import StudentDetailsModal')) {
    content = content.replace(/import \{ getTodayAttendance/, "import StudentDetailsModal from '../components/StudentDetailsModal';\nimport { getTodayAttendance");
}

const modalStateRegex = /const \[activeTab, setActiveTab\] = useState\('live'\);/;
const modalStateReplacement = `const [activeTab, setActiveTab] = useState('live');
    const [selectedDetailedStudent, setSelectedDetailedStudent] = useState(null);`;
content = content.replace(modalStateRegex, modalStateReplacement);

// Add Modal JSX at the end of the return statement before the final </div>
const modalJSX = `
            {/* Detailed Student Modal */}
            <StudentDetailsModal 
                student={selectedDetailedStudent} 
                onClose={() => setSelectedDetailedStudent(null)} 
            />
`;
const endOfComponent = '</div>\n    );\n};\n\nexport default TeacherDashboard;';
if(content.includes(endOfComponent)) {
    content = content.replace(endOfComponent, modalJSX + '\n        ' + endOfComponent);
} else {
    // try a broader replace
    content = content.substring(0, content.lastIndexOf('</div>')) + modalJSX + '\n' + content.substring(content.lastIndexOf('</div>'));
}


// 3. Update grid styling to 5 columns max and add onClick
// Find the live attendance grid
// <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
const gridSearchStr = `gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'`;
const gridReplaceStr = `gridTemplateColumns: 'repeat(5, 1fr)'`;
content = content.replace(gridSearchStr, gridReplaceStr);

// Find the map for live attendance cards
const cardSearchStr = `                    {filteredLiveStudents.map(student => (
                        <div key={student.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>`;
const cardReplaceStr = `                    {filteredLiveStudents.map(student => (
                        <div key={student.id} className="card" onClick={() => setSelectedDetailedStudent(student)} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}>`;
content = content.replace(cardSearchStr, cardReplaceStr);


fs.writeFileSync(file, content);
console.log("Updated TeacherDashboard.jsx");
