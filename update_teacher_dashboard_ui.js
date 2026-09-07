const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add activeTab 'myStudents'
content = content.replace(
    /const \[activeTab, setActiveTab\] = useState\('attendance'\);/,
    `const [activeTab, setActiveTab] = useState('attendance');\n    const [myStudentsBatch, setMyStudentsBatch] = useState('All');`
);

// 2. Add Export Semester state
content = content.replace(
    /const \[exportBatch, setExportBatch\] = useState\('All'\);[\s\S]*?const \[exportRange, setExportRange\] = useState\(\{/,
    `const [exportBatch, setExportBatch] = useState('All');
    const [exportSemesterId, setExportSemesterId] = useState('');
    const [availableExportSemesters, setAvailableExportSemesters] = useState([]);
    const [exportRange, setExportRange] = useState({`
);

// 3. Load semesters for export when batch changes
const effectForExportSemesters = `
    useEffect(() => {
        if (exportBatch !== 'All') {
            getSemesterHistory(user.branch, exportBatch).then(history => {
                getSemesters(user.branch, exportBatch, null, 'Active').then(active => {
                    setAvailableExportSemesters([...active, ...history]);
                });
            });
        } else {
            setAvailableExportSemesters([]);
        }
    }, [exportBatch, user.branch]);
`;
content = content.replace(
    /useEffect\(\(\) => \{[\s\S]*?if \(!user\) return;/,
    (match) => effectForExportSemesters + '\n' + match
);

// 4. Update handleRangeExport
const newExportLogic = `
    const handleRangeExport = async () => {
        setIsExporting(true);
        try {
            const selectedSem = availableExportSemesters.find(s => s.id.toString() === exportSemesterId);
            if (!selectedSem) {
                alert('Please select a valid semester');
                setIsExporting(false);
                return;
            }
            
            const startDate = selectedSem.start_date.split('T')[0];
            const endDate = selectedSem.end_date ? selectedSem.end_date.split('T')[0] : new Date().toISOString().split('T')[0];
            
            const allDays = getDaysInRange(startDate, endDate);
            const rangeLogs = await getAttendanceRange(startDate, endDate);
            const rangeEvents = await getCalendarEvents('Verified', exportBatch, user.branch);
            
            // Generate CSV exactly like before but bound to semester dates
            const exportStudents = exportBatch === 'All'
                ? baseStudents
                : baseStudents.filter(s => s.batch === exportBatch);

            const rows = exportStudents.map(student => {
                const row = { Name: student.name, 'Roll No': student.rollNo, Batch: student.batch };
                
                let presentCount = 0;
                let absentCount = 0;
                let leaveCount = 0;
                let totalClassesCount = 0;

                allDays.forEach(day => {
                    const isWeekend = new Date(day).getDay() === 0 || new Date(day).getDay() === 6;
                    
                    const holidayEvent = rangeEvents.find(e => {
                        if (e.type !== 'Holiday') return false;
                        if (e.batch && e.batch !== 'All' && e.batch !== exportBatch) return false;
                        return e.date.startsWith(day);
                    });

                    const classEvent = rangeEvents.find(e => {
                        if (e.type !== 'Class') return false;
                        if (e.batch && e.batch !== 'All' && e.batch !== exportBatch) return false;
                        return e.date.startsWith(day);
                    });
                    
                    const isHoliday = !!holidayEvent;
                    const isExtraClass = !!classEvent;
                    
                    const isClassDay = (isExtraClass) || (!isWeekend && !isHoliday);

                    const log = rangeLogs.find(l => l.studentId === student.id && l.date.startsWith(day));
                    if (log) {
                        row[day] = log.status;
                        if (isClassDay) {
                            if (log.status === 'Present') presentCount++;
                            else if (log.status === 'Absent') absentCount++;
                            else if (log.status === 'Leave') leaveCount++;
                        }
                    } else {
                        if (isClassDay && new Date(day) <= new Date()) {
                            row[day] = 'Absent (No Record)';
                            absentCount++;
                        } else {
                            row[day] = isHoliday ? 'Holiday' : (isWeekend ? 'Weekend' : '-');
                        }
                    }
                    if (isClassDay && new Date(day) <= new Date()) totalClassesCount++;
                });

                row['Total Classes'] = totalClassesCount;
                row['Present'] = presentCount;
                row['Absent'] = absentCount;
                row['Leave'] = leaveCount;
                row['Attendance %'] = totalClassesCount > 0 ? Math.round((presentCount / totalClassesCount) * 100) + '%' : '0%';

                return row;
            });

            if (rows.length === 0) {
                alert("No data found for this batch/semester.");
                setIsExporting(false);
                return;
            }

            const headers = Object.keys(rows[0]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
            ].join('\\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", \`attendance_report_batch_\${exportBatch}_sem_\${selectedSem.name.replace(' ', '_')}.csv\`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExportModalOpen(false);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };
`;
content = content.replace(
    /const handleRangeExport = async \(\) => {[\s\S]*?    \/\/ Calendar Calculations/,
    newExportLogic + '\n\n    // Calendar Calculations'
);

// 5. Add Tab to Nav
const myStudentsTab = `
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab('myStudents')}
                        style={{
                            padding: '0.75rem 1rem',
                            fontWeight: activeTab === 'myStudents' ? 600 : 500,
                            color: activeTab === 'myStudents' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === 'myStudents' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            background: 'none',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        My Students
                    </button>
`;
content = content.replace(
    /<button\s*className="tab-btn"\s*onClick=\{\(\) => setActiveTab\('history'\)\}[\s\S]*?<\/button>/,
    match => match + myStudentsTab
);

// 6. Add My Students Content
const myStudentsContent = `
            {activeTab === 'myStudents' && (
                <div className="card animate-fade-in" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Student Directory</h2>
                        <select 
                            className="input" 
                            style={{ width: 'auto' }}
                            value={myStudentsBatch}
                            onChange={e => setMyStudentsBatch(e.target.value)}
                        >
                            <option value="All">All Batches</option>
                            {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                <option key={batch} value={batch}>Batch {batch}</option>
                            ))}
                        </select>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Roll No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Name</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Batch</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mobile</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseStudents.filter(s => myStudentsBatch === 'All' || s.batch === myStudentsBatch).map(student => (
                                <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{student.rollNo}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                                                {student.name.charAt(0)}
                                            </div>
                                            {student.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{student.batch}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{student.email}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{student.mobile || 'N/A'}</td>
                                </tr>
                            ))}
                            {baseStudents.filter(s => myStudentsBatch === 'All' || s.batch === myStudentsBatch).length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No students found in this batch.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
`;
content = content.replace(
    /\{activeTab === 'history' && \([\s\S]*?<\/div>\s*\)\}/,
    match => match + '\n' + myStudentsContent
);

// 7. Update Export Modal UI
const newExportModal = `
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Select Batch</label>
                                    <select
                                        className="input"
                                        value={exportBatch}
                                        onChange={(e) => {
                                            setExportBatch(e.target.value);
                                            setExportSemesterId('');
                                        }}
                                    >
                                        <option value="All" disabled>Select a Batch</option>
                                        {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                            <option key={batch} value={batch}>Batch {batch}</option>
                                        ))}
                                    </select>
                                </div>
                                {exportBatch !== 'All' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Select Semester</label>
                                        <select
                                            className="input"
                                            value={exportSemesterId}
                                            onChange={(e) => setExportSemesterId(e.target.value)}
                                        >
                                            <option value="" disabled>Select Semester</option>
                                            {availableExportSemesters.map(sem => (
                                                <option key={sem.id} value={sem.id}>
                                                    {sem.name} ({sem.start_date.split('T')[0]} to {sem.end_date ? sem.end_date.split('T')[0] : 'Present'}) - {sem.state}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={() => setIsExportModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={handleRangeExport}
                                        disabled={isExporting || !exportSemesterId}
                                    >
                                        {isExporting ? "Processing..." : "Download CSV"}
                                    </button>
                                </div>
                            </div>
`;
content = content.replace(
    /<div className="modal-body" style=\{\{ display: 'flex', flexDirection: 'column', gap: '1rem' \}\}>[\s\S]*?Cancel[\s\S]*?Download CSV[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/,
    newExportModal
);

fs.writeFileSync(file, content);
console.log("Updated TeacherDashboard.jsx successfully.");
