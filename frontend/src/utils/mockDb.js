export const API_BASE_URL = import.meta.env.VITE_API_URL;

// --- Authentication ---
export const authenticateUser = async (email, password, deviceId) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, deviceId })
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(text || "API Error");
        }

        return data;
    } catch (error) {
        console.error("Auth API Error:", error);
        return { success: false, error: 'Network Error connecting to Database.' };
    }
};

export const addUser = async (role, userData) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userData, role })
        });
        const data = await res.json();
        return data.success;
    } catch {
        return false;
    }
};

// --- Statistics ---
export const getStats = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users`);
        const { users } = await res.json();

        const todayRes = await fetch(`${API_BASE_URL}/api/attendance/today`);
        const { logs } = await todayRes.json();

        const students = users?.filter(u => u.role === 'student') || [];
        const activeGeoZones = 1;

        // True calculation based on today's logs
        const presentLogs = logs?.filter(l => l.status === 'Present') || [];
        const insideCampus = presentLogs.length;

        return {
            totalStudents: students.length,
            insideCampus: insideCampus,
            activeGeoZones,
        };
    } catch {
        return { totalStudents: 0, insideCampus: 0, activeGeoZones: 1 };
    }
};

export const getDepartmentStats = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users`);
        const { users } = await res.json();
        const students = users?.filter(u => u.role === 'student') || [];

        const todayRes = await fetch(`${API_BASE_URL}/api/attendance/today`);
        const { logs } = await todayRes.json();

        // Group by department 
        const stats = {};
        students.forEach(s => {
            if (s.department || s.branch) {
                const dept = s.department || s.branch;
                if (!stats[dept]) stats[dept] = { present: 0, total: 0 };
                stats[dept].total++;

                // Check if this student is present today
                const log = logs?.find(l => l.studentId === s.id);
                if (log && log.status === 'Present') {
                    stats[dept].present++;
                }
            }
        });

        return Object.entries(stats).map(([department, data]) => ({
            department,
            present: data.present,
            total: data.total,
            percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
        }));
    } catch {
        return [];
    }
};

// --- System Settings ---
export const getCollegeTiming = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        const data = await res.json();
        return data.settings?.collegeTiming || { startTime: '08:00', endTime: '16:00' };
    } catch {
        return { startTime: '08:00', endTime: '16:00' };
    }
};

export const updateCollegeTiming = async (startTime, endTime, adminId) => {
    try {
        await fetch(`${API_BASE_URL}/api/settings/timings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime, endTime, adminId })
        });
        return true;
    } catch {
        return false;
    }
};

const GEOFENCE_KEY = 'sc_geofence_data';

export const getGeofence = async () => {
    // 1. Try localStorage first (fastest, always fresh from last save)
    try {
        const local = localStorage.getItem(GEOFENCE_KEY);
        if (local) {
            const parsed = JSON.parse(local);
            if (parsed && (parsed.polygon?.length > 0 || parsed.radius)) {
                return parsed;
            }
        }
    } catch (_) { }

    // 2. Fallback to server
    try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        const data = await res.json();
        const gf = data.settings?.geofence;
        if (gf && (gf.polygon?.length > 0 || gf.radius)) {
            // Cache it locally for next time
            localStorage.setItem(GEOFENCE_KEY, JSON.stringify(gf));
            return gf;
        }
    } catch (_) { }

    return { center: [19.1334, 72.9133], radius: 300 };
};

export const updateGeofence = async (geofenceData) => {
    // 1. Always save to localStorage immediately (this is the source of truth)
    try {
        localStorage.setItem(GEOFENCE_KEY, JSON.stringify(geofenceData));
        console.log('[Geofence] Saved to localStorage:', geofenceData);
    } catch (e) {
        console.error('[Geofence] localStorage write failed:', e);
    }

    // 2. Also try to sync to server (best-effort, don't fail the operation)
    try {
        const res = await fetch(`${API_BASE_URL}/api/settings/geofence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geofenceData)
        });
        const data = await res.json();
        console.log('[Geofence API] server response:', data);
    } catch (err) {
        console.warn('[Geofence API] Server sync failed (data still saved locally):', err.message);
    }

    return true; // Always succeed since localStorage worked
};


// --- Device Restriction Management (Admin) ---
export const getDeviceRequests = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/device-requests`);
        const data = await res.json();
        return data.requests || [];
    } catch {
        return [];
    }
};

export const approveDeviceRequest = async (requestId) => {
    try {
        await fetch(`${API_BASE_URL}/api/device-requests/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        return true;
    } catch {
        return false;
    }
};

export const rejectDeviceRequest = async (requestId) => {
    try {
        await fetch(`${API_BASE_URL}/api/device-requests/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        return true;
    } catch {
        return false;
    }
};

// --- Attendance Tracking ---
export const markAttendance = async (studentId, status, timeIn, timeOut) => {
    try {
        await fetch(`${API_BASE_URL}/api/attendance/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, status, timeIn, timeOut })
        });
        return true;
    } catch {
        return false;
    }
};

export const markManualAttendance = async (studentId, date, status) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/manual-mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, date, status })
        });
        const data = await res.json();
        return data.success;
    } catch {
        return false;
    }
};

export const getAttendanceLogs = async (studentId) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/logs/${studentId}`);
        const data = await res.json();
        return data.logs || [];
    } catch {
        return [];
    }
};

export const getTodayAttendance = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/today`);
        const data = await res.json();
        return data.logs || [];
    } catch {
        return [];
    }
};

export const getAttendanceByDate = async (date) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/date/${date}`);
        const data = await res.json();
        return data.logs || [];
    } catch {
        return [];
    }
};

export const getAttendanceRange = async (startDate, endDate) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/range?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        return data.logs || [];
    } catch {
        return [];
    }
};

// --- Calendar Feature ---
export const getCalendarEvents = async (status) => {
    try {
        let url = `${API_BASE_URL}/api/calendar`;
        if (status) {
            url += `?status=${encodeURIComponent(status)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        return data.events || [];
    } catch {
        return [];
    }
};

export const saveCalendarEvent = async (eventDataArrayOrObj) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventDataArrayOrObj)
        });
        const data = await res.json();
        return data; // returns { success, error }
    } catch (err) {
        return { success: false, error: err.message };
    }
};

export const verifyAllCalendarEvents = async () => {
    try {
        console.log(`[mockDb] Calling PUT ${API_BASE_URL}/api/calendar/verify-all`);
        const res = await fetch(`${API_BASE_URL}/api/calendar/verify-all`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log(`[mockDb] verifyAllCalendarEvents response:`, data);
        return data.success;
    } catch (error) {
        console.error(`[mockDb] Error in verifyAllCalendarEvents:`, error);
        return false;
    }
};

export const rejectAllCalendarEvents = async () => {
    try {
        console.log(`[mockDb] Calling DELETE ${API_BASE_URL}/api/calendar/reject-all`);
        const res = await fetch(`${API_BASE_URL}/api/calendar/reject-all`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log(`[mockDb] rejectAllCalendarEvents response:`, data);
        return data.success;
    } catch (error) {
        console.error(`[mockDb] Error in rejectAllCalendarEvents:`, error);
        return false;
    }
};

export const verifyCalendarEvent = async (id) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/calendar/${id}/verify`, {
            method: 'PUT'
        });
        const data = await res.json();
        return data.success;
    } catch {
        return false;
    }
};

export const deleteCalendarEvent = async (id) => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/calendar/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        return data.success;
    } catch {
        return false;
    }
};
