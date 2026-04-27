import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Components
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import NoticePopup from './components/NoticePopup';
import BackgroundPermissionPrompt from './components/BackgroundPermissionPrompt';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import AdminMap from './pages/AdminMap';
import UserManagement from './pages/UserManagement';
import NoticeManagement from './pages/NoticeManagement';
import NoticeCenter from './pages/NoticeCenter';
import PlaceholderPage from './pages/PlaceholderPage';

function App() {
    const [userRole, setUserRole] = useState(() => {
        try { return localStorage.getItem('userRole') || null; }
        catch { return null; }
    });
    const [userData, setUserData] = useState(() => {
        try {
            const saved = localStorage.getItem('userData');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initial Permission Requests on App Load
    useEffect(() => {
        const requestDevicePermissions = async () => {
            // Request Notification Permission
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                try {
                    await Notification.requestPermission();
                } catch (err) {
                    console.warn("Notice permission error:", err);
                }
            }

            // Request Geolocation Permission quietly
            if ('geolocation' in navigator) {
                // If it's prompt state or unknown, we call getCurrentPosition to force the browser prompt
                navigator.geolocation.getCurrentPosition(
                    () => { console.log("Location permission actively granted via startup prompt."); },
                    (err) => { console.log("Location status on startup: ", err.message); },
                    { enableHighAccuracy: false, timeout: 5000 }
                );
            }
        };

        // Add a slight delay so it doesn't freeze the very first paint of the UI
        const timer = setTimeout(requestDevicePermissions, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleLogin = (user) => {
        setUserRole(user.role);
        setUserData(user);
        try {
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('userData', JSON.stringify(user));
            sessionStorage.removeItem('sc_notices_shown');
        } catch (e) {
            console.warn("localStorage write failed", e);
        }
    };

    const handleLogout = () => {
        setUserRole(null);
        setUserData(null);
        try {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('sc_notices_shown');
        } catch (e) {
            console.warn("localStorage clear failed", e);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Content routing based on auth state
    const AppContent = () => {
        if (!userRole) {
            return <Login onLogin={handleLogin} />;
        }

        return (
            <div className="app-layout">
                <Sidebar
                    role={userRole}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
                {userRole !== 'admin' && <NoticePopup />}
                <BackgroundPermissionPrompt />

                <div className="main-wrapper">
                    <TopHeader
                        user={userData}
                        onLogout={handleLogout}
                        onToggleSidebar={toggleSidebar}
                    />

                    <main className="main-content animate-fade-in">
                        <Routes>
                            {/* Student Routes */}
                            {userRole === 'student' && (
                                <>
                                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                                    <Route path="/student/notices" element={<NoticeCenter />} />
                                    <Route path="/student/history" element={<PlaceholderPage title="Attendance History" />} />
                                    <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
                                </>
                            )}

                            {/* Teacher Routes */}
                            {userRole === 'teacher' && (
                                <>
                                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                                    <Route path="/teacher/notices" element={<NoticeCenter />} />
                                    <Route path="/teacher/students" element={<PlaceholderPage title="Full Student Directory" />} />
                                    <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
                                </>
                            )}

                            {/* Admin Routes */}
                            {userRole === 'admin' && (
                                <>
                                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                    <Route path="/admin/map" element={<AdminMap />} />
                                    <Route path="/admin/users" element={<UserManagement />} />
                                    <Route path="/admin/notices" element={<NoticeManagement />} />
                                    <Route path="/admin/reports" element={<PlaceholderPage title="Advanced Reports & Analytics" />} />
                                    <Route path="/admin/settings" element={<AdminSettings />} />
                                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                                </>
                            )}
                        </Routes>
                    </main>
                </div>
            </div>
        );
    };

    // Main wrapper provides Router context to both Login and Main App
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
        </Router>
    );
}

export default App;
