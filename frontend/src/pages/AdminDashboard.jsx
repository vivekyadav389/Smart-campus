import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, MapPin, Building, Activity, Download, Settings, ChevronRight, Save, X, Calendar as CalendarIcon, CheckCircle, XCircle, Trash2, PlusCircle } from 'lucide-react';
import { getStats, getDepartmentStats, getCollegeTiming, updateCollegeTiming, getGeofence, updateGeofence, getDeviceRequests, approveDeviceRequest, rejectDeviceRequest, getCalendarEvents, verifyCalendarEvent, deleteCalendarEvent, verifyAllCalendarEvents, rejectAllCalendarEvents, getTodayAttendance } from '../utils/mockDb';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Async Data States
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalStudents: 0, insideCampus: 0, activeGeoZones: 1 });
    const [departments, setDepartments] = useState([]);
    const [timingConfig, setTimingConfig] = useState({ startTime: '08:00', endTime: '16:00' });
    const [deviceReqs, setDeviceReqs] = useState([]);
    const [calendarReqs, setCalendarReqs] = useState([]);

    // Admin Calendar States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Total Students Modal States
    const [isTotalStudentsModalOpen, setIsTotalStudentsModalOpen] = useState(false);
    const [allStudentsData, setAllStudentsData] = useState([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    // Activity Log States
    const [detailedLogs, setDetailedLogs] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);
    const [securityAlerts, setSecurityAlerts] = useState([]);

    const pendingCount = useMemo(() => calendarReqs.filter(e => e.status === 'Pending').length, [calendarReqs]);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!user?.id) return;
            try {
                const [newStats, newDepts, timings, geofence, reqs, cReqs] = await Promise.all([
                    getStats(),
                    getDepartmentStats(),
                    getCollegeTiming(),
                    getGeofence(),
                    getDeviceRequests(),
                    getCalendarEvents()
                ]);

                setStats(newStats);
                setDepartments(newDepts);
                setTimingConfig(timings);
                setDeviceReqs(reqs);
                setCalendarReqs(cReqs);
            } catch (err) {
                console.error("Error loading admin data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const handleSaveTiming = async (e) => {
        e.preventDefault();
        if (window.confirm("Changing timings will RECALCULATE today's attendance for all students. Proceed?")) {
            const success = await updateCollegeTiming(timingConfig.startTime, timingConfig.endTime, user?.id);
            if (success) alert("College timing rules updated. Today's attendance has been recalculated.");
            else alert("Failed to update timing rules.");
        }
    };

    const handleApproveDevice = async (reqId) => {
        const success = await approveDeviceRequest(reqId);
        if (success) {
            setDeviceReqs(await getDeviceRequests());
            alert('Device approved successfully. The student can now log in on their new device.');
        } else alert("Approval failed.");
    };

    const handleRejectDevice = async (reqId) => {
        const success = await rejectDeviceRequest(reqId);
        if (success) {
            setDeviceReqs(await getDeviceRequests());
            alert('Device request rejected.');
        } else alert("Rejection failed.");
    };

    const handleApproveCalendar = async (id) => {
        const success = await verifyCalendarEvent(id);
        if (success) {
            setCalendarReqs(await getCalendarEvents());
            setIsEventModalOpen(false);
            alert('Calendar event verified successfully.');
        } else alert("Approval failed.");
    };

    const handleVerifyAllCalendar = async () => {
        if (pendingCount === 0) {
            alert("No pending events to verify.");
            return;
        }
        if (window.confirm(`Are you sure you want to verify all ${pendingCount} pending events?`)) {
            const success = await verifyAllCalendarEvents();
            if (success) {
                setCalendarReqs(await getCalendarEvents());
                alert('All pending calendar events verified successfully.');
            } else {
                alert("Failed to verify all events.");
            }
        }
    };

    const handleRejectAllCalendar = async () => {
        if (pendingCount === 0) {
            alert("No pending events to reject.");
            return;
        }
        if (window.confirm(`Are you sure you want to REJECT and DELETE all ${pendingCount} pending events?`)) {
            const success = await rejectAllCalendarEvents();
            if (success) {
                setCalendarReqs(await getCalendarEvents());
                alert('All pending calendar events rejected and deleted.');
            } else {
                alert("Failed to reject all events.");
            }
        }
    };

    const handleRejectCalendar = async (id) => {
        if (window.confirm('Are you sure you want to reject and delete this calendar event?')) {
            const success = await deleteCalendarEvent(id);
            if (success) {
                setCalendarReqs(await getCalendarEvents());
                setIsEventModalOpen(false);
                alert('Calendar event deleted.');
            } else alert("Deletion failed.");
        }
    };

    const fetchAllStudents = async () => {
        setIsLoadingStudents(true);
        try {
            // Fetch users & today's attendance concurrently
            const [usersRes, todayLogs] = await Promise.all([
                fetch((import.meta.env.VITE_API_URL || '') + '/api/users'),
                getTodayAttendance()
            ]);

            const data = await usersRes.json();
            if (data.success) {
                const studentUsers = data.users.filter(u => u.role === 'student');
                const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

                // Map the logs to each student, matching the logic from TeacherDashboard
                const mappedStudents = studentUsers.map(student => {
                    const log = todayLogs.find(l => l.studentId === student.id);
                    return {
                        ...student,
                        status: isWeekend ? 'Weekend' : (log ? log.status : 'Absent'),
                        timeIn: isWeekend ? '-' : (log && log.timeIn ? log.timeIn : '-'),
                        timeOut: isWeekend ? '-' : (log && log.timeOut ? log.timeOut : '-')
                    };
                });

                setAllStudentsData(mappedStudents);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const openTotalStudentsModal = () => {
        setIsTotalStudentsModalOpen(true);
        if (allStudentsData.length === 0) {
            fetchAllStudents();
        }
    };

    const fetchDetailedLogs = useCallback(async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/attendance/detailed-logs?date=${selectedDate}`);
            const data = await res.json();
            if (data.success) {
                setDetailedLogs(data.logs);
            }
        } catch (err) {
            console.error("Fetch detailed logs error:", err);
        }
    }, [selectedDate]);

    const fetchSecurityAlerts = useCallback(async () => {
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/alerts');
            const data = await res.json();
            if (data.success) {
                setSecurityAlerts(data.alerts);
            }
        } catch (err) {
            console.error("Fetch alerts error:", err);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'activityLog') {
            fetchDetailedLogs();
        } else if (activeTab === 'securityAlerts') {
            fetchSecurityAlerts();
        }
    }, [activeTab, fetchDetailedLogs, fetchSecurityAlerts]);

    const handleManualApprove = async (studentId) => {
        if (window.confirm("Approve attendance for this student manually?")) {
            try {
                await fetch((import.meta.env.VITE_API_URL || '') + '/api/attendance/manual-mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date: selectedDate, status: 'Present' })
                });
                fetchDetailedLogs();
                alert("Attendance approved manually.");
            } catch (err) {
                alert("Failed to approve attendance.");
            }
        }
    };

    const handleRunValidation = async (studentId) => {
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/attendance/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, date: selectedDate })
            });
            const data = await res.json();
            if (data.success) {
                fetchDetailedLogs();
                alert(`Validation complete: Status is ${data.status}`);
            }
        } catch (err) {
            alert("Validation failed.");
        }
    };



    if (isLoading) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Admin Dashboard Dashboard...</div>;
    }

    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Admin Control Center</h1>
                    <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>System overview and configuration</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                        <Settings size={18} /> Configure System
                    </button>
                    <button className="btn btn-primary">
                        <Download size={18} /> Export Daily Report
                    </button>
                </div>
            </div>

            {/* Admin Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'overview' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'overview' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem'
                    }}
                >
                    Campus Overview
                </button>

                <button
                    onClick={() => setActiveTab('timings')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'timings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'timings' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem'
                    }}
                >
                    Time Boundaries
                </button>
                <button
                    onClick={() => setActiveTab('devices')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'devices' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'devices' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Device Requests
                    {deviceReqs.length > 0 && (
                        <span style={{ backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {deviceReqs.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('calendarRequests')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'calendarRequests' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'calendarRequests' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Calendar Request
                    {calendarReqs.length > 0 && (
                        <span style={{ backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {calendarReqs.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('activityLog')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'activityLog' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'activityLog' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Activity size={18} /> Activity Log
                </button>
                <button
                    onClick={() => setActiveTab('securityAlerts')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'securityAlerts' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'securityAlerts' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Security Alerts
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="animate-fade-in grid gap-6">
                    {/* Top Level Stats */}
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div
                            className="card hover:shadow-md cursor-pointer transition-shadow"
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                            onClick={openTotalStudentsModal}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Students</span>
                                <Users size={20} className="text-primary" />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.totalStudents}</h2>
                        </div>

                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Inside Campus Today</span>
                                <Activity size={20} className="text-success" style={{ color: 'var(--color-success)' }} />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.insideCampus}</h2>
                        </div>

                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Geo-Zones</span>
                                <MapPin size={20} className="text-primary" />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.activeGeoZones}</h2>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        {/* Department Wise Attendance */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building size={20} className="text-primary" />
                                Department Attendance
                            </h3>

                            <div className="flex flex-col gap-4">
                                {departments.map((dept, idx) => (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                            <span style={{ fontWeight: 500 }}>{dept.department || dept.name}</span>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                                {dept.present}/{dept.total} (<span style={{ fontWeight: 600, color: dept.percentage > 85 ? 'var(--color-success)' : 'var(--color-warning)' }}>{dept.percentage}%</span>)
                                            </span>
                                        </div>
                                        {/* Progress Bar Background */}
                                        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            {/* Progress Bar Fill */}
                                            <div style={{
                                                height: '100%',
                                                width: `${dept.percentage}%`,
                                                backgroundColor: dept.percentage > 85 ? 'var(--color-success)' : 'var(--color-warning)',
                                                borderRadius: '4px',
                                                transition: 'width 1s ease-out'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions List */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>System Management</h3>

                            <div className="flex flex-col gap-3">
                                {/* Explicit Actions mapped with real router links if necessary */}

                                <button
                                    onClick={() => window.location.href = '/admin/users'}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem',
                                        textAlign: 'left', transition: 'background-color 0.2s', width: '100%',
                                        backgroundColor: 'transparent', cursor: 'pointer'
                                    }}
                                    className="hover:bg-gray-50 hover:border-primary"
                                >
                                    <div>
                                        <h4 style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Manage Users (Credentials)</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>View/Edit Student & Teacher Passwords</p>
                                    </div>
                                    <ChevronRight size={18} className="text-primary" />
                                </button>

                                <button
                                    onClick={() => setActiveTab('timings')}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem',
                                        textAlign: 'left', transition: 'background-color 0.2s', width: '100%',
                                        backgroundColor: 'transparent', cursor: 'pointer'
                                    }} className="hover:bg-gray-50 hover:border-primary">
                                    <div>
                                        <h4 style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Define Time Boundaries</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Set college entry and exit timing rules</p>
                                    </div>
                                    <ChevronRight size={18} className="text-primary" />
                                </button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem',
                                    textAlign: 'left', transition: 'background-color 0.2s', width: '100%',
                                    backgroundColor: 'transparent', cursor: 'pointer'
                                }} className="hover:bg-gray-50">
                                    <div>
                                        <h4 style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Approve Leaves</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Review pending leave requests</p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-400" />
                                </button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem',
                                    textAlign: 'left', transition: 'background-color 0.2s', width: '100%',
                                    backgroundColor: 'transparent', cursor: 'pointer'
                                }} className="hover:bg-gray-50">
                                    <div>
                                        <h4 style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>System Logs</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>View API and geo-location error logs</p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-400" />
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'activityLog' && (
                <div className="animate-fade-in grid gap-6">
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Detailed Geofence Entry/Exit Log</h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Track student movements and validate attendance records.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                />
                                <button className="btn btn-primary" onClick={fetchDetailedLogs}>Refresh</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Student</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Branch/Batch</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Entries</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Duration</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Validation</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedLogs.length > 0 ? (
                                        detailedLogs.map((log) => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{log.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{log.rollNo}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div>{log.branch}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Batch {log.batch}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>{log.entryCount || 0}</span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    {log.totalDurationMinutes ? `${log.totalDurationMinutes} min` : '--'}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <span className={`badge ${log.validationStatus === 'Valid' ? 'badge-success' : (log.status === 'Present' ? 'badge-success' : 'badge-danger')}`}>
                                                            {log.validationStatus || 'Pending'}
                                                        </span>
                                                        {log.validationReason && (
                                                            <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{log.validationReason}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                            onClick={() => setSelectedLogForDetail(log)}
                                                        >
                                                            Timeline
                                                        </button>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                            onClick={() => handleRunValidation(log.studentId)}
                                                        >
                                                            Validate
                                                        </button>
                                                        {log.status !== 'Present' && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--color-success)' }}
                                                                onClick={() => handleManualApprove(log.studentId)}
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                No activity logs found for this date.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Timeline Detail Modal */}
                    {selectedLogForDetail && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                                <button onClick={() => setSelectedLogForDetail(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                    <X size={20} />
                                </button>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Movement Timeline</h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{selectedLogForDetail.name} • {selectedDate}</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                    {selectedLogForDetail.timeline && selectedLogForDetail.timeline.length > 0 ? (
                                        selectedLogForDetail.timeline.map((ev, i) => (
                                            <div key={i} style={{ position: 'relative' }}>
                                                <div style={{
                                                    position: 'absolute', left: '-1.4rem', top: '0.25rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%',
                                                    backgroundColor: ev.eventType === 'ENTRY' ? 'var(--color-success)' : 'var(--color-danger)',
                                                    border: '2px solid white'
                                                }}></div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.eventType}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: 'var(--color-text-secondary)', padding: '1rem 0' }}>No movements recorded.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {activeTab === 'timings' && (
                <div className="animate-fade-in card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Define Time Boundaries</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        Set the daily core hours. Students can only be marked Present if they enter the geo-fence within this time frame.
                        If they leave before the End Time, they will be flagged as &quot;Left Campus&quot;.
                    </p>

                    <form onSubmit={handleSaveTiming} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Start Time</label>
                                <input
                                    type="time"
                                    required
                                    value={timingConfig.startTime}
                                    onChange={(e) => setTimingConfig({ ...timingConfig, startTime: e.target.value })}
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}
                                />
                            </div>
                            <div style={{ padding: '0 1rem', color: 'var(--color-text-secondary)', alignSelf: 'flex-end', paddingBottom: '0.75rem' }}>to</div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>End Time</label>
                                <input
                                    type="time"
                                    required
                                    value={timingConfig.endTime}
                                    onChange={(e) => setTimingConfig({ ...timingConfig, endTime: e.target.value })}
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>How it works:</h4>
                            <ul style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '1.25rem' }}>
                                <li>Attendance tracking is only active between {timingConfig.startTime} and {timingConfig.endTime}.</li>
                                <li>Entering the campus before {timingConfig.startTime} won't count until the start time.</li>
                                <li>Leaving the campus before {timingConfig.endTime} triggers a "Left Campus" early exit flag.</li>
                            </ul>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                            <Save size={18} /> Save Time Boundaries
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'devices' && (
                <div className="animate-fade-in card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Login Device Requests</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        Students who attempt to log in from an unrecognized device require approval.
                        Approving a new device will automatically revoke their access from their old device.
                    </p>

                    {deviceReqs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--color-border)', borderRadius: '0.5rem', backgroundColor: '#fafafa' }}>
                            <Activity size={32} style={{ color: 'var(--color-text-secondary)', margin: '0 auto 1rem auto' }} />
                            <h4 style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>No Pending Requests</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>All students are logging in from authorized devices.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {deviceReqs.map(req => (
                                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', backgroundColor: 'white' }}>
                                    <div>
                                        <h4 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{req.studentName}</h4>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                            <span><strong>ID:</strong> {req.studentId}</span>
                                            <span><strong>Requested:</strong> {new Date(req.timestamp).toLocaleString()}</span>
                                            <span style={{ fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '0 0.25rem', borderRadius: '0.25rem' }}>Device: {req.newDeviceId}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button onClick={() => handleRejectDevice(req.id)} className="btn" style={{ backgroundColor: 'white', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                                            Reject
                                        </button>
                                        <button onClick={() => handleApproveDevice(req.id)} className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                                            Approve Device
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'securityAlerts' && (
                <div className="animate-fade-in grid gap-6">
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Security Alerts</h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Monitor suspicious login attempts and proxy attendance.</p>
                            </div>
                            <button className="btn btn-primary" onClick={fetchSecurityAlerts}>Refresh</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {securityAlerts.length > 0 ? securityAlerts.map(alert => (
                                <div key={alert.id} style={{ padding: '1rem', border: '1px solid var(--color-danger)', borderRadius: '0.5rem', backgroundColor: '#fef2f2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <h4 style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{alert.action_type}</h4>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{new Date(alert.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={{ color: 'var(--color-text-primary)' }}>{alert.details}</p>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No security alerts found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'calendarRequests' && (() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const monthName = currentDate.toLocaleString('default', { month: 'long' });

                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

                const getEventForDate = (dateLocalStr) => calendarReqs.find(e => {
                    const d = new Date(e.date);
                    const dbDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return dbDate === dateLocalStr;
                });

                const handleDayClick = (day) => {
                    const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const existingEvent = getEventForDate(localDateStr);

                    if (existingEvent) {
                        setSelectedEvent(existingEvent);
                        setIsEventModalOpen(true);
                    }
                };

                return (
                    <div className="animate-fade-in card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CalendarIcon className="text-primary" /> System Calendar
                                </h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                    Manage and verify teacher schedule requests. <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{pendingCount} Pending</span>.
                                    {pendingCount > 0 && (
                                        <div style={{ display: 'inline-flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                            <button
                                                onClick={handleVerifyAllCalendar}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Verify All
                                            </button>
                                            <button
                                                onClick={handleRejectAllCalendar}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Reject All
                                            </button>
                                        </div>
                                    )}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button className="btn btn-outline" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&lt; Prev</button>
                                <span style={{ fontWeight: 600, fontSize: '1.125rem', minWidth: '120px', textAlign: 'center' }}>{monthName} {year}</span>
                                <button className="btn btn-outline" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>Next &gt;</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} style={{ fontWeight: 600, color: 'var(--color-text-secondary)', padding: '0.5rem' }}>{day}</div>
                            ))}
                            {blanks.map(blank => <div key={`blank-${blank}`} style={{ padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}></div>)}
                            {days.map(day => {
                                const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const evt = getEventForDate(localDateStr);

                                let bgClass = 'bg-white';
                                let borderClass = 'border-gray-200';

                                if (evt) {
                                    if (evt.type === 'Holiday') {
                                        bgClass = evt.status === 'Verified' ? 'bg-green-50' : 'bg-yellow-50';
                                        borderClass = evt.status === 'Verified' ? 'border-green-200' : 'border-yellow-200';
                                    } else {
                                        bgClass = evt.status === 'Verified' ? 'bg-blue-50' : 'bg-yellow-50';
                                        borderClass = evt.status === 'Verified' ? 'border-blue-200' : 'border-yellow-200';
                                    }
                                }

                                return (
                                    <div
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`relative ${evt ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${bgClass}`}
                                        style={{
                                            padding: '0.5rem',
                                            minHeight: '100px',
                                            border: `1px solid var(--color-border)`,
                                            borderColor: borderClass !== 'border-gray-200' ? `var(--${borderClass.replace('border-', 'color-')})` : undefined,
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <span style={{ fontWeight: 500, alignSelf: 'flex-end', color: 'var(--color-text-secondary)' }}>{day}</span>
                                        {evt && (
                                            <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left' }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    color: evt.type === 'Holiday' ? (evt.status === 'Verified' ? 'var(--color-success)' : '#ca8a04') : 'var(--color-primary)'
                                                }}>{evt.type}</div>
                                                <div style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={evt.reason}>
                                                    {evt.reason || 'No reason'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', marginTop: '0.25rem', color: evt.status === 'Pending' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                                    {evt.status === 'Pending' ? <Activity size={10} /> : <CheckCircle size={10} />}
                                                    {evt.status}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Event Details Modal */}
                        {isEventModalOpen && selectedEvent && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                                <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
                                    <button onClick={() => setIsEventModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                        <X size={20} />
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Event Details</h2>
                                        <span className={`badge ${selectedEvent.status === 'Verified' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                                            {selectedEvent.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Date</span>
                                            <span style={{ fontWeight: 500 }}>{new Date(selectedEvent.date).toISOString().split('T')[0]}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Type</span>
                                            <span style={{ fontWeight: 600, color: selectedEvent.type === 'Holiday' ? 'var(--color-warning)' : 'var(--color-primary)' }}>{selectedEvent.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Reason / Notes</span>
                                            <span style={{ fontWeight: 500 }}>{selectedEvent.reason || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>Requested By</span>
                                            <span style={{ fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>
                                                Teacher ID: {selectedEvent.teacherId}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => handleRejectCalendar(selectedEvent.id)}
                                            className="btn btn-outline"
                                            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', flex: 1 }}
                                        >
                                            <XCircle size={16} /> Delete Event
                                        </button>

                                        {selectedEvent.status === 'Pending' && (
                                            <button
                                                onClick={() => handleApproveCalendar(selectedEvent.id)}
                                                className="btn btn-primary"
                                                style={{ flex: 1, backgroundColor: 'var(--color-success)' }}
                                            >
                                                <CheckCircle size={16} /> Verify Event
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Total Students Modal */}
            {isTotalStudentsModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => setIsTotalStudentsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            <X size={20} />
                        </button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Total Students List</h2>

                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search by name or roll no..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none' }}
                            />
                        </div>

                        {isLoadingStudents ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>Loading students...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {allStudentsData.filter(student =>
                                    student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                    (typeof student.rollNo === 'string' && student.rollNo.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
                                    (typeof student.id === 'string' && student.id.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                ).map((student, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '0.75rem',
                                        backgroundColor: 'white'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>{student.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                ID: {student.rollNo || student.id} • {student.branch || 'N/A'} {student.batch ? `• Batch ${student.batch}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '1rem',
                                                backgroundColor: student.status === 'Present' ? '#dcfce7' : (student.status === 'Left Campus' ? '#fef3c7' : (student.status === 'Weekend' ? '#f3f4f6' : '#fee2e2')),
                                                color: student.status === 'Present' ? '#166534' : (student.status === 'Left Campus' ? '#92400e' : (student.status === 'Weekend' ? '#4b5563' : '#991b1b')),
                                                border: `1px solid ${student.status === 'Present' ? '#bbf7d0' : (student.status === 'Left Campus' ? '#fde68a' : (student.status === 'Weekend' ? '#d1d5db' : '#fecaca'))}`
                                            }}>
                                                {student.status === 'Weekend' ? 'Weekend - Closed' : student.status}
                                            </span>
                                            {(student.status !== 'Weekend' && student.status !== 'Absent') && (() => {
                                                const noExit = student.timeOut === '-' || student.timeOut === '--:--' || !student.timeOut;
                                                const hasEntry = student.timeIn !== '-' && student.timeIn !== '--:--' && !!student.timeIn;
                                                const isToday = selectedDate === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

                                                let isPastEndTime = false;
                                                if (timingConfig && timingConfig.endTime) {
                                                    const now = new Date();
                                                    const [endHours, endMinutes] = timingConfig.endTime.split(':').map(Number);
                                                    isPastEndTime = now.getHours() > endHours || (now.getHours() === endHours && now.getMinutes() >= endMinutes);
                                                }

                                                let exitLabel = student.timeOut;
                                                if (student.status === 'Present' && noExit && isToday && !isPastEndTime) {
                                                    exitLabel = 'Inside';
                                                } else if (hasEntry && noExit) {
                                                    exitLabel = 'Not Captured';
                                                }

                                                return (
                                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={12} className="text-success" /> In: {student.timeIn}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} className="text-danger" /> Out: {exitLabel}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                                {allStudentsData.filter(student =>
                                    student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                    (typeof student.rollNo === 'string' && student.rollNo.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
                                    (typeof student.id === 'string' && student.id.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                ).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-secondary)' }}>No students found.</div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'semesters' && (
                <div className="card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Semester Management</h2>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Manage academic terms and tracking cycles.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setIsSemesterModalOpen(true)}>
                            <Plus size={18} /> Create Semester
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Semester</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Branch & Batch</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Duration</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>State</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {semesters.map(sem => (
                                    <tr key={sem.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{sem.name}</td>
                                        <td style={{ padding: '1rem' }}>{sem.branch} <br/><span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Batch {sem.batch}</span></td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                            {sem.start_date && sem.end_date ? (
                                                <>{new Date(sem.start_date).toLocaleDateString()} to <br/> {new Date(sem.end_date).toLocaleDateString()}</>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Manual Operation</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className={`badge ${sem.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                                                {sem.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className={`badge ${sem.state === 'Active' ? 'badge-primary' : (sem.state === 'Ended' ? 'badge-danger' : 'badge-secondary')}`}>
                                                {sem.state}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {sem.status === 'Pending' && (
                                                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }} onClick={() => handleUpdateSemesterStatus(sem.id, { status: 'Approved' })}>Approve</button>
                                                )}
                                                {sem.status === 'Approved' && sem.state === 'Upcoming' && (
                                                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateSemesterStatus(sem.id, { state: 'Active' })}>Force Start</button>
                                                )}
                                                {sem.status === 'Approved' && sem.state === 'Active' && (
                                                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} onClick={() => handleUpdateSemesterStatus(sem.id, { state: 'Ended' })}>Force End</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {semesters.length === 0 && (
                                    <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No semesters found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {isSemesterModalOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                                <button onClick={() => setIsSemesterModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                    <X size={20} />
                                </button>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Create Semester</h2>
                                <form onSubmit={handleCreateSemester} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Semester Name</label>
                                        <input required type="text" value={newSemester.name} onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} placeholder="e.g. Semester 2" />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Branch</label>
                                            <input required type="text" value={newSemester.branch} onChange={(e) => setNewSemester({ ...newSemester, branch: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Batch</label>
                                            <input required type="text" value={newSemester.batch} onChange={(e) => setNewSemester({ ...newSemester, batch: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Start Date <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>(Optional)</span></label>
                                            <input type="date" value={newSemester.start_date} onChange={(e) => setNewSemester({ ...newSemester, start_date: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>End Date <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>(Optional)</span></label>
                                            <input type="date" value={newSemester.end_date} onChange={(e) => setNewSemester({ ...newSemester, end_date: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Create Semester</button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AdminDashboard;
