const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const modalStr = `
            {/* Detailed Student Modal */}
            {selectedDetailedStudent && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '0', backgroundColor: '#f8fafc', borderRadius: '1rem' }}>
                        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderRadius: '1rem 1rem 0 0' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-bg-subtle)', border: '4px solid white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {selectedDetailedStudent.profilePic ? (
                                            <img src={\`\${import.meta.env.VITE_API_URL || ''}\${selectedDetailedStudent.profilePic}\`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={40} color="var(--color-text-secondary)" />
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#e2e8f0', padding: '0.15rem 0.6rem', borderRadius: '1rem', color: '#475569' }}>View Only</span>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Edit Student</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        <span>Editing: <strong style={{ color: 'var(--color-text-primary)' }}>{selectedDetailedStudent.name}</strong></span>
                                        <span>•</span>
                                        <span>Role: <strong style={{ color: 'var(--color-text-primary)' }}>Student</strong></span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDetailedStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '0.25rem' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', alignItems: 'flex-start' }}>
                                <div style={{ color: '#2563eb', marginTop: '0.125rem' }}><MapPin size={18} /></div>
                                <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>Profile picture cannot be changed from here. <br /> It is for view only.</div>
                            </div>

                            {/* Personal Information */}
                            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: 600 }}>
                                    <User size={18} /> Personal Information
                                </div>
                                <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Full Name</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <User size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.name || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Roll No.</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <MapPin size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.rollNo || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Mobile Number</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <MapPin size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.phone || selectedDetailedStudent.mobile || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <MapPin size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.email || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Information */}
                            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: 600 }}>
                                    <MapPin size={18} /> Academic Information
                                </div>
                                <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Branch</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <MapPin size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.branch || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Batch Start Year</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <Calendar size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.batch || ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Batch End Year</label>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#fcfcfc' }}>
                                            <Calendar size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                                            <input type="text" readOnly value={selectedDetailedStudent.batch ? (parseInt(selectedDetailedStudent.batch) + 4).toString() : ''} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', color: '#334155', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Report */}
                            {(() => {
                                const totalClasses = parseInt(selectedDetailedStudent.totalClasses) || 0;
                                const presentCount = parseInt(selectedDetailedStudent.classesAttended) || 0;
                                const absentCount = totalClasses > 0 ? (totalClasses - presentCount) : 0;
                                const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
                                const conicValue = \`conic-gradient(#059669 \${percentage}%, #e2e8f0 0)\`;

                                return (
                                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: 600 }}>
                                                <MapPin size={18} /> Attendance Report
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#1e40af', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', backgroundColor: '#eff6ff' }}>
                                                <Calendar size={14} /> Current Semester <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
                                            </div>
                                        </div>
                                        
                                        <div style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                            {/* Donut Chart */}
                                            <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: conicValue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: '110px', height: '110px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{percentage}%</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', lineHeight: 1.2 }}>Overall<br/>Attendance</div>
                                                </div>
                                            </div>

                                            {/* Stats Cards */}
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
                                                <div style={{ flex: 1, minWidth: '90px', backgroundColor: '#ecfdf5', padding: '1.25rem 1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '32px', height: '32px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><CheckCircle size={18} /></div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065f46' }}>{presentCount}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#047857' }}>Present</div>
                                                </div>
                                                <div style={{ flex: 1, minWidth: '90px', backgroundColor: '#fef2f2', padding: '1.25rem 1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '32px', height: '32px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><XCircle size={18} /></div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>{absentCount}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Absent</div>
                                                </div>
                                                <div style={{ flex: 1, minWidth: '90px', backgroundColor: '#eff6ff', padding: '1.25rem 1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><MapPin size={18} /></div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>{totalClasses}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8' }}>Total Classes</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ margin: '0 1.5rem 1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <div style={{ color: '#2563eb' }}><MapPin size={18} /></div>
                                            <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>Attendance is calculated automatically from class records.</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
`;

content = content.replace(
    /                            <\/div>\n                        \)\}\n                    <\/div>\n                <\/div>\n            \)\}/,
    `                            </div>\n                        )}\n                    </div>\n                </div>\n            )}\n${modalStr}`
);

fs.writeFileSync(file, content);
console.log("Updated AdminDashboard.jsx");
