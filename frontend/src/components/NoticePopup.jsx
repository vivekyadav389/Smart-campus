import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ChevronLeft, ChevronRight, Bell, Calendar, ExternalLink, Download } from 'lucide-react';
import { API_BASE_URL } from '../utils/mockDb';

const NoticePopup = () => {
    const { user } = useAuth();
    const [unreadNotices, setUnreadNotices] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    if (user?.role === 'admin') return null;

    useEffect(() => {
        const fetchUnread = async () => {
            if (!user) return;
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
                    // Filter: We will show all active notices that the user hasn't seen yet in this instance
                    // User requested "pop up har bar aye login karne pe"
                    setUnreadNotices(data.notices);
                    if (data.notices.length > 0) {
                        setIsOpen(true);
                    }
                }
            } catch (err) {
                console.error("Popup fetch error:", err);
            }
        };

        fetchUnread();
    }, [user]);

    const handleClose = async () => {
        const currentNotice = unreadNotices[currentIndex];

        // Mark as shown in CURRENT SESSION so it doesn't pop up again until reload
        const sessionShownRaw = sessionStorage.getItem('sc_notices_shown');
        const sessionShown = sessionShownRaw ? JSON.parse(sessionShownRaw) : [];
        if (!sessionShown.includes(currentNotice.id)) {
            sessionShown.push(currentNotice.id);
            sessionStorage.setItem('sc_notices_shown', JSON.stringify(sessionShown));
        }

        // Also Mark as viewed in DB for analytics/track
        try {
            await fetch(`${API_BASE_URL}/api/notices/${currentNotice.id}/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
        } catch (err) {
            console.error("View tracking error:", err);
        }

        if (currentIndex < unreadNotices.length - 1) {
            // Show next notice
            setCurrentIndex(currentIndex + 1);
        } else {
            // No more notices in this stack
            setIsOpen(false);
            setUnreadNotices([]);
        }
    };

    if (!isOpen || unreadNotices.length === 0) return null;

    const currentNotice = unreadNotices[currentIndex];

    const getFileUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return path;
    };

    const fileUrl = getFileUrl(currentNotice.file_path);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }}>
            <div className="card animate-fade-in" style={{ maxWidth: '700px', width: '100%', padding: 0, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', backgroundColor: currentNotice.priority === 'Urgent' ? '#ef4444' : 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Bell size={20} className="animate-pulse" />
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                            {currentNotice.priority === 'Urgent' ? 'URGENT NOTICE' : 'IMPORTANT ANNOUNCEMENT'}
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 400, opacity: 0.9 }}>
                                ({currentIndex + 1} of {unreadNotices.length})
                            </span>
                        </h3>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary', marginBottom: '0.5rem' }}>{currentNotice.title}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {new Date(currentNotice.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>Target: {currentNotice.audience}</span>
                        </div>
                    </div>

                    <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>
                        {currentNotice.description}
                    </p>

                    {/* File Attachment Viewer */}
                    {currentNotice.file_path && (
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>ATTACHMENT:</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', textDecoration: 'none' }}>
                                        <ExternalLink size={14} /> Full Screen
                                    </a>
                                    {currentNotice.type === 'PDF' && (
                                        <a href={fileUrl} download style={{ padding: '0.4rem 0.8rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', textDecoration: 'none' }}>
                                            <Download size={14} /> Download
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div style={{ width: '100%', height: '400px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                {currentNotice.type === 'Image' ? (
                                    <img
                                        src={fileUrl}
                                        alt={currentNotice.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#f1f5f9' }}
                                    />
                                ) : (
                                    <iframe
                                        src={`${fileUrl}#toolbar=0`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        title="PDF Viewer"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Controls */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        onClick={handleClose}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 700, borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    >
                        {currentIndex < unreadNotices.length - 1 ? 'Next Notice' : 'Close and Dismiss'}
                        {currentIndex < unreadNotices.length - 1 ? <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} /> : <X size={20} style={{ marginLeft: '0.5rem' }} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoticePopup;
