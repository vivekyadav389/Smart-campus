const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for activeSemesters
content = content.replace(
    /const \[isSemesterModalOpen, setIsSemesterModalOpen\] = useState\(false\);/,
    `const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);\n    const [activeSemesters, setActiveSemesters] = useState([]);\n    const [isEditingSemester, setIsEditingSemester] = useState(false);`
);

// 2. Add loadActiveSemesters
content = content.replace(
    /const loadSemesterHistory = async \(\) => {/,
    `const calculateWeekends = (startDate, endDate) => {
        let count = 0;
        let current = new Date(startDate);
        let end = new Date(endDate);
        while (current <= end) {
            if (current.getDay() === 0 || current.getDay() === 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const loadActiveSemesters = async () => {
        const data = await getSemesters(user.branch, null, null, 'Active');
        setActiveSemesters(data);
    };

    useEffect(() => {
        if (isSemesterModalOpen) {
            loadActiveSemesters();
            setIsEditingSemester(false);
        }
    }, [isSemesterModalOpen]);

    const loadSemesterHistory = async () => {`
);

// 3. Update handleCreateSemester
content = content.replace(
    /setSemesterForm\(\{ batch: '', startDate: '', endDate: '' \}\);\n            loadSemesterHistory\(\);\n        \} else {/,
    `setSemesterForm({ batch: '', startDate: '', endDate: '' });
            loadSemesterHistory();
            loadActiveSemesters();
            setIsEditingSemester(false);
        } else {`
);

// 4. Update the Modal JSX
const newModalContent = `
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {isEditingSemester ? 'Edit Semester' : 'Active Semesters'}
                            {!isEditingSemester && <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setIsEditingSemester(true)}>+ New</button>}
                        </h2>
                        <div className="modal-body">
                            {isEditingSemester ? (
                                <form onSubmit={handleCreateSemester}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Batch</label>
                                        <select
                                            className="input"
                                            value={semesterForm.batch}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, batch: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Batch</option>
                                            {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                                <option key={batch} value={batch}>Batch {batch}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Semester Start Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={semesterForm.startDate}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Semester End Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={semesterForm.endDate}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                                            required
                                        />
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Setting this will mark any previous active semester for this batch as Completed.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIsEditingSemester(false); setSemesterForm({ batch: '', startDate: '', endDate: '' }); }}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                                    </div>
                                </form>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {activeSemesters.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active semesters found.</p>
                                    ) : (
                                        activeSemesters.map(sem => {
                                            const st = sem.start_date.split('T')[0];
                                            const en = sem.end_date.split('T')[0];
                                            const weekends = calculateWeekends(st, en);
                                            const holidays = parseInt(sem.holidays_count) || 0;
                                            const extraClasses = parseInt(sem.extra_classes_count) || 0;
                                            const totalDays = parseInt(sem.totalDays) || 0;
                                            const classes = totalDays - weekends - holidays + extraClasses;

                                            return (
                                                <div key={sem.id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                        <div>
                                                            <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>Batch {sem.batch}</h4>
                                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{st} to {en}</p>
                                                        </div>
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                            onClick={() => {
                                                                setSemesterForm({ batch: sem.batch, startDate: st, endDate: en });
                                                                setIsEditingSemester(true);
                                                            }}
                                                        >
                                                            <Edit3 size={14} style={{ marginRight: '0.25rem' }} /> Edit
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.25rem' }}>
                                                        <div><strong>Total Days:</strong> {totalDays}</div>
                                                        <div><strong>Classes:</strong> <span style={{ color: 'var(--color-success)' }}>{classes}</span></div>
                                                        <div><strong>Weekends:</strong> {weekends}</div>
                                                        <div><strong>Holidays:</strong> {holidays}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
`;

content = content.replace(
    /<h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>\s*Manage Semesters\s*<\/h2>\s*<div className="modal-body">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>/,
    newModalContent
);

fs.writeFileSync(file, content);
console.log("Updated TeacherDashboard.jsx successfully.");
