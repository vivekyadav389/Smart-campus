import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, MapPin, Clock, Calendar, CheckCircle, XCircle, ChevronRight, LogOut, Navigation, CalendarDays, Coffee } from 'lucide-react';
import { getCollegeTiming, getGeofence, markAttendance, getAttendanceLogs, getCalendarEvents } from '../utils/mockDb';
import { MapContainer, TileLayer, Polygon, Popup, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Note: Global Leaflet icon fix is handled in App.jsx

// Custom icon for the student's live location
const StudentLocationIcon = new L.DivIcon({
    className: 'custom-student-marker',
    html: `<div style="width: 16px; height: 16px; background-color: var(--color-primary); border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const MapCenterer = ({ center, isManual }) => {
    const map = useMap();
    const lastPosRef = useRef(null);

    useEffect(() => {
        if (!center) return;

        const [lat, lng] = center;
        const currentZoom = map.getZoom();
        const targetZoom = isManual ? 18 : (currentZoom > 15 ? currentZoom : 18);

        // Only "fly" if it's a manual recenter, or if we haven't centered yet, 
        // or if the movement is significant (prevent jerky jitter)
        let shouldFly = isManual || !lastPosRef.current;

        if (lastPosRef.current) {
            const dist = map.distance(lastPosRef.current, L.latLng(lat, lng));
            if (dist > 20) shouldFly = true; // Fly if moved > 20 meters
        }

        if (shouldFly) {
            map.flyTo(center, targetZoom, { animate: true, duration: 1.5 });
            lastPosRef.current = L.latLng(lat, lng);
        }
    }, [center, map, isManual]);

    return null;
};

const StudentDashboard = () => {
    const { user } = useAuth();

    // Reinstated standard time parsing helper 
    const formatTimeDisplay = (timeString) => {
        if (!timeString || timeString === '--:--' || timeString === '-') return '--:--';
        try {
            const [hours, minutes] = timeString.split(':');
            if (hours === undefined || minutes === undefined) return timeString;
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return timeString;
        }
    };

    // Simulated Geo-fencing State
    const toISODate = (dateInput) => {
        if (!dateInput) return '';
        if (typeof dateInput === 'string' && dateInput.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput).split('T')[0];
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [isInsideCampus, setIsInsideCampus] = useState(false);
    const [isCheckingLocation, setIsCheckingLocation] = useState(true);
    const [liveStatus, setLiveStatus] = useState('Checking...');
    const [trackingFinished, setTrackingFinished] = useState(false);

    // Real Attendance Data synced from backend
    const [attendanceData, setAttendanceData] = useState({
        totalClasses: user?.totalClasses || 0,
        classesAttended: user?.classesAttended || 0,
        percentage: (user?.totalClasses && user.totalClasses > 0) ? Math.round(((user?.classesAttended || 0) / user.totalClasses) * 100) : 0,
        recentLogs: []
    });

    // Pagination & Filtering state
    const [visibleCount, setVisibleCount] = useState(7);
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    const [campusCenter, setCampusCenter] = useState([19.1334, 72.9133]);
    const [geofenceRadius, setGeofenceRadius] = useState(300);  // fallback for old circle format
    const [geofencePolygon, setGeofencePolygon] = useState([]); // new polygon format [[lat,lng],...]

    const [userLocation, setUserLocation] = useState([19.1334, 72.9133]);
    const [userAccuracy, setUserAccuracy] = useState(0);
    const [isManualRecenter, setIsManualRecenter] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [selectedSessions, setSelectedSessions] = useState([]);

    // Calendar & Tab State
    const [activeTab, setActiveTab] = useState('attendance');
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [timingConfig, setTimingConfig] = useState(null);

    // Tracking for entry/exit events to prevent duplicate API calls
    const lastInsideRef = useRef(null);

    // Fetch API proxy helper
    const markAttendance = async (userId, status, timeIn, timeOut, sessions = []) => {
        try {
            await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: userId, status, timeIn, timeOut, sessions })
            });
        } catch (e) {
            console.error(e);
        }
    };

    // Initial Load
    useEffect(() => {
        const initData = async () => {
            const geofence = await getGeofence();
            if (geofence) {
                if (geofence.polygon && geofence.polygon.length > 0) {
                    // New polygon format
                    setGeofencePolygon(geofence.polygon);
                    // Set campus center to centroid of polygon for map display
                    const avgLat = geofence.polygon.reduce((s, p) => s + p[0], 0) / geofence.polygon.length;
                    const avgLng = geofence.polygon.reduce((s, p) => s + p[1], 0) / geofence.polygon.length;
                    setCampusCenter([avgLat, avgLng]);
                } else {
                    // Old circle format fallback
                    setCampusCenter(geofence.center || [19.1334, 72.9133]);
                    setGeofenceRadius(geofence.radius || 300);
                }
            }
            if (user?.id) {
                const [logs, verifiedEvents, timing] = await Promise.all([
                    getAttendanceLogs(user.id),
                    getCalendarEvents('Verified'),
                    getCollegeTiming()
                ]);

                setCalendarEvents(verifiedEvents);
                setTimingConfig(timing);

                // Generate chronological logs for the last 30 days
                const formattedLogs = [];
                const nowLogDate = new Date();
                const pastDate = new Date();
                pastDate.setDate(nowLogDate.getDate() - 30); // Show last 30 days

                for (let d = new Date(nowLogDate); d >= pastDate; d.setDate(d.getDate() - 1)) {
                    const localISOTime = toISODate(d);
                    const existingLog = logs.find(l => {
                        if (!l.date) return false;
                        return toISODate(l.date) === localISOTime;
                    });
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    // Check if this date is a verified holiday
                    const holidayEvent = verifiedEvents.find(e => {
                        if (e.type !== 'Holiday') return false;
                        return toISODate(e.date) === localISOTime;
                    });

                    if (existingLog) {
                        formattedLogs.push({
                            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            inTime: existingLog.timeIn || '--:--',
                            outTime: existingLog.timeOut || '--:--',
                            status: holidayEvent ? 'Holiday' : (isWeekend ? 'Weekend' : existingLog.status),
                            sessions: existingLog.sessions ? (typeof existingLog.sessions === 'string' ? JSON.parse(existingLog.sessions) : existingLog.sessions) : []
                        });
                    } else if (holidayEvent) {
                        formattedLogs.push({
                            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            inTime: '--:--',
                            outTime: '--:--',
                            status: 'Holiday',
                            sessions: []
                        });
                    } else if (!isWeekend) {
                        const isToday = d.toDateString() === nowLogDate.toDateString();
                        const hasClassEventThisDay = verifiedEvents.some(e => e.type === 'Class' && toISODate(e.date) === localISOTime);

                        let displayStatus = 'Absent';

                        if (!hasClassEventThisDay) {
                            displayStatus = 'Closed';
                        } else if (isToday && timing) {
                            const currentTime = `${String(nowLogDate.getHours()).padStart(2, '0')}:${String(nowLogDate.getMinutes()).padStart(2, '0')}`;
                            if (currentTime < timing.startTime) {
                                displayStatus = 'Not Started';
                            }
                        }

                        formattedLogs.push({
                            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            inTime: '--:--',
                            outTime: '--:--',
                            status: displayStatus,
                            sessions: []
                        });
                    } else {
                        // It's a weekend and no log exists
                        formattedLogs.push({
                            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            inTime: '--:--',
                            outTime: '--:--',
                            status: 'Weekend',
                            sessions: []
                        });
                    }
                }
                // Check if there's a log for today
                const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                // Need to match against ISO format from backend or formatted date string
                const isoToday = new Date().toISOString().split('T')[0];
                const todayLog = logs.find(l => {
                    const lDateStr = new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return lDateStr === todayStr || l.date.includes(isoToday);
                });

                // Dynamic calculations from real logs AND calendar events
                const classEvents = verifiedEvents.filter(e => e.type === 'Class');
                const pastClassEvents = classEvents.filter(e => {
                    const d = new Date(e.date);
                    return d <= new Date() && d.getDay() !== 0 && d.getDay() !== 6;
                });

                // Only count 'Present' logs that do NOT fall on a weekend
                const trueClassesAttended = logs.filter(l => {
                    if (l.status !== 'Present') return false;
                    const d = new Date(l.date);
                    return d.getDay() !== 0 && d.getDay() !== 6;
                }).length;

                // Fallback: Count weekdays from first of month to today if calendar is empty
                let totalWeekdays = 0;
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                for (let d = startOfMonth; d <= now; d.setDate(d.getDate() + 1)) {
                    if (d.getDay() !== 0 && d.getDay() !== 6) totalWeekdays++;
                }

                // Total classes should be based on the calendar (up to today), or fallback to total weekdays
                const trueTotalClasses = pastClassEvents.length > 0 ? pastClassEvents.length : (totalWeekdays > 0 ? totalWeekdays : 1);
                const truePercentage = Math.round((trueClassesAttended / trueTotalClasses) * 100);

                setAttendanceData(prev => ({
                    ...prev,
                    recentLogs: formattedLogs,
                    totalClasses: trueTotalClasses,
                    classesAttended: trueClassesAttended,
                    percentage: truePercentage > 100 ? 100 : truePercentage
                }));
            }
        };
        initData();
    }, [user]);

    // Ray-casting point-in-polygon (for convex/concave polygons, lat/lng coords)
    const pointInPolygon = (lat, lng, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    };

    // Function to calculate distance between two coordinates in meters (fallback for old circle geofence)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (trackingFinished) {
            setIsCheckingLocation(false);
            return;
        }

        let watchId;

        const updateAttendanceState = async (latitude, longitude, accuracy = 0) => {
            // CRITICAL FIX: Prevent crashes during the unmount/auto-logout phase
            if (!user || !user.id) return;

            const currentLocation = [latitude, longitude];
            setUserLocation(currentLocation);
            setUserAccuracy(accuracy);

            // Determine inside status: use polygon if available, else fall back to circle radius
            let inside = false;

            // GPS Accuracy Buffer Logic:
            // High-precision GPS usually has accuracy < 10m.
            // If accuracy is poor (e.g. 50m), we add a buffer to help students who are truly inside
            // but have a "bouncing" blue dot. We cap this at 15m to prevent abuse.
            const accuracyBuffer = Math.min(accuracy / 2, 20);
            const totalBuffer = 15 + accuracyBuffer; // 15m base + dynamic accuracy buffer (max 35m)

            if (geofencePolygon && geofencePolygon.length >= 3) {
                // For polygons, check if inside or very close to border
                inside = pointInPolygon(latitude, longitude, geofencePolygon);

                // If not strictly inside, check if we are within 'totalBuffer' meters of any point or edge
                if (!inside) {
                    const distToCenter = calculateDistance(latitude, longitude, campusCenter[0], campusCenter[1]);
                    // If they are within centroid distance + buffer, we give them a chance
                    // (Simple approximation for polygon buffer)
                    if (distToCenter < 100 && distToCenter < totalBuffer) inside = true;
                }
            } else {
                const distance = calculateDistance(latitude, longitude, campusCenter[0], campusCenter[1]);
                inside = distance <= (geofenceRadius + totalBuffer);
            }

            setIsInsideCampus(inside);
            setIsCheckingLocation(false);

            // DETECT TRANSITION (Entry/Exit)
            if (lastInsideRef.current !== null && lastInsideRef.current !== inside) {
                const eventType = inside ? 'ENTRY' : 'EXIT';
                console.log(`[Geofence] Transition detected: ${eventType}`);
                try {
                    await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/geofence/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            studentId: user.id,
                            eventType,
                            latitude,
                            longitude,
                            accuracy
                        })
                    });
                } catch (e) {
                    console.error("Failed to log geofence event:", e);
                }
            }
            lastInsideRef.current = inside;

            // Time Boundary & Weekend/Holiday check
            const timing = await getCollegeTiming();
            const now = new Date();
            const localTodayStrISO = toISODate(now);

            const isHoliday = calendarEvents.some(e => {
                if (e.type !== 'Holiday') return false;
                return toISODate(e.date) === localTodayStrISO;
            });

            if (isHoliday) {
                setLiveStatus('Holiday');
                setIsCheckingLocation(false);
                return;
            }

            const isWeekend = now.getDay() === 0 || now.getDay() === 6;

            if (isWeekend) {
                setLiveStatus('Weekend');
                setIsCheckingLocation(false);
                return; // Stop execution: no attendance marked on weekends
            }

            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            let finalStatus = 'Absent';
            let timeIn = null;
            let timeOut = null;
            let sessions = [];
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const nowTime = `${hours}:${minutes}:${seconds}`;

            // Check previous state for today from DB
            const logs = await getAttendanceLogs(user.id);
            const isoToday = new Date().toISOString().split('T')[0];
            const localTodayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const todayLog = logs.find(l => {
                const lDateStr = new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return lDateStr === localTodayStr || l.date.includes(isoToday);
            });

            if (todayLog) {
                timeIn = todayLog.timeIn;
                timeOut = todayLog.timeOut;
                finalStatus = todayLog.status;

                // Parse sessions if they exist in DB
                if (todayLog.sessions) {
                    try {
                        sessions = typeof todayLog.sessions === 'string' ? JSON.parse(todayLog.sessions) : todayLog.sessions;
                    } catch (e) {
                        sessions = [];
                    }
                }
            }

            // ─── REFRESH BUG FIX AND STRICT EXIT TRIGGER ────────────────────────────────
            const isPastEndTime = currentTime >= timing.endTime;

            let isStatusFinalized =
                (finalStatus === 'Present' && isPastEndTime) ||
                finalStatus === 'Left Campus';

            // STRICT EXIT TRIGGER: If location is turned off or user leaves campus,
            // we MUST capture this exact moment as their exit time, even if it's past end time!
            if (!inside && finalStatus === 'Present' && !timeOut) {
                timeOut = nowTime; // Log exact moment of disconnect or boundary exit

                // If they leave early during operational hours, penalize as Left Campus
                if (currentTime < timing.endTime) {
                    finalStatus = 'Left Campus';
                }

                // Immediately cap any active sessions
                if (sessions.length > 0) {
                    const lastSession = sessions[sessions.length - 1];
                    if (lastSession.out === null) {
                        lastSession.out = nowTime;
                    }
                }
                isStatusFinalized = true; // Loop is completed for the day
            }

            if (isStatusFinalized) {
                setTrackingFinished(true); // Stop tracking GPS if the day's loop is finalized
            }

            if (!isStatusFinalized) {
                // Only attempt live status mutation if not finalized
                if (inside) {
                    if (!timeIn) timeIn = nowTime; // Record exact first entry time

                    if (currentTime >= timing.startTime && currentTime < timing.endTime) {
                        finalStatus = 'Present'; // Active inside during college hours
                        timeOut = null;

                        // Only push a new session if there isn't already an open one
                        if (sessions.length === 0) {
                            sessions.push({ in: nowTime, out: null });
                        } else {
                            const lastSession = sessions[sessions.length - 1];
                            // Only open a new session if the previous one was properly closed
                            if (lastSession.out !== null) {
                                sessions.push({ in: nowTime, out: null });
                            }
                        }
                    } else if (isPastEndTime) {
                        if (finalStatus !== 'Present' && finalStatus !== 'Left Campus') {
                            finalStatus = 'Outside Hours';
                        }
                    } else {
                        // Before hours
                        if (finalStatus !== 'Present' && finalStatus !== 'Left Campus') {
                            finalStatus = 'Not Started';
                        }
                    }
                } else {
                    // Outside campus
                    if (isPastEndTime) {
                        if (finalStatus !== 'Present' && finalStatus !== 'Left Campus') {
                            finalStatus = 'Outside Hours';
                        }
                    } else if (currentTime < timing.startTime) {
                        if (finalStatus !== 'Present' && finalStatus !== 'Left Campus') {
                            finalStatus = 'Not Started';
                        }
                    } else {
                        finalStatus = 'Outside Campus';
                    }
                }
            }
            // ─── END REFRESH BUG FIX ───────────────────────────────────────────────
            // ─── END REFRESH BUG FIX ───────────────────────────────────────────────

            setLiveStatus(finalStatus);

            // Only update backend if state ACTUALLY changed (prevents refresh spam)
            const dbSessions = todayLog?.sessions
                ? (typeof todayLog.sessions === 'string' ? JSON.parse(todayLog.sessions) : todayLog.sessions)
                : [];
            const lastLocalSessionOut = sessions.length > 0 ? sessions[sessions.length - 1].out : null;
            const lastDbSessionOut = dbSessions.length > 0 ? dbSessions[dbSessions.length - 1].out : null;
            const sessionsLengthChanged = sessions.length !== dbSessions.length;

            const statusChanged = !todayLog || todayLog.status !== finalStatus;
            const timeOutChanged = todayLog?.timeOut !== timeOut;
            const sessionChanged = sessionsLengthChanged || lastLocalSessionOut !== lastDbSessionOut;

            if (statusChanged || timeOutChanged || sessionChanged) {
                // Only write if we explicitly moved OUT of a finalized state OR into a new state
                // Never write if nothing really changed (prevents false rewrites on refresh)
                const isNoOpRefresh =
                    isStatusFinalized &&
                    !sessionsLengthChanged &&
                    lastLocalSessionOut === lastDbSessionOut &&
                    todayLog?.status === finalStatus;

                if (!isNoOpRefresh) {
                    await markAttendance(user.id, finalStatus, timeIn, timeOut, sessions);

                    // Keep UI optimistic
                    const formattedToday = {
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        inTime: timeIn || '--:--',
                        outTime: timeOut || '--:--',
                        status: finalStatus,
                        sessions: sessions
                    };

                    // Stop tracking if student has explicitly exited campus
                    if (finalStatus === 'Left Campus' || (finalStatus === 'Present' && timeOut !== null) || (finalStatus === 'Present' && isPastEndTime)) {
                        setTrackingFinished(true);
                    }

                    setAttendanceData(prev => ({
                        ...prev,
                        recentLogs: [formattedToday, ...prev.recentLogs.filter(l => l.date !== formattedToday.date)]
                    }));
                }
            }
        };

        if ('geolocation' in navigator) {
            // Use watchPosition for real-time continuous tracking
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setIsManualRecenter(false);
                    updateAttendanceState(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
                },
                (error) => {
                    console.error("Error getting location: ", error);
                    setLocationError("Please enable location services to verify attendance.");
                    setIsCheckingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocationError("Geolocation is not supported by your browser.");
            setIsCheckingLocation(false);
            setIsInsideCampus(false);
        }

        const safetyTimer = setTimeout(() => {
            setIsCheckingLocation(false);
        }, 5000);

        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    }, [campusCenter, geofenceRadius, geofencePolygon, user?.id, calendarEvents]);

    const d = new Date();
    const currentTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const isPastEndTimeGlobal = timingConfig ? (currentTimeStr >= timingConfig.endTime) : (liveStatus === 'Outside Hours');

    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Student Dashboard</h1>
                    <p className="text-gray-500" style={{ color: 'var(--color-text-secondary)' }}>Welcome back, {user?.name}</p>
                </div>

                {/* Live Status Badge */}
                <div style={{
                    padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: isCheckingLocation ? 'var(--color-warning-bg)' : locationError ? 'var(--color-danger-bg)' : (liveStatus === 'Weekend' || liveStatus === 'Holiday') ? '#f3f4f6' : liveStatus === 'Not Started' ? 'var(--color-warning-bg)' : isPastEndTimeGlobal ? 'var(--color-danger-bg)' : liveStatus === 'Left Campus' ? 'var(--color-warning-bg)' : isInsideCampus ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color: isCheckingLocation ? 'var(--color-warning)' : locationError ? 'var(--color-danger)' : (liveStatus === 'Weekend' || liveStatus === 'Holiday') ? '#6b7280' : liveStatus === 'Not Started' ? 'var(--color-warning)' : isPastEndTimeGlobal ? 'var(--color-danger)' : liveStatus === 'Left Campus' ? '#ca8a04' : isInsideCampus ? 'var(--color-success)' : 'var(--color-danger)',
                    fontWeight: 600, boxShadow: 'var(--shadow-sm)', border: `1px solid ${isCheckingLocation ? '#fde047' : locationError ? '#fecaca' : (liveStatus === 'Weekend' || liveStatus === 'Holiday') ? '#d1d5db' : liveStatus === 'Not Started' ? '#fde047' : isPastEndTimeGlobal ? '#fecaca' : liveStatus === 'Left Campus' ? '#fde047' : isInsideCampus ? '#bbf7d0' : '#fecaca'}`
                }}>
                    {isCheckingLocation ? <><Clock className="animate-spin" size={18} /><span>Checking...</span></> : (locationError ? <><XCircle size={18} /><span>GPS Error</span></> : (liveStatus === 'Weekend' ? <><Coffee size={18} /><span>Weekend</span></> : (liveStatus === 'Holiday' ? <><Calendar size={18} /><span>Holiday</span></> : (liveStatus === 'Not Started' ? <><Clock size={18} /><span>Not Started</span></> : (isPastEndTimeGlobal ? <><Clock size={18} /><span>Outside Hours</span></> : (liveStatus === 'Left Campus' ? <><Clock size={18} /><span>Left Campus</span></> : (isInsideCampus ? <><CheckCircle size={18} /><span>Inside</span></> : <><XCircle size={18} /><span>Outside</span></>)))))))}
                </div>

                {/* GPS Accuracy Indicator */}
                <div style={{
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '1rem',
                    backgroundColor: userAccuracy < 15 ? '#dcfce7' : (userAccuracy < 30 ? '#fef3c7' : '#fee2e2'),
                    color: userAccuracy < 15 ? '#166534' : (userAccuracy < 30 ? '#92400e' : '#991b1b'),
                    border: `1px solid ${userAccuracy < 15 ? '#bbf7d0' : (userAccuracy < 30 ? '#fde68a' : '#fecaca')}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 500
                }}>
                    <Navigation size={12} style={{ transform: 'rotate(45deg)' }} />
                    GPS Accuracy: ±{Math.round(userAccuracy)}m
                </div>
            </div>

            {/* Error Message Alert UI */}
            {locationError && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                    padding: '0.875rem 1rem', borderRadius: '0.75rem',
                    color: '#991b1b', fontSize: '0.875rem', fontWeight: 500,
                    boxShadow: 'var(--shadow-sm)',
                    animation: 'fade-in 0.3s ease-out'
                }}>
                    <XCircle size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
                    <span style={{ lineHeight: 1.4 }}>{locationError}</span>
                </div>
            )}

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'attendance' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'attendance' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem'
                    }}
                >
                    My Activity Map
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    style={{
                        padding: '0.5rem 1rem',
                        fontWeight: 500,
                        color: activeTab === 'calendar' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: activeTab === 'calendar' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-0.5rem'
                    }}
                >
                    Academic Calendar
                </button>
            </div>

            {activeTab === 'attendance' && (
                <div className="animate-fade-in grid gap-6">

                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>

                        {/* Profile Card */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>Student Profile</h3>

                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    {user?.profilePic ? (
                                        <img src={user.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        user?.name?.charAt(0) || 'S'
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{user?.name}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Number</p>
                                            <p style={{ fontWeight: 500 }}>{user?.rollNo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</p>
                                            <p style={{ fontWeight: 500 }}>{user?.branch || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch</p>
                                            <p style={{ fontWeight: 500 }}>{user?.batch || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</p>
                                            <p style={{ fontWeight: 500 }}>{user?.mobile || 'N/A'}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="btn"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', width: '100%', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' }}
                                            >
                                                Refresh Dashboard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Summary Widget */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>Attendance Overview</h3>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flex: 1 }}>

                                {/* Circular Progress (Mock CSS representation) */}
                                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#e2e8f0"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke={attendanceData.percentage >= 75 ? "var(--color-success)" : "var(--color-warning)"}
                                            strokeWidth="3"
                                            strokeDasharray={`${attendanceData.percentage}, 100`}
                                            style={{ strokeLinecap: 'round', animation: 'progress 1s ease-out forwards' }}
                                        />
                                    </svg>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{attendanceData.percentage}%</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Classes Attended</p>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-success)' }}>{attendanceData.classesAttended}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Total Classes</p>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{attendanceData.totalClasses}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Map / Logs Hybrid */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recent Geo-fence Logs</h3>

                            {/* Date Filter Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', minWidth: '130px' }}
                                    value={filterFromDate}
                                    onChange={(e) => setFilterFromDate(e.target.value)}
                                />
                                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>to</span>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', minWidth: '130px' }}
                                    value={filterToDate}
                                    onChange={(e) => setFilterToDate(e.target.value)}
                                />
                                {(filterFromDate || filterToDate) && (
                                    <button
                                        onClick={() => { setFilterFromDate(''); setFilterToDate(''); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.875rem' }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Date</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Entry Time</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Exit Time</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        let displayLogs = attendanceData.recentLogs;
                                        if (filterFromDate || filterToDate) {
                                            displayLogs = displayLogs.filter(log => {
                                                const logDateParsed = new Date(log.date);
                                                let isValid = true;
                                                if (filterFromDate) {
                                                    // use local time for date comparison to avoid timezone shift
                                                    const from = new Date(filterFromDate + 'T00:00:00');
                                                    isValid = isValid && (logDateParsed >= from);
                                                }
                                                if (filterToDate) {
                                                    const to = new Date(filterToDate + 'T23:59:59');
                                                    isValid = isValid && (logDateParsed <= to);
                                                }
                                                return isValid;
                                            });
                                        } else {
                                            displayLogs = displayLogs.slice(0, visibleCount);
                                        }

                                        if (displayLogs.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                        No geo-fence logs found matching your criteria.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return displayLogs.map((log, index) => {
                                            const noExit = log.outTime === '-' || log.outTime === '--:--' || !log.outTime;
                                            const hasEntry = log.inTime !== '-' && log.inTime !== '--:--' && !!log.inTime;
                                            const isToday = log.date === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                                            let exitLabel = formatTimeDisplay(log.outTime);
                                            if (log.status === 'Present' && noExit && isToday && isInsideCampus) {
                                                exitLabel = <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Inside</span>;
                                            } else if (hasEntry && noExit) {
                                                exitLabel = <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Not Captured</span>;
                                            }

                                            return (
                                                <tr key={index} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{log.date}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{formatTimeDisplay(log.inTime)}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>
                                                        {exitLabel}
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span
                                                                className={`badge ${log.status === 'Present' ? 'badge-success' : (log.status === 'Holiday' || log.status === 'Weekend' || log.status === 'Closed' ? '' : 'badge-danger')}`}
                                                                style={
                                                                    (log.status === 'Holiday' || log.status === 'Weekend') ? { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', fontSize: '0.7rem' }
                                                                        : (log.status === 'Closed') ? { backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', fontSize: '0.7rem' }
                                                                            : { fontSize: '0.7rem' }
                                                                }
                                                            >
                                                                {log.status === 'Weekend' ? 'Weekend - Closed' : log.status}
                                                            </span>
                                                            {log.sessions && log.sessions.length >= 1 && (
                                                                <button
                                                                    onClick={() => { setSelectedSessions(log.sessions); setIsSessionModalOpen(true); }}
                                                                    style={{ fontSize: '0.7rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                                >
                                                                    Details
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Load More Button */}
                        {!(filterFromDate || filterToDate) && visibleCount < attendanceData.recentLogs.length && (
                            <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 7)}
                                    className="btn btn-outline"
                                >
                                    Load More (7 days)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Live Map Preview Wrapper */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin className="text-primary" size={20} />
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Current Location vs Campus Zone</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCheckingLocation(true);
                                    setIsManualRecenter(true);
                                    if ('geolocation' in navigator) {
                                        navigator.geolocation.getCurrentPosition(
                                            position => {
                                                // Update state with exact location, triggering map recenter
                                                setUserLocation([position.coords.latitude, position.coords.longitude]);
                                                // If accuracy is there, update the accuracy circle too
                                                if (position.coords.accuracy) {
                                                    setUserAccuracy(position.coords.accuracy);
                                                }
                                                // Also manually fire updateAttendanceState so that "inside/outside" is force-checked
                                                setIsCheckingLocation(false);
                                            },
                                            error => {
                                                console.error("Recenter Error:", error);
                                                setIsCheckingLocation(false);
                                                setIsManualRecenter(false);
                                            },
                                            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
                                        );
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                            >
                                <Navigation size={16} /> Recenter
                            </button>
                        </div>

                        <div style={{ width: '100%', height: '350px', backgroundColor: '#e2e8f0', position: 'relative', zIndex: 1 }}>
                            <MapContainer
                                center={campusCenter}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                            >
                                <TileLayer
                                    attribution="Google Maps"
                                    url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                                />
                                <MapCenterer center={userLocation} isManual={isManualRecenter} />

                                {/* GeoFence Polygon (or fallback circle if polygon not set) */}
                                {geofencePolygon.length >= 3 ? (
                                    <Polygon
                                        positions={geofencePolygon}
                                        pathOptions={{
                                            color: 'var(--color-success)',
                                            fillColor: 'var(--color-success)',
                                            fillOpacity: 0.12,
                                            weight: 2,
                                            dashArray: '5, 10'
                                        }}
                                    />
                                ) : null}

                                {/* User Live Location Marker */}
                                {!isCheckingLocation && (
                                    <>
                                        <Marker position={userLocation} icon={StudentLocationIcon}>
                                            <Popup>
                                                <div style={{ textAlign: 'center' }}>
                                                    <strong>Your Live Location</strong><br />
                                                    Status: {isInsideCampus ? 'Inside Geo-Fence' : 'Outside Campus'}<br />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Accuracy: ±{Math.round(userAccuracy)}m</span>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        {userAccuracy > 0 && (
                                            <Circle
                                                center={userLocation}
                                                radius={userAccuracy}
                                                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1, dashArray: '4, 4' }}
                                            />
                                        )}
                                    </>
                                )}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Session Detail Modal */}
                    {isSessionModalOpen && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                        }}>
                            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                                <button
                                    onClick={() => setIsSessionModalOpen(false)}
                                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                                >
                                    <XCircle size={20} />
                                </button>

                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Detailed Day Log</h2>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    View all entries and exits for this day.
                                </p>

                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                                    {selectedSessions.map((session, index) => (
                                        <div key={index} style={{
                                            padding: '1rem',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.75rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: session.out ? 'transparent' : 'var(--color-success-bg)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    width: '24px', height: '24px',
                                                    borderRadius: '50%', backgroundColor: 'var(--color-primary-light)',
                                                    color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 'bold'
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)' }}>
                                                        In: {formatTimeDisplay(session.in)}
                                                    </div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: session.out ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                                                        Out: {session.out ? formatTimeDisplay(session.out) : (
                                                            (timingConfig && currentTimeStr > timingConfig.endTime) || (selectedSessions.length > 0 && selectedSessions[0].date && selectedSessions[0].date !== localTodayStrISO)
                                                                ? <span style={{ fontStyle: 'italic' }}>Not Captured</span>
                                                                : 'Still Inside'
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {!session.out && (!timingConfig || currentTimeStr <= timingConfig.endTime) && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'calendar' && (() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const monthName = currentDate.toLocaleString('default', { month: 'long' });

                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

                const getEventForDate = (dateLocalStr) => calendarEvents.find(e => {
                    const d = new Date(e.date);
                    const dbDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return dbDate === dateLocalStr;
                });

                const getLogForDate = (dateLocalStr) => attendanceData.recentLogs.find(l => {
                    const d = new Date(l.date);
                    const lDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return lDateStr === dateLocalStr;
                });

                return (
                    <div className="animate-fade-in card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CalendarDays className="text-primary" /> My Academic Calendar
                            </h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                                const todayLocalStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                                const isPast = new Date(localDateStr) < new Date(todayLocalStr);
                                const isToday = localDateStr === todayLocalStr;

                                const evt = getEventForDate(localDateStr);
                                const log = getLogForDate(localDateStr);

                                let bgClass = 'bg-white';
                                let content = null;

                                if (evt) {
                                    if (evt.type === 'Holiday') {
                                        bgClass = 'bg-yellow-50'; // verified holiday
                                        content = (
                                            <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: '#ca8a04' }}>
                                                <strong>Holiday</strong>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={evt.reason}>{evt.reason}</div>
                                            </div>
                                        );
                                    } else if (evt.type === 'Class') {
                                        if (isPast || isToday) {
                                            // Check Attendance Log
                                            if (log && log.status === 'Present') {
                                                const noExit = log.outTime === '-' || log.outTime === '--:--' || !log.outTime;
                                                const hasEntry = log.inTime !== '-' && log.inTime !== '--:--' && !!log.inTime;
                                                let exitLabel = formatTimeDisplay(log.outTime);

                                                if (noExit && isToday) {
                                                    exitLabel = 'Inside';
                                                } else if (hasEntry && noExit) {
                                                    exitLabel = 'Not Captured';
                                                }

                                                bgClass = 'bg-green-50';
                                                content = (
                                                    <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: 'var(--color-success)' }}>
                                                        <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                        <strong>Present</strong>
                                                        <div>{formatTimeDisplay(log.inTime)} - {exitLabel}</div>
                                                    </div>
                                                );
                                            } else if (log && log.status === 'Left Campus') {
                                                bgClass = 'bg-warning-50'; // custom weak yellow
                                                content = (
                                                    <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: 'var(--color-warning)' }}>
                                                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                        <strong>Left Early</strong>
                                                    </div>
                                                );
                                            } else {
                                                // Absent if Past
                                                if (isPast) {
                                                    bgClass = 'bg-red-50';
                                                    content = (
                                                        <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: 'var(--color-danger)' }}>
                                                            <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                            <strong>Absent</strong>
                                                        </div>
                                                    );
                                                } else {
                                                    // Today but no log yet (or still checking)
                                                    bgClass = 'bg-blue-50';
                                                    content = (
                                                        <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: 'var(--color-primary)' }}>
                                                            <strong>Class Today</strong>
                                                        </div>
                                                    );
                                                }
                                            }
                                        } else {
                                            // Future Class
                                            bgClass = 'bg-blue-50';
                                            content = (
                                                <div style={{ marginTop: 'auto', fontSize: '0.75rem', textAlign: 'left', color: 'var(--color-primary)' }}>
                                                    <strong>Upcoming Class</strong>
                                                    <div style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.reason}</div>
                                                </div>
                                            );
                                        }
                                    }
                                } else {
                                    // No Verified event means No Class or Not Scheduled yet.
                                    // If it's a weekend, maybe we want to color it differently, but leave default for now.
                                }

                                return (
                                    <div
                                        key={day}
                                        className={`transition-shadow relative ${bgClass} ${isToday ? 'border-primary border-2' : ''}`}
                                        style={{
                                            padding: '0.5rem',
                                            minHeight: '100px',
                                            border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <span style={{ fontWeight: isToday ? 700 : 500, alignSelf: 'flex-end', color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                                            {day}
                                        </span>
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StudentDashboard;
