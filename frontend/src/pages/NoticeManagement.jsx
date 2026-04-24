import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Search, Trash2, Edit3, Eye, FileText, Image as ImageIcon, Clock, Calendar, Users, Filter, X, Download, Share2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/mockDb';

const NoticeManagement = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [selectedStats, setSelectedStats] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        title: '',
        description: '',
        type: 'Text',
        audience: 'Both',
        branch: 'All',
        batch: 'All',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        priority: 'Normal',
        file: null,
        file_path: null
    });

    const branches = ['All', 'Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'];
    const batches = ['All', '2021-2025', '2022-2026', '2023-2027', '2024-2028'];

    const fetchNotices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/notices`);
            const data = await res.json();
            if (data.success) {
                setNotices(data.notices);
            }
        } catch (err) {
            console.error("Failed to fetch notices:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleOpenModal = (notice = null) => {
        if (notice) {
            setFormData({
                id: notice.id,
                title: notice.title,
                description: notice.description || '',
                type: notice.type,
                audience: notice.audience,
                branch: notice.branch,
                batch: notice.batch,
                start_date: notice.start_date ? new Date(notice.start_date).toISOString().split('T')[0] : '',
                end_date: notice.end_date ? new Date(notice.end_date).toISOString().split('T')[0] : '',
                priority: notice.priority,
                file: null,
                file_path: notice.file_path
            });
        } else {
            setFormData({
                id: null,
                title: '',
                description: '',
                type: 'Text',
                audience: 'Both',
                branch: 'All',
                batch: 'All',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                priority: 'Normal',
                file: null,
                file_path: null
            });
        }
        setIsModalOpen(true);
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, file: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key !== 'file' && formData[key] !== null) {
                data.append(key, formData[key]);
            }
        });
        if (formData.file) {
            data.append('file', formData.file);
        }

        try {
            const method = formData.id ? 'PUT' : 'POST';
            const url = formData.id ? `${API_BASE_URL}/notices/${formData.id}` : `${API_BASE_URL}/notices`;
            
            const res = await fetch(url, {
                method,
                body: data
            });
            const result = await res.json();
            
            if (result.success) {
                setIsModalOpen(false);
                fetchNotices();
            } else {
                alert(`Failed to save notice: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Error saving notice:", err);
            alert(`Error saving notice: ${err.message}. Make sure server is running and multer is installed.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/notices/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchNotices();
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleShowStats = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/notices/${id}/stats`);
            const data = await res.json();
            if (data.success) {
                setSelectedStats(data.stats);
                setIsStatsModalOpen(true);
            }
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    };

    const filteredNotices = notices.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Notice Management</h1>
                    <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>Broadcast announcements to students and teachers</p>
                </div>

                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Create New Notice
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', minWidth: '300px', flex: 1 }}>
                        <Search size={18} className="text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search notices by title or content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Notice Details</th>
                                <th>Target Audience</th>
                                <th>Validity</th>
                                <th>Stats</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Loading notices...</td></tr>
                            ) : filteredNotices.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>No notices found.</td></tr>
                            ) : filteredNotices.map(notice => (
                                <tr key={notice.id}>
                                    <td style={{ width: '80px', textAlign: 'center' }}>
                                        <div style={{ 
                                            backgroundColor: notice.type === 'PDF' ? '#fee2e2' : notice.type === 'Image' ? '#e0e7ff' : '#f1f5f9',
                                            color: notice.type === 'PDF' ? '#ef4444' : notice.type === 'Image' ? '#6366f1' : '#64748b',
                                            width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
                                        }}>
                                            {notice.type === 'PDF' ? <FileText size={20} /> : notice.type === 'Image' ? <ImageIcon size={20} /> : <Megaphone size={20} />}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{notice.title}</span>
                                            {notice.priority === 'Urgent' && (
                                                <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>Urgent</span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {notice.description}
                                        </p>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}><Users size={14} inline /> {notice.audience}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{notice.branch} • {notice.batch}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {new Date(notice.start_date).toLocaleDateString()}</span>
                                            {notice.end_date && <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {new Date(notice.end_date).toLocaleDateString()}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <button onClick={() => handleShowStats(notice.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                            <Eye size={16} /> Views
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="nav-item" onClick={() => handleOpenModal(notice)} title="Edit Notice">
                                                <Edit3 size={18} />
                                            </button>
                                            <button className="nav-item" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(notice.id)} title="Delete Notice">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formData.id ? 'Edit Notice' : 'Create New Notice'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Notice Title</label>
                                    <input
                                        type="text"
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                                    <textarea
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem', minHeight: '100px' }}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Notice Type</label>
                                    <select
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Text">Text Only</option>
                                        <option value="Image">Image</option>
                                        <option value="PDF">PDF Document</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Priority</label>
                                    <select
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="Urgent">Urgent / Priority</option>
                                    </select>
                                </div>
                                {(formData.type === 'Image' || formData.type === 'PDF') && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Upload {formData.type}</label>
                                        <input
                                            type="file"
                                            className="search-input"
                                            style={{ width: '100%', padding: '0.75rem' }}
                                            accept={formData.type === 'PDF' ? '.pdf' : 'image/*'}
                                            onChange={handleFileChange}
                                            required={!formData.id}
                                        />
                                        {(formData.file || formData.file_path) && formData.type === 'Image' && (
                                            <div style={{ marginTop: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '0.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>Image Preview:</p>
                                                <img 
                                                    src={formData.file ? URL.createObjectURL(formData.file) : formData.file_path} 
                                                    alt="Preview" 
                                                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', backgroundColor: '#f1f5f9' }} 
                                                />
                                            </div>
                                        )}
                                        {formData.file && formData.type === 'PDF' && (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontSize: '0.85rem' }}>
                                                <FileText size={16} /> {formData.file.name} ready for upload
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Audience</label>
                                    <select
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.audience}
                                        onChange={e => setFormData({ ...formData, audience: e.target.value })}
                                    >
                                        <option value="Both">Both</option>
                                        <option value="Students">Students Only</option>
                                        <option value="Teachers">Teachers Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Branch</label>
                                    <select
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.branch}
                                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                    >
                                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Batch</label>
                                    <select
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.batch}
                                        onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                    >
                                        {batches.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Start Date</label>
                                    <input
                                        type="date"
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        min={formData.start_date}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" style={{ flex: 1, backgroundColor: '#f1f5f9' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : formData.id ? 'Update Notice' : 'Post Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {isStatsModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="modal-content" style={{ maxWidth: '700px', width: '100%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Notice Engagement</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Total Views: {selectedStats?.length > 0 ? selectedStats[0].totalViews : 0}</p>
                            </div>
                            <button onClick={() => setIsStatsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            <table className="user-table">
                                <thead>
                                    <tr>
                                        <th>User Name</th>
                                        <th>Role</th>
                                        <th>ID / Roll No</th>
                                        <th>Viewed At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStats?.length > 0 ? selectedStats.map((stat, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{stat.name}</td>
                                            <td><span className={`badge ${stat.role === 'student' ? 'badge-primary' : 'badge-success'}`}>{stat.role}</span></td>
                                            <td>{stat.rollNo || '-'}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{new Date(stat.viewed_at).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No views tracked yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NoticeManagement;
