import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/mockDb';

const TopHeader = ({ user, onLogout, onToggleSidebar }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!user) return;
            try {
                const params = new URLSearchParams({
                    userId: user.id,
                    role: user.role,
                    branch: user.branch || 'All',
                    batch: user.batch || 'All'
                });
                const res = await fetch(`${API_BASE_URL}/notices/active?${params}`);
                const data = await res.json();
                if (data.success) {
                    const unread = data.notices.filter(n => n.viewCount === 0);
                    setUnreadCount(unread.length);
                }
            } catch (err) {
                console.error("Failed to fetch unread count:", err);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [user]);

    const handleBellClick = () => {
        if (user?.role === 'admin') {
            navigate('/admin/notices');
        } else {
            navigate(`/${user?.role}/notices`);
        }
    };

    return (
        <header className="top-header">
            <div className="flex items-center gap-4">
                <button
                    className="mobile-toggle p-2 hover:bg-gray-100 rounded-md"
                    onClick={onToggleSidebar}
                >
                    <Menu size={24} />
                </button>

                <div className="hidden md:block">
                    <h2 className="text-xl font-semibold text-gray-800" style={{ margin: 0 }}>
                        {user?.role === 'admin' ? 'Admin Portal' :
                            user?.role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}
                    </h2>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button
                    className="text-gray-500 hover:text-primary transition-colors position-relative"
                    onClick={handleBellClick}
                    style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span
                            className="position-absolute"
                            style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                minWidth: '18px',
                                height: '18px',
                                backgroundColor: 'var(--color-danger)',
                                color: 'white',
                                borderRadius: '50%',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3 border-l pl-6" style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem' }}>
                    <div className="flex flex-col text-right hidden md:flex" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '0.5rem' }}>
                        <span className="font-medium text-sm text-gray-900" style={{ fontWeight: 500 }}>{user?.name || 'User'}</span>
                        <span className="text-xs text-gray-500 capitalize" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{user?.role}</span>
                    </div>

                    <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold"
                        style={{ width: '36px', height: '36px', backgroundColor: '#f1f5f9', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {user?.profilePic ? (
                            <img src={user.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user?.name?.charAt(0) || 'U'
                        )}
                    </div>

                    <button
                        onClick={onLogout}
                        className="text-gray-500 hover:text-danger ml-2 transition-colors"
                        style={{ marginLeft: '0.5rem', color: 'var(--color-text-secondary)' }}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
