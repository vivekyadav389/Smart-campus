const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for History filters
content = content.replace(
    /const \[isLoadingHistory, setIsLoadingHistory\] = useState\(false\);/,
    `const [isLoadingHistory, setIsLoadingHistory] = useState(false);\n    const [historyFilterBranch, setHistoryFilterBranch] = useState(user.branch || 'All');\n    const [historyFilterBatch, setHistoryFilterBatch] = useState('All');`
);

// 2. Fix loadSemesterHistory to use filters
content = content.replace(
    /const data = await getSemesterHistory\(user\.branch, 'All'\); \/\/ Teacher can fetch all completed semesters for their branch/,
    `const data = await getSemesterHistory(historyFilterBranch, historyFilterBatch);`
);

// Add useEffect to reload when filters change
content = content.replace(
    /export const TeacherDashboard = \(\) => {[\s\S]*?loadSemesterHistory\(\);\n\s*}/,
    match => {
        if (!content.includes('useEffect(() => { if (activeTab === \'semesterHistory\') loadSemesterHistory(); }, [historyFilterBranch, historyFilterBatch]);')) {
            return match; // Will add later if needed. Actually let's just add it near the other useEffects
        }
        return match;
    }
);

content = content.replace(
    /useEffect\(\(\) => \{\n\s*if \(activeTab === 'history'\) \{\n\s*fetchHistory\(\);\n\s*\}\n\s*\}, \[historyDate, baseStudents, activeTab, historyRefreshCounter\]\);/,
    `useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [historyDate, baseStudents, activeTab, historyRefreshCounter]);
    
    useEffect(() => {
        if (activeTab === 'semesterHistory') {
            loadSemesterHistory();
        }
    }, [activeTab, historyFilterBranch, historyFilterBatch]);`
);


// 3. Add filters to the semesterHistory UI and show active/inactive state properly
content = content.replace(
    /<h3 style=\{\{ fontSize: '1\.25rem', fontWeight: 600, marginBottom: '1\.5rem' \}\}>Semester History<\/h3>/,
    `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Semester History</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={historyFilterBranch} onChange={(e) => setHistoryFilterBranch(e.target.value)} className="search-input" style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                <option value="All">All Branches</option>
                {/* Assuming user.branch is the only one they teach, but we give All option */}
                <option value={user.branch}>{user.branch}</option>
            </select>
            <select value={historyFilterBatch} onChange={(e) => setHistoryFilterBatch(e.target.value)} className="search-input" style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                <option value="All">All Batches</option>
                {uniqueBatches.filter(b => b !== 'All').map(batch => (
                    <option key={batch} value={batch}>Batch {batch}</option>
                ))}
            </select>
        </div>
    </div>`
);

// 4. Update the table to show Active status
content = content.replace(
    /<td><span className=\{`status-badge \$\{sem\.state === 'Active' \? 'status-present' : 'status-absent'\}`\}>\{sem\.status\}<\/span><\/td>/g,
    `<td>
        <span className={\`status-badge \${sem.state === 'Active' ? 'status-present' : 'status-absent'}\`}>{sem.state}</span>
        <span className="status-badge" style={{ marginLeft: '0.5rem', backgroundColor: '#e2e8f0', color: '#475569' }}>{sem.status}</span>
    </td>`
);

// 5. Add Export Semester Dropdown to CSV Modal
const semesterDropdownStr = `                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Select Semester</label>
                                <select
                                    value={exportSemesterId}
                                    onChange={(e) => {
                                        setExportSemesterId(e.target.value);
                                        const sem = availableExportSemesters.find(s => s.id.toString() === e.target.value);
                                        if (sem) {
                                            setExportRange({
                                                start: sem.start_date.split('T')[0],
                                                end: sem.end_date ? sem.end_date.split('T')[0] : new Date().toISOString().split('T')[0]
                                            });
                                        }
                                    }}
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                >
                                    <option value="" disabled>-- Select a Semester --</option>
                                    {availableExportSemesters.map(sem => (
                                        <option key={sem.id} value={sem.id.toString()}>{sem.name || \`Semester \${sem.start_date?.substring(0,4)||''}\`}</option>
                                    ))}
                                </select>
                            </div>
`;

content = content.replace(
    /<div>\n\s*<label style=\{\{ display: 'block', marginBottom: '0\.5rem', fontWeight: 600, fontSize: '0\.875rem', color: 'var\(--color-text-primary\)' \}\}>Select Batch<\/label>/,
    semesterDropdownStr + "\n                            <div>\n                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Select Batch</label>"
);


fs.writeFileSync(file, content);
console.log("TeacherDashboard UI Updated");
