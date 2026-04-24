import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Settings, History, ClipboardList, Megaphone, X, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCollegeTiming } from '../utils/mockDb';

const Sidebar = ({ role, isOpen, onClose }) => {
    const [timings, setTimings] = useState(null);

    useEffect(() => {
        const fetchTimings = async () => {
            const data = await getCollegeTiming();
            if (data) setTimings(data);
        };
        fetchTimings();
    }, []);

    const formatTime = (time) => {
        if (!time) return '';
        const [hour, minute] = time.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minute} ${ampm}`;
    };

    const getNavItems = () => {
        switch (role) {
            case 'student':
                return [
                    { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { path: '/student/notices', icon: Megaphone, label: 'Notice Center' },
                    { path: '/student/history', icon: History, label: 'Attendance History' },
                ];
            case 'teacher':
                return [
                    { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'Live Overview' },
                    { path: '/teacher/notices', icon: Megaphone, label: 'Notice Center' },
                    { path: '/teacher/students', icon: Users, label: 'My Students' },
                ];
            case 'admin':
                return [
                    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
                    { path: '/admin/map', icon: Map, label: 'Manage Geo-Fence' },
                    { path: '/admin/users', icon: Users, label: 'Manage Users' },
                    { path: '/admin/notices', icon: Megaphone, label: 'Notices' },
                    { path: '/admin/reports', icon: ClipboardList, label: 'Reports' },
                    { path: '/admin/settings', icon: Settings, label: 'Settings' },
                ];
            default:
                return [];
        }
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Map className="text-primary" size={24} />
                    <span>SmartCampus</span>
                    <button className="mobile-toggle ml-auto text-text-secondary" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <ul className="flex flex-col gap-2">
                        {getNavItems().map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        onClick={() => { if (window.innerWidth <= 768) onClose(); }}
                                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        style={({ isActive }) => isActive ? { backgroundColor: 'var(--color-primary)', color: 'white' } : {}}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {timings && (
                    <div style={{ 
                        marginTop: 'auto', 
                        padding: '1.25rem', 
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-primary-bg)',
                        margin: '1rem',
                        borderRadius: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                            <Clock size={16} />
                            <span>Campus Hours</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {formatTime(timings.startTime)} – {formatTime(timings.endTime)}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={onClose}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30 }}
                />
            )}
        </>
    );
};

export default Sidebar;
