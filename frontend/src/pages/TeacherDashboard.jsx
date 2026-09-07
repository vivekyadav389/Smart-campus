import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Filter, CheckCircle, XCircle, Search, Download, Clock, CalendarDays, Calendar as CalendarIcon, Edit3, Trash2, X } from 'lucide-react';
import { API_BASE_URL, getTodayAttendance, getAttendanceByDate, getAttendanceRange, getCalendarEvents, saveCalendarEvent, deleteCalendarEvent, markManualAttendance, createSemester, updateSemester, getSemesters, updateSemesterStatus, getSemesterHistory } from '../utils/mockDb';

const getLocalYMD = (dateObj = new Date()) => {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const isDateWeekend = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-');
    const day = new Date(y, parseInt(m, 10) - 1, parseInt(d, 10)).getDay();
    return day === 0 || day === 6;
};

const getDaysInRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
        dates.push(getLocalYMD(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const TeacherDashboard = () => {
    const { user } = useAuth();

    const [filterBranch, setFilterBranch] = useState('All');
    const [filterBatch, setFilterBatch] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic Student Data from Express API
    const [students, setStudents] = useState([]);
    const [baseStudents, setBaseStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // History State
    const [historyDate, setHistoryDate] = useState(getLocalYMD());
    const [historyStudents, setHistoryStudents] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyRefreshCounter, setHistoryRefreshCounter] = useState(0);

    // Tab State
    const [activeTab, setActiveTab] = useState('attendance');
    const [selectedDetailedStudent, setSelectedDetailedStudent] = useState(null);
    const [myStudentsBatch, setMyStudentsBatch] = useState('All');

    // Calendar States
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [eventForm, setEventForm] = useState({ type: 'Class', reason: '', batch: 'All' });
    const [calendarFilterBatch, setCalendarFilterBatch] = useState('All');

    // Manual Attendance States
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ studentId: '', date: getLocalYMD(), status: 'Present' });
    const [manualSearchQuery, setManualSearchQuery] = useState('');

    // Semester States
    const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
    const [activeSemesters, setActiveSemesters] = useState([]);
    const [isEditingSemester, setIsEditingSemester] = useState(false);
    const [semesterForm, setSemesterForm] = useState({ id: null, batch: '', name: '', startDate: '', endDate: '' });
    const [semestersHistory, setSemestersHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Export Modal States
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportBatch, setExportBatch] = useState('All');
    const [exportSemesterId, setExportSemesterId] = useState('');
    const [availableExportSemesters, setAvailableExportSemesters] = useState([]);
    const [exportRange, setExportRange] = useState({
        start: getLocalYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        end: getLocalYMD()
    });
    const [isExporting, setIsExporting] = useState(false);

    // Activity Log States
    const [detailedLogs, setDetailedLogs] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getLocalYMD());
    const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch all users based on branch restriction
                if (!user?.id) return;
                const res = await fetch(API_BASE_URL + `/api/users?requesterId=${user.id}`);
                const { users } = await res.json();

                // Fetch today's attendance for everyone
                const [todayLogs, events] = await Promise.all([
                    getTodayAttendance(),
                    getCalendarEvents('Verified')
                ]);

                // Map users to their matching log
                const studentUsers = users.filter(u => u.role === 'student');
                setBaseStudents(studentUsers);

                const isWeekend = isDateWeekend(getLocalYMD());
                const todayStr = getLocalYMD();

                const mappedStudents = studentUsers.map(student => {
                    const log = todayLogs.find(l => l.studentId === student.id);
                    const eventForToday = events.find(e => e.date.startsWith(todayStr) && (e.branch === 'All' || e.branch === student.branch) && (e.batch === 'All' || e.batch === student.batch));
                    
                    const isHoliday = eventForToday && eventForToday.type === 'Holiday';
                    const hasClass = eventForToday && (eventForToday.type === 'Class' || eventForToday.type === 'Extra Class');
                    
                    let status = 'Absent';
                    if (isHoliday) status = 'Holiday';
                    else if (isWeekend && !hasClass) status = 'Weekend';
                    else if (!isWeekend && !hasClass) status = 'Closed';
                    
                    if (log && log.status) status = log.status;

                    return {
                        ...student,
                        status: status,
                        timeIn: log?.timeIn ? log.timeIn : '-',
                        timeOut: log?.timeOut ? log.timeOut : '-'
                    };
                });

                setStudents(mappedStudents);
            } catch (err) {
                console.error("Failed to load teacher dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
        fetchCalendar();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!baseStudents || baseStudents.length === 0) return;
            setIsHistoryLoading(true);
            try {
                const [logs, events] = await Promise.all([
                    getAttendanceByDate(historyDate),
                    getCalendarEvents('Verified')
                ]);
                const isWeekend = isDateWeekend(historyDate);

                const mapped = baseStudents.map(student => {
                    const log = logs.find(l => l.studentId === student.id);
                    
                    const eventForDay = events.find(e => e.date.startsWith(historyDate) && (e.branch === 'All' || e.branch === student.branch) && (e.batch === 'All' || e.batch === student.batch));
                    const isHoliday = eventForDay && eventForDay.type === 'Holiday';
                    const hasClass = eventForDay && (eventForDay.type === 'Class' || eventForDay.type === 'Extra Class');
                    
                    let status = 'Absent';
                    if (isHoliday) status = 'Holiday';
                    else if (isWeekend && !hasClass) status = 'Weekend';
                    else if (!isWeekend && !hasClass) status = 'Closed';
                    
                    if (log && log.status) status = log.status;

                    return {
                        ...student,
                        status: status,
                        timeIn: log?.timeIn ? log.timeIn : '-',
                        timeOut: log?.timeOut ? log.timeOut : '-'
                    };
                });
                setHistoryStudents(mapped);
            } catch (err) {
                console.error("Failed to load history:", err);
            } finally {
                setIsHistoryLoading(false);
            }
        };

        // Fetch history when tab is history, or when date/baseStudents change and we are in history
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [historyDate, baseStudents, activeTab, historyRefreshCounter]);

    const fetchCalendar = async () => {
        const events = await getCalendarEvents();
        setCalendarEvents(events);
    };

    const fetchDetailedLogs = useCallback(async () => {
        try {
            if (!user?.id) return;
            const res = await fetch(`${API_BASE_URL}/api/attendance/detailed-logs?date=${selectedDate}&requesterId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setDetailedLogs(data.logs);
            }
        } catch (err) {
            console.error("Fetch detailed logs error:", err);
        }
    }, [selectedDate, user.id]);

    useEffect(() => {
        if (activeTab === 'activityLog') {
            fetchDetailedLogs();
        }
    }, [activeTab, fetchDetailedLogs]);

    const calculateWeekends = (startDate, endDate) => {
        let count = 0;
        let current = new Date(startDate);
        let end = new Date(endDate);
        while (current <= end) {
            if (current.getDay() === 0 || current.getDay() === 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const loadActiveSemesters = async () => {
        const data = await getSemesters(user.branch, null, null, 'Active');
        setActiveSemesters(data);
    };

    useEffect(() => {
        if (isSemesterModalOpen) {
            loadActiveSemesters();
            setIsEditingSemester(false);
        }
    }, [isSemesterModalOpen]);

    const loadSemesterHistory = async () => {
        setIsLoadingHistory(true);
        const data = await getSemesterHistory(user.branch, 'All'); // Teacher can fetch all completed semesters for their branch
        setSemestersHistory(data);
        setIsLoadingHistory(false);
    };
    const handleCreateSemester = async (e) => {
        e.preventDefault();
        let success = false;
        if (semesterForm.id) {
            success = await updateSemester(semesterForm.id, { name: semesterForm.name, start_date: semesterForm.startDate, end_date: semesterForm.endDate, batch: semesterForm.batch });
        } else {
            success = await createSemester({
                branch: user.branch,
                batch: semesterForm.batch,
                name: semesterForm.name,
                startDate: semesterForm.startDate,
                endDate: semesterForm.endDate
            });
        }
        if (success) {
            alert('Semester created/updated successfully!');
            setIsSemesterModalOpen(false);
            setSemesterForm({ id: null, batch: '', name: '', startDate: '', endDate: '' });
            loadSemesterHistory();
            loadActiveSemesters();
            setIsEditingSemester(false);
        } else {
            alert('Failed to create semester');
        }
    };
    const handleManualApprove = async (studentId) => {
        if (window.confirm("Approve attendance for this student manually?")) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/attendance/manual-mark`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date: selectedDate, status: 'Present' })
                });
                const data = await res.json();
                if (data.success) {
                    fetchDetailedLogs();
                    alert("Attendance approved manually.");
                } else {
                    alert("Failed to approve: " + data.error);
                }
            } catch (err) {
                alert("Failed to approve attendance.");
            }
        }
    };

    const handleManualReject = async (studentId) => {
        if (window.confirm("Reject attendance for this student manually?")) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/attendance/manual-mark`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, date: selectedDate, status: 'Absent' })
                });
                const data = await res.json();
                if (data.success) {
                    fetchDetailedLogs();
                    alert("Attendance rejected manually.");
                } else {
                    alert("Failed to reject: " + data.error);
                }
            } catch (err) {
                alert("Failed to reject attendance.");
            }
        }
    };

    const handleRunValidation = async (studentId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/validate`, {
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
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Teacher Dashboard...</div>;
    }

    // Derived Statistics
    const currentViewStudents = activeTab === 'history' ? historyStudents : students;
    const totalStudents = currentViewStudents.length;
    const presentCount = currentViewStudents.filter(s => s.status === 'Present').length;
    const leftCampusCount = currentViewStudents.filter(s => s.status === 'Left Campus').length;

    // Anyone not Present and not explicitly Left Campus is considered Absent (which includes Outside Hours or true Absent)
    const isWeekendToday = activeTab === 'history'
        ? isDateWeekend(historyDate)
        : isDateWeekend(getLocalYMD());
    const absentCount = isWeekendToday ? 0 : (totalStudents - presentCount - leftCampusCount);

    // Dynamic Filter Options
    const uniqueBranches = ['All', ...new Set(currentViewStudents.map(s => s.branch).filter(Boolean))];
    const uniqueBatches = ['All', ...new Set(currentViewStudents.map(s => s.batch).filter(Boolean))];

    // Filtering Logic
    const filteredStudents = currentViewStudents.filter(student => {
        const matchBranch = filterBranch === 'All' || student.branch === filterBranch;
        const matchBatch = filterBatch === 'All' || student.batch === filterBatch;
        const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
        return matchBranch && matchBatch && matchSearch;
    });

    
    const handleRangeExport = async () => {
        setIsExporting(true);
        try {
            const selectedSem = availableExportSemesters.find(s => s.id.toString() === exportSemesterId);
            if (!selectedSem) {
                alert('Please select a valid semester');
                setIsExporting(false);
                return;
            }
            
            const startDate = selectedSem.start_date.split('T')[0];
            const endDate = selectedSem.end_date ? selectedSem.end_date.split('T')[0] : new Date().toISOString().split('T')[0];
            
            const allDays = getDaysInRange(startDate, endDate);
            const rangeLogs = await getAttendanceRange(startDate, endDate);
            const rangeEvents = await getCalendarEvents('Verified', exportBatch, user.branch);
            
            // Generate CSV exactly like before but bound to semester dates
            const exportStudents = exportBatch === 'All'
                ? baseStudents
                : baseStudents.filter(s => s.batch === exportBatch);

            const rows = exportStudents.map(student => {
                const row = { Name: student.name, 'Roll No': student.rollNo, Batch: student.batch };
                
                let presentCount = 0;
                let absentCount = 0;
                let leaveCount = 0;
                let totalClassesCount = 0;

                allDays.forEach(day => {
                    const isWeekend = new Date(day).getDay() === 0 || new Date(day).getDay() === 6;
                    
                    const holidayEvent = rangeEvents.find(e => {
                        if (e.type !== 'Holiday') return false;
                        if (e.batch && e.batch !== 'All' && e.batch !== exportBatch) return false;
                        return e.date.startsWith(day);
                    });

                    const classEvent = rangeEvents.find(e => {
                        if (e.type !== 'Class') return false;
                        if (e.batch && e.batch !== 'All' && e.batch !== exportBatch) return false;
                        return e.date.startsWith(day);
                    });
                    
                    const isHoliday = !!holidayEvent;
                    const isExtraClass = !!classEvent;
                    
                    const isClassDay = (isExtraClass) || (!isWeekend && !isHoliday);

                    const log = rangeLogs.find(l => l.studentId === student.id && l.date.startsWith(day));
                    if (log) {
                        row[day] = log.status;
                        if (isClassDay) {
                            if (log.status === 'Present') presentCount++;
                            else if (log.status === 'Absent') absentCount++;
                            else if (log.status === 'Leave') leaveCount++;
                        }
                    } else {
                        if (isClassDay && new Date(day) <= new Date()) {
                            row[day] = 'Absent (No Record)';
                            absentCount++;
                        } else {
                            row[day] = isHoliday ? 'Holiday' : (isWeekend ? 'Weekend' : '-');
                        }
                    }
                    if (isClassDay && new Date(day) <= new Date()) totalClassesCount++;
                });

                row['Total Classes'] = totalClassesCount;
                row['Present'] = presentCount;
                row['Absent'] = absentCount;
                row['Leave'] = leaveCount;
                row['Attendance %'] = totalClassesCount > 0 ? Math.round((presentCount / totalClassesCount) * 100) + '%' : '0%';

                return row;
            });

            if (rows.length === 0) {
                alert("No data found for this batch/semester.");
                setIsExporting(false);
                return;
            }

            const headers = Object.keys(rows[0]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `attendance_report_batch_${exportBatch}_sem_${selectedSem.name.replace(' ', '_')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExportModalOpen(false);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };


    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const getEventsForDate = (dateLocalStr) => calendarEvents.filter(e => {
        const d = new Date(e.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dbDate = `${year}-${month}-${day}`;
        const matchBatch = calendarFilterBatch === 'All' || e.batch === 'All' || e.batch === calendarFilterBatch;
        return dbDate === dateLocalStr && matchBatch;
    });

    const getEventForDate = (dateLocalStr) => getEventsForDate(dateLocalStr)[0];

    const handleDayClick = (e, day) => {
        e.preventDefault();
        e.stopPropagation();

        const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        setSelectedDates(prev => {
            if (prev.includes(localDateStr)) {
                return prev.filter(d => d !== localDateStr);
            } else {
                return [...prev, localDateStr];
            }
        });
    };

    const openScheduleModal = () => {
        if (selectedDates.length === 0) return;

        if (selectedDates.length === 1) {
            const existingEvent = getEventForDate(selectedDates[0]);
            if (existingEvent) {
                setEventForm({ type: existingEvent.type, reason: existingEvent.reason || '', batch: existingEvent.batch || calendarFilterBatch });
            } else {
                setEventForm({ type: 'Class', reason: '', batch: calendarFilterBatch });
            }
        } else {
            setEventForm({ type: 'Class', reason: '', batch: calendarFilterBatch });
        }
        setIsEventModalOpen(true);
    };

    const handleOpenManualEntry = () => {
        setManualForm({
            studentId: '',
            date: activeTab === 'history' ? historyDate : getLocalYMD(),
            status: 'Present'
        });
        setIsManualModalOpen(true);
        setManualSearchQuery('');
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (selectedDates.length === 0) return;

        const eventsPayload = selectedDates.map(dateStr => ({
            date: dateStr,
            type: eventForm.type,
            reason: eventForm.reason,
            teacherId: user.id,
            batch: eventForm.batch,
            branch: user.branch || 'All'
        }));

        const result = await saveCalendarEvent(eventsPayload);

        if (result?.success) {
            setIsEventModalOpen(false);
            setSelectedDates([]);
            fetchCalendar();
        } else {
            alert(`Failed to save calendar event(s): ${result?.error || 'Unknown error'}`);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (window.confirm("Delete this calendar event?")) {
            const success = await deleteCalendarEvent(eventId);
            if (success) {
                setIsEventModalOpen(false);
                fetchCalendar();
            } else {
                alert("Failed to delete event.");
            }
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        const submittedDate = manualForm.date;
        if (!manualForm.studentId) {
            alert("Please select a student.");
            return;
        }

        const success = await markManualAttendance(manualForm.studentId, submittedDate, manualForm.status);
        if (success) {
            setIsManualModalOpen(false);
            setManualForm({ studentId: '', date: getLocalYMD(), status: 'Present' });
            setManualSearchQuery('');
            // Only need to refresh if the date is today
            if (submittedDate === getLocalYMD()) {
                fetchDashboardData();
            } else {
                alert("Manual attendance recorded successfully for past date.");
                // If currently on history tab and the date matches the manual date, force re-fetch
                if (activeTab === 'history' && historyDate === submittedDate) {
                    setHistoryRefreshCounter(prev => prev + 1);
                }
            }
        } else {
            alert("Failed to mark manual attendance.");
        }
    };

    const manualFilteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(manualSearchQuery.toLowerCase())
    );

    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Teacher Dashboard</h1>
                    <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>Department of {user?.department || 'Engineering'}</p>
                </div>

                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={handleOpenManualEntry} style={{ backgroundColor: 'white', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                        <Edit3 size={16} /> Manual Entry
                    </button>
                    <button className="btn btn-primary" onClick={() => setActiveTab('history')} style={{ backgroundColor: 'white', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                        <Clock size={16} /> History
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsExportModalOpen(true)}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Global Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '0.5rem' }}>
                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--color-primary)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>Total Students</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalStudents}</div>
                </div>
                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--color-success)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>Present Today</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{presentCount}</div>
                </div>
                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--color-warning)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>Left Campus</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{leftCampusCount}</div>
                </div>
                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--color-danger)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>Absent</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>{absentCount}</div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem', gap: '2rem' }}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    style={{
                        padding: '1rem 0',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'attendance' ? 600 : 500,
                        color: activeTab === 'attendance' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'attendance' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Live Attendance
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    style={{
                        padding: '1rem 0',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'calendar' ? 600 : 500,
                        color: activeTab === 'calendar' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'calendar' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Calendar Management
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '1rem 0',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'history' ? 600 : 500,
                        color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    History
                </button>
                <button
                    onClick={() => setActiveTab('activityLog')}
                    style={{
                        padding: '1rem 0',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'activityLog' ? 600 : 500,
                        color: activeTab === 'activityLog' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'activityLog' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Activity Log
                </button>
                <button
                    onClick={() => { setActiveTab('semesterHistory'); loadSemesterHistory(); }}
                    style={{
                        padding: '1rem 0',
                        fontSize: '1rem',
                        fontWeight: activeTab === 'semesterHistory' ? 600 : 500,
                        color: activeTab === 'semesterHistory' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'semesterHistory' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Semester History
                </button>
            </div>

            {(activeTab === 'attendance' || activeTab === 'history') && (
                <div className="animate-fade-in grid gap-4">
                    {activeTab === 'history' && (
                        <div className="card" style={{ marginBottom: '-1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>Select History Date:</span>
                            <input
                                type="date"
                                value={historyDate}
                                onChange={e => setHistoryDate(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none' }}
                                max={getLocalYMD()}
                            />
                            {isHistoryLoading && <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Loading logs...</span>}
                        </div>
                    )}

            {activeTab === 'myStudents' && (
                <div className="card animate-fade-in" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Student Directory</h2>
                        <select 
                            className="input" 
                            style={{ width: 'auto' }}
                            value={myStudentsBatch}
                            onChange={e => setMyStudentsBatch(e.target.value)}
                        >
                            <option value="All">All Batches</option>
                            {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                <option key={batch} value={batch}>Batch {batch}</option>
                            ))}
                        </select>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Roll No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Name</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Batch</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mobile</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseStudents.filter(s => myStudentsBatch === 'All' || s.batch === myStudentsBatch).map(student => (
                                <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{student.rollNo}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                                                {student.name.charAt(0)}
                                            </div>
                                            {student.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{student.batch}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{student.email}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{student.mobile || 'N/A'}</td>
                                </tr>
                            ))}
                            {baseStudents.filter(s => myStudentsBatch === 'All' || s.batch === myStudentsBatch).length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No students found in this batch.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

                    {/* Roster & Filters */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Filter Toolbar */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                    <Filter size={18} className="text-gray-500" />
                                    <select
                                        value={filterBranch}
                                        onChange={(e) => setFilterBranch(e.target.value)}
                                        style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontWeight: 500, color: 'var(--color-text-primary)' }}
                                    >
                                        {uniqueBranches.map(branch => (
                                            <option key={branch} value={branch}>{branch === 'All' ? 'All Branches' : branch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                    <Filter size={18} className="text-gray-500" />
                                    <select
                                        value={filterBatch}
                                        onChange={(e) => setFilterBatch(e.target.value)}
                                        style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontWeight: 500, color: 'var(--color-text-primary)' }}
                                    >
                                        {uniqueBatches.map(batch => (
                                            <option key={batch} value={batch}>{batch === 'All' ? 'All Batches' : `Batch ${batch}`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', minWidth: '250px' }}>
                                <Search size={18} className="text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search student or roll no..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ border: 'none', outline: 'none', width: '100%' }}
                                />
                            </div>

                        </div>

                        {/* Student Grid */}
                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <div 
                                        key={student.id} 
                                        onClick={() => setSelectedDetailedStudent(student)}
                                        style={{
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '1rem',
                                            padding: '1.5rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            backgroundColor: 'white',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        className="hover:-translate-y-1 hover:shadow-md"
                                    >
                                        {/* Avatar */}
                                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                            <div style={{
                                                width: '48px', height: '48px',
                                                borderRadius: '50%',
                                                backgroundColor: '#e2e8f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 600, color: 'var(--color-text-secondary)',
                                                fontSize: '1.25rem'
                                            }}>
                                                {student.name && student.name.length > 0 ? student.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            {/* Status Indicator Dot */}
                                            <div style={{
                                                position: 'absolute', bottom: 0, right: 0,
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                backgroundColor: student.status === 'Present' ? 'var(--color-success)' : (student.status === 'Left Campus' ? 'var(--color-warning)' : (student.status === 'Weekend' ? '#9ca3af' : 'var(--color-danger)')),
                                                border: '2px solid white'
                                            }}></div>
                                        </div>

                                        {/* Details */}
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                            <h4 style={{ fontWeight: 600, fontSize: '1.125rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>{student.name}</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>{student.rollNo} • {student.batch}</p>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', marginTop: 'auto' }}>
                                                <span className={`badge ${student.status === 'Present' ? 'badge-success' : (student.status === 'Left Campus' ? 'badge-warning' : (student.status === 'Weekend' ? '' : 'badge-danger'))}`} style={student.status === 'Weekend' ? { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', fontSize: '0.75rem', padding: '0.25rem 0.75rem' } : { fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                                                    {student.status === 'Weekend' ? 'Weekend - Closed' : student.status}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: student.status === 'Present' ? 'var(--color-success)' : student.status === 'Left Campus' ? 'var(--color-warning)' : (student.status === 'Weekend' ? '#6b7280' : 'var(--color-danger)') }}>
                                                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {student.status}
                                                    </div>
                                                    {(() => {
                                                        const noExit = student.timeOut === '-' || student.timeOut === '--:--' || !student.timeOut;
                                                        const hasEntry = student.timeIn !== '-' && student.timeIn !== '--:--' && !!student.timeIn;
                                                        const isToday = selectedDate === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

                                                        // Fallback logic, since teachers do not have access to admin timing controls
                                                        const isPastEndTime = new Date().getHours() >= 17;

                                                        let exitLabel = student.timeOut;
                                                        if (student.status === 'Present' && noExit && isToday && !isPastEndTime) {
                                                            exitLabel = 'Inside';
                                                        } else if (hasEntry && noExit) {
                                                            exitLabel = 'Not Captured';
                                                        }

                                                        return (
                                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                    <CheckCircle size={10} className="text-success" /> In: <span style={{ fontWeight: 500 }}>{student.timeIn}</span>
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                    <XCircle size={10} className="text-danger" /> Out: <span style={{ fontWeight: 500 }}>{exitLabel}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                    <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                                        <Search size={32} />
                                    </div>
                                    <h3>No students found matching your filters.</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'semesterHistory' && (
                <div className="animate-fade-in card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Semester History</h3>
                    {isLoadingHistory ? (
                        <p>Loading history...</p>
                    ) : semestersHistory.length === 0 ? (
                        <p>No completed semesters found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Name</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semestersHistory.map(sem => (
                                        <tr key={sem.id}>
                                            <td>{sem.batch}</td>
                                            <td>{sem.name || `Semester ${sem.start_date?.substring(0,4) || ''}`}</td>
                                            <td>{new Date(sem.start_date || sem.startdate).toLocaleDateString()}</td>
                                            <td>{sem.end_date ? new Date(sem.end_date || sem.enddate).toLocaleDateString() : '-'}</td>
                                            <td><span className={`status-badge ${sem.state === 'Active' ? 'status-present' : 'status-absent'}`}>{sem.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="animate-fade-in card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarDays className="text-primary" /> Month Schedule
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select
                                className="input"
                                style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
                                value={calendarFilterBatch}
                                onChange={(e) => setCalendarFilterBatch(e.target.value)}
                            >
                                {uniqueBatches.map(batch => (
                                    <option key={`cal-${batch}`} value={batch}>{batch === 'All' ? 'All Batches' : `Batch ${batch}`}</option>
                                ))}
                            </select>
                            <button className="btn btn-primary" onClick={() => setIsSemesterModalOpen(true)}>Manage Semesters</button>
                            <button className="btn btn-outline" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&lt; Prev</button>
                            <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{monthName} {year}</span>
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
                                const evts = getEventsForDate(localDateStr);
                                const evt = evts[0];

                                let bgClass = 'bg-white';
                                let borderClass = 'border-gray-200';

                                if (evt) {
                                    if (evt.type === 'Holiday') {
                                        bgClass = evt.status === 'Verified' ? 'bg-green-50' : 'bg-yellow-50';
                                        borderClass = evt.status === 'Verified' ? 'border-green-200' : 'border-yellow-200';
                                    } else {
                                        bgClass = evt.status === 'Verified' ? 'bg-blue-50' : 'bg-gray-100';
                                        borderClass = evt.status === 'Verified' ? 'border-blue-200' : 'border-gray-300';
                                    }
                                }

                                const isSelected = selectedDates.includes(localDateStr);

                                return (
                                    <div
                                        key={day}
                                        onClick={(e) => handleDayClick(e, day)}
                                        className={`cursor-pointer hover:shadow-md transition-shadow relative ${bgClass}`}
                                        style={{
                                            padding: '0.35rem',
                                            minHeight: '100px',
                                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            backgroundColor: isSelected ? 'var(--color-primary-bg)' : undefined,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <span style={{ fontWeight: isSelected ? 700 : 500, alignSelf: 'flex-end', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{day}</span>
                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '70px', overflowY: 'auto' }}>
                                            {evts.map((ev, idx) => (
                                                <div key={idx} style={{ padding: '0.15rem 0.25rem', borderRadius: '0.25rem', backgroundColor: ev.type === 'Holiday' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', fontSize: '0.65rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                        <span style={{ color: ev.type === 'Holiday' ? 'var(--color-danger)' : 'var(--color-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.type}</span>
                                                        <span style={{ color: '#64748b', fontSize: '0.55rem' }}>{ev.batch}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Bulk Action Footer */}
                    {selectedDates.length > 0 && (
                        <div className="animate-fade-in" style={{
                            marginTop: '1.5rem',
                            padding: '1.25rem',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.875rem'
                                }}>
                                    {selectedDates.length}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Days Selected</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setSelectedDates([])}
                                    className="btn"
                                    style={{
                                        backgroundColor: 'white',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)',
                                        padding: '0.5rem 1rem'
                                    }}
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={openScheduleModal}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1.25rem' }}
                                >
                                    Schedule Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Calendar Event Modal */}
                    {isEventModalOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div className="modal-content" style={{ maxWidth: '450px', width: '90%', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Schedule {selectedDates.length} Days</h3>
                                    <button onClick={() => setIsEventModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Day Type</label>
                                        <select
                                            value={eventForm.type}
                                            onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                                            className="search-input"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                        >
                                            <option value="Class">Extra Class</option>
                                            <option value="Holiday">Holiday</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Batch</label>
                                        <select
                                            value={eventForm.batch}
                                            onChange={(e) => setEventForm({ ...eventForm, batch: e.target.value })}
                                            className="search-input"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                        >
                                            <option value="All">All Batches</option>
                                            {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                                <option key={batch} value={batch}>Batch {batch}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Reason / Notes</label>
                                        <textarea
                                            value={eventForm.reason}
                                            onChange={(e) => setEventForm({ ...eventForm, reason: e.target.value })}
                                            placeholder="E.g. Practical Exam, National Holiday..."
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--color-border)',
                                                minHeight: '100px',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => setIsEventModalOpen(false)}
                                            style={{ backgroundColor: '#f1f5f9', color: 'var(--color-text-primary)' }}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                            Save Request
                                        </button>
                                    </div>
                                </form>

                                {selectedDates.length === 1 && (() => {
                                    const evt = getEventForDate(selectedDates[0]);
                                    return evt && (
                                        <button
                                            onClick={() => handleDeleteEvent(evt.id)}
                                            style={{ marginTop: '1rem', color: 'var(--color-danger)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
                                        >
                                            Delete Existing Event
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
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
                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none' }}
                                />
                                <button className="btn btn-primary" onClick={fetchDetailedLogs}>Refresh</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Student</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Batch/Roll</th>
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
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{log.branch}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div>Batch {log.batch}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{log.rollNo}</div>
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
                                                            onClick={() => handleRunValidation(log.id)}
                                                        >
                                                            Validate
                                                        </button>
                                                        {(!log.validationReason || !log.validationReason.startsWith('Manually')) && log.status !== 'Present' && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--color-success)' }}
                                                                onClick={() => handleManualApprove(log.id)}
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                        {(!log.validationReason || !log.validationReason.startsWith('Manually')) && log.status !== 'Absent' && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--color-danger)', border: 'none' }}
                                                                onClick={() => handleManualReject(log.id)}
                                                            >
                                                                Reject
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

                    {/* Movement Timeline Modal */}
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
            {/* Manual Attendance Modal */}
            {isManualModalOpen && (
                // ... (Manual modal content)
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Mark Manual Attendance</h3>
                            <button onClick={() => setIsManualModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Date</label>
                                <input
                                    type="date"
                                    value={manualForm.date}
                                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                    max={getLocalYMD()}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Search Student</label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Type name or roll no to search..."
                                        value={manualSearchQuery}
                                        onChange={(e) => {
                                            setManualSearchQuery(e.target.value);
                                            setManualForm({ ...manualForm, studentId: '' }); // Reset selection on new search
                                        }}
                                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                                <div style={{ marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '0.5rem', backgroundColor: '#f8fafc' }}>
                                    {manualFilteredStudents.slice(0, 5).map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => {
                                                setManualForm({ ...manualForm, studentId: student.id });
                                                setManualSearchQuery(student.name);
                                            }}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                cursor: 'pointer',
                                                backgroundColor: manualForm.studentId === student.id ? 'var(--color-primary-bg)' : 'white',
                                                borderBottom: '1px solid var(--color-border)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <span style={{ fontWeight: manualForm.studentId === student.id ? 600 : 500, color: manualForm.studentId === student.id ? 'var(--color-primary)' : 'inherit' }}>{student.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{student.rollNo}</span>
                                        </div>
                                    ))}
                                    {manualFilteredStudents.length === 0 && (
                                        <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No student found</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Status</label>
                                <select
                                    value={manualForm.status}
                                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                >
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Left Campus">Left Campus (Penalty)</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setIsManualModalOpen(false);
                                        setManualSearchQuery('');
                                        setManualForm({ studentId: '', date: getLocalYMD(), status: 'Present' });
                                    }}
                                    style={{ backgroundColor: '#f1f5f9', color: 'var(--color-text-primary)' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!manualForm.studentId}>
                                    Confirm Mark
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Export Range Modal */}
            {isExportModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Export Attendance Report</h3>
                            <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Calculation Logic:</p>
                            <p>Percentage is based on <strong>Working Days</strong> only (Weekends and Verified Holidays are excluded).</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>From Date</label>
                                    <input
                                        type="date"
                                        value={exportRange.start}
                                        onChange={(e) => setExportRange({ ...exportRange, start: e.target.value })}
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                        max={exportRange.end}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>To Date</label>
                                    <input
                                        type="date"
                                        value={exportRange.end}
                                        onChange={(e) => setExportRange({ ...exportRange, end: e.target.value })}
                                        className="search-input"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                        min={exportRange.start}
                                        max={getLocalYMD()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Select Batch</label>
                                <select
                                    value={exportBatch}
                                    onChange={(e) => setExportBatch(e.target.value)}
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                >
                                    <option value="All">All Batches</option>
                                    {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                        <option key={batch} value={batch}>Batch {batch}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => setIsExportModalOpen(false)}
                                    style={{ backgroundColor: '#f1f5f9', color: 'var(--color-text-primary)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRangeExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? "Processing..." : "Download CSV"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isSemesterModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setIsSemesterModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            <X size={20} />
                        </button>
                        
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {isEditingSemester ? 'Edit Semester' : 'Active Semesters'}
                            {!isEditingSemester && <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setIsEditingSemester(true)}>+ New</button>}
                        </h2>
                        <div className="modal-body">
                            {isEditingSemester ? (
                                <form onSubmit={handleCreateSemester}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Batch</label>
                                        <select
                                            className="input"
                                            value={semesterForm.batch}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, batch: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Batch</option>
                                            {uniqueBatches.filter(b => b !== 'All').map(batch => (
                                                <option key={batch} value={batch}>Batch {batch}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Semester Name (Optional)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={semesterForm.name}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                                            placeholder="e.g. Semester 2"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Semester Start Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={semesterForm.startDate}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Semester End Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={semesterForm.endDate}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                                            required
                                        />
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Setting this will mark any previous active semester for this batch as Completed.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIsEditingSemester(false); setSemesterForm({ id: null, batch: '', name: '', startDate: '', endDate: '' }); }}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                                    </div>
                                </form>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {activeSemesters.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active semesters found.</p>
                                    ) : (
                                        activeSemesters.map(sem => {
                                            const st = sem.start_date.split('T')[0];
                                            const en = sem.end_date.split('T')[0];
                                            const weekends = calculateWeekends(st, en);
                                            const holidays = parseInt(sem.holidays_count) || 0;
                                            const extraClasses = parseInt(sem.extra_classes_count) || 0;
                                            const totalDays = Math.round((new Date(en) - new Date(st)) / (1000 * 60 * 60 * 24)) + 1;
                                            const classes = totalDays - weekends - holidays + extraClasses;

                                            return (
                                                <div key={sem.id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                        <div>
                                                            <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>Batch {sem.batch} - {sem.name || 'Unnamed'}</h4>
                                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{st} to {en}</p>
                                                        </div>
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                            onClick={() => {
                                                                setSemesterForm({ id: sem.id, batch: sem.batch, name: sem.name || '', startDate: st, endDate: en });
                                                                setIsEditingSemester(true);
                                                            }}
                                                        >
                                                            <Edit3 size={14} style={{ marginRight: '0.25rem' }} /> Edit
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.25rem' }}>
                                                        <div><strong>Total Days:</strong> {totalDays}</div>
                                                        <div><strong>Classes:</strong> <span style={{ color: 'var(--color-success)' }}>{classes}</span></div>
                                                        <div><strong>Weekends:</strong> {weekends}</div>
                                                        <div><strong>Holidays:</strong> {holidays}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        
            {/* Detailed Student Modal */}
            <StudentDetailsModal 
                student={selectedDetailedStudent} 
                onClose={() => setSelectedDetailedStudent(null)} 
            />

</div>

    );
};

export default TeacherDashboard;
