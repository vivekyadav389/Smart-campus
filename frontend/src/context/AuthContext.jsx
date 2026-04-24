import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('userData');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }); // { role: 'student'|'teacher'|'admin', name: string, etc }

    // Device Fingerprinting for Session Verification
    const [deviceId] = useState(() => {
        try {
            let id = localStorage.getItem('device_id_fingerprint');
            if (!id) {
                id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('device_id_fingerprint', id);
            }
            return id;
        } catch (err) {
            console.warn("localStorage access denied for device ID, using ephemeral ID", err);
            return 'dev_ephemeral_' + Date.now();
        }
    });

    const login = (userData) => {
        setUser(userData);
        try {
            sessionStorage.removeItem('sc_notices_shown');
        } catch (e) {}
    };

    const logout = () => {
        setUser(null);
        try {
            localStorage.removeItem('userData');
            localStorage.removeItem('userRole');
            sessionStorage.removeItem('sc_notices_shown');
        } catch (e) {
            console.warn("localStorage clear failed", e);
        }
    };

    // Auto-Logout Polling mechanism
    useEffect(() => {
        let interval;
        if (user && user.role === 'student' && user.id) {
            interval = setInterval(async () => {
                try {
                    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
                    const res = await fetch(`${apiBaseUrl}/api/auth/verify-device/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.registeredDeviceId && data.registeredDeviceId !== deviceId) {
                            // The backend has a DIFFERENT device ID registered for this student now.
                            // This means the admin approved a new device, so this old one must be logged out immediately.
                            // We clear localStorage directly and redirect instead of calling logout() 
                            // to avoid tearing down the React tree mid-render and causing a blank screen.
                            localStorage.removeItem('userData');
                            localStorage.removeItem('userRole');

                            // Force a hard navigation away from the current React tree
                            window.location.href = '/login?reason=device_changed';
                        }
                    }
                } catch (e) {
                    console.error("Device Verification Error:", e);
                }
            }, 5000); // Check every 5 seconds
        }
        return () => clearInterval(interval);
    }, [user, deviceId]);

    return (
        <AuthContext.Provider value={{ user, login, logout, deviceId }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
