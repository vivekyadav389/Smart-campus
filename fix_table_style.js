const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<table className="table">/,
    `<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>`
);

content = content.replace(
    /<tr>\n\s*<th>Batch<\/th>\n\s*<th>Name<\/th>\n\s*<th>Start Date<\/th>\n\s*<th>End Date<\/th>\n\s*<th>Status<\/th>\n\s*<\/tr>/,
    `<tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Batch</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Name</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Start Date</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>End Date</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Status</th>
                                    </tr>`
);

content = content.replace(
    /<tr key=\{sem\.id\}>\n\s*<td>\{sem\.batch\}<\/td>\n\s*<td>\{sem\.name \|\| `Semester \$\{sem\.start_date\?\.substring\(0,4\) \|\| ''\}`\}<\/td>\n\s*<td>\{new Date\(sem\.start_date \|\| sem\.startdate\)\.toLocaleDateString\(\)\}<\/td>\n\s*<td>\{sem\.end_date \? new Date\(sem\.end_date \|\| sem\.enddate\)\.toLocaleDateString\(\) : '-'\}<\/td>\n\s*<td>/g,
    `<tr key={sem.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem' }}>{sem.batch}</td>
                                            <td style={{ padding: '1rem' }}>{sem.name || \`Semester \${sem.start_date?.substring(0,4) || ''}\`}</td>
                                            <td style={{ padding: '1rem' }}>{new Date(sem.start_date || sem.startdate).toLocaleDateString()}</td>
                                            <td style={{ padding: '1rem' }}>{sem.end_date ? new Date(sem.end_date || sem.enddate).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '1rem' }}>`
);

fs.writeFileSync(file, content);
console.log("Fixed table styling");
