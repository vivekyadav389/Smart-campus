import { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, GraduationCap, Search, Plus, X, Eye, EyeOff, Pencil, Smartphone, SmartphoneNfc, Upload, ImagePlus } from 'lucide-react';
import { addUser, API_BASE_URL } from '../utils/mockDb';

const UserManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('students');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Password visibility: keyed by user id in the table
    const [visiblePasswords, setVisiblePasswords] = useState({});
    // Password visibility inside edit modal
    const [editPasswordVisible, setEditPasswordVisible] = useState(false);

    const [users, setUsers] = useState({ students: [], teachers: [], admin: [] });
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users`);
            const data = await res.json();
            const allUsers = data.users || [];
            setUsers({
                students: allUsers.filter(u => u.role === 'student'),
                teachers: allUsers.filter(u => u.role === 'teacher'),
                admin: allUsers.filter(u => u.role === 'admin')
            });
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const [newUserForm, setNewUserForm] = useState({
        name: '', email: '', password: '', id: '', branch: '', batch: '', department: '', mobile: ''
    });

    const filteredUsers = users[activeTab].filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleImageChange = (e, isEdit) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // Limit to 2MB
                alert("File size exceeds 2MB limit. Please choose a smaller image.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                if (isEdit) {
                    setEditingUser({ ...editingUser, profilePic: base64String });
                } else {
                    setNewUserForm({ ...newUserForm, profilePic: base64String });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // ──────────────── Add User ────────────────
    const handleAddUser = async (e) => {
        e.preventDefault();
        const newUserData = { ...newUserForm };
        // For teachers, department and branch are both collected directly in the form
        const success = await addUser(
            activeTab === 'students' ? 'student' : (activeTab === 'teachers' ? 'teacher' : 'admin'),
            newUserData
        );
        if (success) {
            await loadUsers();
            setIsAddModalOpen(false);
            setNewUserForm({ name: '', email: '', password: '', id: '', branch: '', batch: '', department: '', mobile: '', profilePic: '' });
            alert(`${activeTab === 'students' ? 'Student' : 'Teacher'} account created successfully!`);
        } else {
            alert("Failed to create user. Please try again.");
        }
    };

    // ──────────────── Edit User ────────────────
    const openEdit = (user) => {
        setEditingUser({ ...user, mobile: user.mobile || '' });
        setEditPasswordVisible(false);
        setIsEditModalOpen(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingUser.name,
                    email: editingUser.email,
                    password: editingUser.password,
                    branch: editingUser.branch || null,
                    batch: editingUser.batch || null,
                    department: editingUser.department || null,
                    rollNo: editingUser.rollNo || null,
                    mobile: editingUser.mobile || null,
                    profilePic: editingUser.profilePic || null,
                    registeredDeviceId: editingUser.registeredDeviceId || null,
                })
            });
            const data = await res.json();
            if (data.success) {
                await loadUsers();
                setIsEditModalOpen(false);
                setEditingUser(null);
                alert('User updated successfully!');
            } else {
                alert('Failed to save: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetDevice = async () => {
        if (!window.confirm(`Reset registered device for ${editingUser.name}? They will be able to log in from any device on next login.`)) return;
        setEditingUser(prev => ({ ...prev, registeredDeviceId: null }));
    };

    const togglePasswordVisibility = (userId) => {
        setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const inputStyle = {
        width: '100%',
        padding: '0.65rem 0.75rem',
        border: '1px solid var(--color-border)',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        outline: 'none',
        backgroundColor: 'var(--color-bg-primary, white)'
    };
    const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)' };

    if (isLoading) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Users...</div>;
    }

    return (
        <div className="grid gap-6 animate-fade-in relative">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="page-title">User Management <small style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>v1.0.1-mobile</small></h1>
                    <p className="text-gray-500">View and manage system credentials</p>
                </div>
                {activeTab !== 'admin' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} /> Add New {activeTab === 'students' ? 'Student' : 'Teacher'}
                    </button>
                )}
            </div>

            <div className="card">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                        { key: 'students', label: 'Students', icon: <GraduationCap size={18} />, count: users.students.length },
                        { key: 'teachers', label: 'Teachers', icon: <User size={18} />, count: users.teachers.length },
                        { key: 'admin', label: 'Admins', icon: <Shield size={18} />, count: users.admin.length },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            padding: '0.5rem 1rem', fontWeight: 500,
                            color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: '-0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            {tab.icon} {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none' }}
                    />
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Name & ID</th>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Mobile</th>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Email</th>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Password</th>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Details</th>
                                <th style={{ padding: '1rem', fontWeight: 600 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }} className="hover:bg-gray-50">
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, overflow: 'hidden' }}>
                                                    {user.profilePic ? (
                                                        <img src={user.profilePic} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        user.name?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>ID: {user.rollNo || user.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{user.mobile || '-'}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                                                <Mail size={14} /> {user.email}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Lock size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                                <span style={{ fontFamily: visiblePasswords[user.id] ? 'inherit' : 'monospace', letterSpacing: visiblePasswords[user.id] ? 'normal' : '0.15em', color: 'var(--color-text-secondary)' }}>
                                                    {visiblePasswords[user.id] ? user.password : '••••••••'}
                                                </span>
                                                <button
                                                    onClick={() => togglePasswordVisibility(user.id)}
                                                    title={visiblePasswords[user.id] ? 'Hide password' : 'Show password'}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '0.15rem', display: 'flex', alignItems: 'center' }}
                                                >
                                                    {visiblePasswords[user.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '0.25rem 0.75rem',
                                                fontSize: '0.75rem', borderRadius: '1rem',
                                                backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 500
                                            }}>
                                                {user.branch || user.department || 'System Admin'}
                                            </span>
                                            {user.batch && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Batch {user.batch}</span>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                onClick={() => openEdit(user)}
                                                className="btn btn-outline"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ──────── Edit User Modal ──────── */}
            {isEditModalOpen && editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '520px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setIsEditModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Edit User</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            Editing: <strong>{editingUser.name}</strong> &nbsp;·&nbsp; Role: <strong style={{ textTransform: 'capitalize' }}>{editingUser.role}</strong>
                        </p>

                        <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Photo Upload */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                    {editingUser.profilePic ? (
                                        <img src={editingUser.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={32} color="#94a3b8" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...labelStyle, marginBottom: '0.2rem' }}>Profile Picture</label>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-secondary)', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                        <Upload size={14} />
                                        <span>Choose Image</span>
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e, true)} />
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Full Name</label>
                                    <input required type="text" value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>{editingUser.role === 'student' ? 'Roll No.' : 'Employee ID'}</label>
                                    <input type="text" value={editingUser.rollNo || editingUser.id || ''} onChange={e => setEditingUser({ ...editingUser, rollNo: e.target.value })} style={inputStyle} />
                                </div>
                            </div>

                            {/* Mobile Number */}
                            <div>
                                <label style={labelStyle}>Mobile Number</label>
                                <input type="text" placeholder="e.g. +91 9876543210" value={editingUser.mobile || ''} onChange={e => setEditingUser({ ...editingUser, mobile: e.target.value })} style={inputStyle} />
                            </div>

                            {/* Email */}
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                    <input required type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label style={labelStyle}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                    <input
                                        required
                                        type={editPasswordVisible ? 'text' : 'password'}
                                        value={editingUser.password || ''}
                                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                        style={{ ...inputStyle, paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setEditPasswordVisible(v => !v)}
                                        title={editPasswordVisible ? 'Hide' : 'Show'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex' }}
                                    >
                                        {editPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Branch / Department + Batch */}
                            {(editingUser.role === 'student' || editingUser.role === 'teacher') && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Branch</label>
                                        <select value={editingUser.branch || ''} onChange={e => setEditingUser({ ...editingUser, branch: e.target.value })} style={{ ...inputStyle }}>
                                            <option value="">Select Branch</option>
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Information Technology">Information Technology</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Mechanical">Mechanical</option>
                                            <option value="Civil">Civil</option>
                                        </select>
                                    </div>
                                    {editingUser.role === 'student' ? (
                                        <div>
                                            <label style={labelStyle}>Batch (Year)</label>
                                            <input type="text" placeholder="e.g. 2024" value={editingUser.batch || ''} onChange={e => setEditingUser({ ...editingUser, batch: e.target.value })} style={inputStyle} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={labelStyle}>Department</label>
                                            <input type="text" value={editingUser.department || ''} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} style={inputStyle} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Registered Device (students only) */}
                            {editingUser.role === 'student' && (
                                <div>
                                    <label style={labelStyle}>Registered Device ID</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, padding: '0.65rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', backgroundColor: '#f8fafc' }}>
                                            {editingUser.registeredDeviceId
                                                ? <><SmartphoneNfc size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} /><span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>{editingUser.registeredDeviceId}</span></>
                                                : <><Smartphone size={14} style={{ color: 'var(--color-text-secondary)' }} /><span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>No device registered</span></>
                                            }
                                        </div>
                                        {editingUser.registeredDeviceId && (
                                            <button type="button" onClick={handleResetDevice} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', whiteSpace: 'nowrap' }}>
                                                Reset Device
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                                        Resetting allows the student to log in from any device on their next login.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ──────── Add User Modal ──────── */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
                        <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                            Add New {activeTab === 'students' ? 'Student' : 'Teacher'}
                        </h2>

                        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Photo Upload */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                    {newUserForm.profilePic ? (
                                        <img src={newUserForm.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={32} color="#94a3b8" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...labelStyle, marginBottom: '0.2rem' }}>Profile Picture</label>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-secondary)', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                        <Upload size={14} />
                                        <span>Choose Image</span>
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e, false)} />
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <input required type="text" value={newUserForm.name} onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mobile Number</label>
                                <input type="text" placeholder="e.g. +91 9876543210" value={newUserForm.mobile} onChange={e => setNewUserForm({ ...newUserForm, mobile: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Password</label>
                                    <input required type="text" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>{activeTab === 'students' ? 'Roll No.' : 'Employee ID'}</label>
                                    <input required type="text" value={newUserForm.rollNo} onChange={e => setNewUserForm({ ...newUserForm, rollNo: e.target.value, id: e.target.value })} style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: (activeTab === 'students' || activeTab === 'teachers') ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                {(activeTab === 'students' || activeTab === 'teachers') && (
                                    <div>
                                        <label style={labelStyle}>Branch</label>
                                        <select required value={newUserForm.branch} onChange={e => setNewUserForm({ ...newUserForm, branch: e.target.value })} style={inputStyle}>
                                            <option value="" disabled>Select Branch</option>
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Information Technology">Information Technology</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Mechanical">Mechanical</option>
                                            <option value="Civil">Civil</option>
                                        </select>
                                    </div>
                                )}
                                {activeTab === 'students' && (
                                    <div>
                                        <label style={labelStyle}>Batch (Year)</label>
                                        <input required type="text" placeholder="e.g. 2024" value={newUserForm.batch} onChange={e => setNewUserForm({ ...newUserForm, batch: e.target.value })} style={inputStyle} />
                                    </div>
                                )}
                                {activeTab === 'teachers' && (
                                    <div>
                                        <label style={labelStyle}>Department</label>
                                        <input required type="text" value={newUserForm.department} onChange={e => setNewUserForm({ ...newUserForm, department: e.target.value })} style={inputStyle} />
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                                Create Account
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
