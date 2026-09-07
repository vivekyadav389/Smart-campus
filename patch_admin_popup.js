const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add new imports if missing
if (!content.includes('getSemesters,')) {
    content = content.replace(/getTodayAttendance, getUsers } from '\.\.\/utils\/mockDb';/, 'getSemesters, getSemesterHistory, getAttendanceLogs, getTodayAttendance, getUsers } from \'../utils/mockDb\';');
}
if (!content.includes(' Phone,')) {
    content = content.replace(/import { User, Users,/, 'import { User, Users, Phone, Mail, Hash, BookOpen,');
}

// 2. Add state for detailed student stats and selected semester
const stateReplacement = `
    const [selectedDetailedStudent, setSelectedDetailedStudent] = useState(null);
    const [detailedStudentSemesters, setDetailedStudentSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState('Current');
    const [detailedStudentStats, setDetailedStudentStats] = useState({ present: 0, total: 0 });

    const openDetailedStudent = async (student) => {
        setSelectedDetailedStudent(student);
        setSelectedSemesterId('Current');
        try {
            // Fetch semesters for this branch/batch
            const [activeSems, historySems, logs, events] = await Promise.all([
                getSemesters(student.branch, student.batch),
                getSemesterHistory(student.branch, student.batch),
                getAttendanceLogs(student.id),
                getCalendarEvents(student.branch, student.batch)
            ]);
            
            const allSems = [...(activeSems || []), ...(historySems || [])];
            setDetailedStudentSemesters(allSems);
            
            // Store logs and events for dynamic calculation
            student._logs = logs || [];
            student._events = events || [];
            
            calculateDetailedStats(student, 'Current', activeSems && activeSems.length > 0 ? activeSems[0] : null);
        } catch(e) { console.error(e); }
    };

    const calculateDetailedStats = (student, semId, defaultSem = null) => {
        let targetSem = defaultSem;
        if (semId !== 'Current') {
            targetSem = detailedStudentSemesters.find(s => s.id === parseInt(semId));
        } else if (!targetSem && detailedStudentSemesters.length > 0) {
            targetSem = detailedStudentSemesters.find(s => s.state === 'Active');
        }

        if (!targetSem) {
            setDetailedStudentStats({ present: parseInt(student.classesAttended) || 0, total: parseInt(student.totalClasses) || 0 });
            return;
        }

        const st = new Date(targetSem.start_date || targetSem.startdate);
        const en = new Date(targetSem.end_date || targetSem.enddate || new Date());
        const today = new Date();
        const calcEnd = en > today ? today : en;

        let totalClassDays = 0;
        let presentCount = 0;

        let current = new Date(st);
        while (current <= calcEnd) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const eventForDay = (student._events || []).find(e => e.date.startsWith(dateStr) && e.status === 'Verified');
            const isHoliday = eventForDay && eventForDay.type === 'Holiday';
            const isExtraClass = eventForDay && eventForDay.type === 'Extra Class';
            
            let isClassDay = false;
            if (!isWeekend && !isHoliday) isClassDay = true;
            if (isExtraClass) isClassDay = true;
            
            if (isClassDay) {
                totalClassDays++;
                const log = (student._logs || []).find(l => l.date.startsWith(dateStr) && l.status === 'Present');
                if (log) presentCount++;
            }
            
            current.setDate(current.getDate() + 1);
        }

        setDetailedStudentStats({ present: presentCount, total: totalClassDays });
    };

    const handleSemesterChange = (e) => {
        const val = e.target.value;
        setSelectedSemesterId(val);
        calculateDetailedStats(selectedDetailedStudent, val);
    };
`;
content = content.replace(/    const \[selectedDetailedStudent, setSelectedDetailedStudent\] = useState\(null\);/, stateReplacement);

// 3. Replace onClick inside list to use openDetailedStudent
content = content.replace(/onClick=\{\(\) => setSelectedDetailedStudent\(student\)\}/g, "onClick={() => openDetailedStudent(student)}");

// 4. Update Modal UI
const profilePicReplacement = `{selectedDetailedStudent.profilePic ? (
                                            <img src={selectedDetailedStudent.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (`;
content = content.replace(/\{selectedDetailedStudent\.profilePic \? \(\n\s*<img src=\{\`\$\{(?:.*?)\}\$\{selectedDetailedStudent\.profilePic\}\`\} alt="Profile" style=\{\{ width: '100%', height: '100%', objectFit: 'cover' \}\} \/>\n\s*\) : \(/, profilePicReplacement);

// Fix Personal Info icons
content = content.replace(/<MapPin size=\{16\} color="#94a3b8" style=\{\{ marginRight: '0\.5rem' \}\} \/>\n(\s*<input type="text" readOnly value=\{selectedDetailedStudent\.rollNo)/g, '<Hash size={16} color="#94a3b8" style={{ marginRight: \'0.5rem\' }} />\n$1');
content = content.replace(/<MapPin size=\{16\} color="#94a3b8" style=\{\{ marginRight: '0\.5rem' \}\} \/>\n(\s*<input type="text" readOnly value=\{selectedDetailedStudent\.phone)/g, '<Phone size={16} color="#94a3b8" style={{ marginRight: \'0.5rem\' }} />\n$1');
content = content.replace(/<MapPin size=\{16\} color="#94a3b8" style=\{\{ marginRight: '0\.5rem' \}\} \/>\n(\s*<input type="text" readOnly value=\{selectedDetailedStudent\.email)/g, '<Mail size={16} color="#94a3b8" style={{ marginRight: \'0.5rem\' }} />\n$1');

// Fix Academic Info icons and Batch Year
content = content.replace(/<MapPin size=\{18\} \/> Academic Information/, '<BookOpen size={18} /> Academic Information');
content = content.replace(/<MapPin size=\{16\} color="#94a3b8" style=\{\{ marginRight: '0\.5rem' \}\} \/>\n(\s*<input type="text" readOnly value=\{selectedDetailedStudent\.branch)/g, '<Building size={16} color="#94a3b8" style={{ marginRight: \'0.5rem\' }} />\n$1');

content = content.replace(/<input type="text" readOnly value=\{selectedDetailedStudent\.batch \|\| ''\} style=/g, '<input type="text" readOnly value={(selectedDetailedStudent.batch || \'\').split(\'-\')[0]} style=');
content = content.replace(/<input type="text" readOnly value=\{selectedDetailedStudent\.batch \? \(parseInt\(selectedDetailedStudent\.batch\) \+ 4\)\.toString\(\) : ''\} style=/g, '<input type="text" readOnly value={(selectedDetailedStudent.batch || \'\').split(\'-\')[1] || (parseInt((selectedDetailedStudent.batch || \'\').split(\'-\')[0]) + 4).toString() || \'\'} style=');

// Fix Attendance Report Semester Dropdown & Stats
const attendanceReplacement = `
                            {/* Attendance Report */}
                            {(() => {
                                const totalClasses = detailedStudentStats.total || 0;
                                const presentCount = detailedStudentStats.present || 0;
                                const absentCount = totalClasses > 0 ? (totalClasses - presentCount) : 0;
                                const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
                                const conicValue = \`conic-gradient(#059669 \${percentage}%, #e2e8f0 0)\`;

                                return (
                                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: 600 }}>
                                                <Activity size={18} /> Attendance Report
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                <CalendarIcon size={14} color="var(--color-text-secondary)" />
                                                <select 
                                                    className="input" 
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', minWidth: '150px' }}
                                                    value={selectedSemesterId}
                                                    onChange={handleSemesterChange}
                                                >
                                                    <option value="Current">Current Semester</option>
                                                    {detailedStudentSemesters.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name || \`Semester \${(s.start_date||s.startdate)?.substring(0,4)}\`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>`;
content = content.replace(/\/\* Attendance Report \*\/\n\s*\{\(\(\) => \{\n\s*const totalClasses[\s\S]*?<Activity size=\{18\} \/> Attendance Report\n\s*<\/div>\n\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: '0\.5rem', fontSize: '0\.875rem', color: '#1e40af', cursor: 'pointer', padding: '0\.25rem 0\.5rem', borderRadius: '0\.25rem', backgroundColor: '#eff6ff' \}\}>\n\s*<Calendar size=\{14\} \/> Current Semester <ChevronRight size=\{14\} style=\{\{ transform: 'rotate\(90deg\)' \}\} \/>\n\s*<\/div>\n\s*<\/div>/, attendanceReplacement.replace(/<Activity size=\{18\} \/>/g, '<Activity size={18} />').trim());
// Wait, my original used <MapPin size={18} /> Attendance Report. Let me safely replace using index.
const startIdx = content.indexOf('{/* Attendance Report */}');
const endIdx = content.indexOf('<div style={{ padding: \'1.5rem\'', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + attendanceReplacement.trim() + '\n                                        ' + content.substring(endIdx);
}

fs.writeFileSync(file, content);
console.log("Updated AdminDashboard.jsx");
