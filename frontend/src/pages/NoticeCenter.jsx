import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Megaphone, FileText, Image as ImageIcon, Download, Calendar, ArrowRight, Bell, Search, Filter, ChevronRight, History, Eye } from 'lucide-react';
import { API_BASE_URL } from '../utils/mockDb';

const NoticeCenter = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('Current'); // 'Current' or 'History'
    const [searchQuery, setSearchQuery] = useState('');

    const fetchNotices = async () => {
        try {
            const params = new URLSearchParams({
                userId: user.id,
                role: user.role,
                branch: user.branch || 'All',
                batch: user.batch || 'All'
            });
            const res = await fetch(`${API_BASE_URL}/api/notices/active?${params}`);
            const data = await res.json();
            if (data.success) {
                setNotices(data.notices);
                // Mark notices as viewed in background if not already viewed
                data.notices.forEach(notice => {
                    if (notice.viewCount === 0) {
                        fetch(`${API_BASE_URL}/api/notices/${notice.id}/view`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id })
                        }).catch(e => console.warn("Failed to mark viewed:", e));
                    }
                });
            }
        } catch (err) {
            console.error("Failed to fetch notices:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchNotices();
    }, [user]);

    // Group notices by month
    const groupNoticesByMonth = (noticeList) => {
        const groups = {};
        noticeList.forEach(notice => {
            const date = new Date(notice.created_at);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) groups[monthYear] = [];
            groups[monthYear].push(notice);
        });
        return groups;
    };

    const filteredNotices = notices.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             n.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const now = new Date();
        const endDate = n.end_date ? new Date(n.end_date) : null;
        const isCurrent = !endDate || endDate >= now;
        
        if (filter === 'Current') return matchesSearch && isCurrent;
        if (filter === 'History') return matchesSearch && !isCurrent;
        return matchesSearch;
    });

    const groupedNotices = notices.length > 0 ? groupNoticesByMonth(filteredNotices) : {};

    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Notice Center</h1>
                    <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>All updates and announcements relevant to you</p>
                </div>

                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg" style={{ backgroundColor: '#f1f5f9' }}>
                    <button 
                        onClick={() => setFilter('Current')}
                        className={`px-4 py-2 rounded-md transition-all ${filter === 'Current' ? 'bg-white shadow-sm font-bold text-primary' : 'text-gray-500'}`}
                        style={{ color: filter === 'Current' ? 'var(--color-primary)' : 'inherit', border: 'none', cursor: 'pointer' }}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => setFilter('History')}
                        className={`px-4 py-2 rounded-md transition-all ${filter === 'History' ? 'bg-white shadow-sm font-bold text-primary' : 'text-gray-500'}`}
                        style={{ color: filter === 'History' ? 'var(--color-primary)' : 'inherit', border: 'none', cursor: 'pointer' }}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
                <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '2rem' }}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search through notices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', outline: 'none', fontSize: '1rem' }}
                    />
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>Loading notices...</div>
                ) : Object.keys(groupedNotices).length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '50%' }}>
                            <History size={48} className="text-gray-300" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No notices found</h3>
                        <p className="text-gray-500">There are no notices matching your current filter in this section.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {Object.entries(groupedNotices).sort((a,b) => {
                            try {
                                return new Date(b[0]).getTime() - new Date(a[0]).getTime();
                            } catch (e) {
                                return 0;
                            }
                        }).map(([month, monthNotices]) => (
                            <div key={month} className="flex flex-col gap-4">
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                                    <Calendar size={20} /> {month}
                                </h2>
                                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                                    {monthNotices.map(notice => (
                                        <div key={notice.id} className="card hover-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', borderLeft: notice.priority === 'Urgent' ? '4px solid #ef4444' : 'none' }}>
                                            {notice.priority === 'Urgent' && (
                                                <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Bell size={12} /> URGENT
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={{ 
                                                    minWidth: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: notice.type === 'PDF' ? '#fee2e2' : notice.type === 'Image' ? '#e0e7ff' : '#f1f5f9',
                                                    color: notice.type === 'PDF' ? '#ef4444' : notice.type === 'Image' ? '#6366f1' : '#64748b',
                                                }}>
                                                    {notice.type === 'PDF' ? <FileText size={24} /> : notice.type === 'Image' ? <ImageIcon size={24} /> : <Megaphone size={24} />}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{notice.title}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                        <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>{notice.type}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                                                {notice.description}
                                            </p>

                                            {notice.file_path && (
                                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                                    {notice.type === 'Image' ? (
                                                        <a href={notice.file_path} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                                                            <Eye size={16} /> View Image
                                                        </a>
                                                    ) : (
                                                        <a href={notice.file_path} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                                                            <FileText size={16} /> Read PDF
                                                        </a>
                                                    )}
                                                    {notice.type === 'PDF' && (
                                                        <a href={notice.file_path} download className="btn" style={{ backgroundColor: '#f1f5f9', padding: '0.5rem' }}>
                                                            <Download size={16} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeCenter;
