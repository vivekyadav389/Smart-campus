import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getCollegeTiming } from '../utils/mockDb';

const AttendanceBanner = () => {
    const [timings, setTimings] = useState(null);

    useEffect(() => {
        const fetchTimings = async () => {
            const data = await getCollegeTiming();
            if (data) setTimings(data);
        };
        fetchTimings();
        
        // Refresh every minute to stay in sync
        const interval = setInterval(fetchTimings, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!timings) return null;

    const formatTime = (time) => {
        if (!time) return '';
        const [hour, minute] = time.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minute} ${ampm}`;
    };

    return (
        <div style={{
            backgroundColor: 'var(--color-primary-bg)',
            color: 'var(--color-primary)',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-primary-border, rgba(37, 99, 235, 0.1))',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            fontSize: '0.925rem',
            fontWeight: 500
        }}>
            <Clock size={18} />
            <span>
                Attendance Window: <strong style={{ fontWeight: 700 }}>{formatTime(timings.startTime)} – {formatTime(timings.endTime)}</strong>
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.8 }}>
                Live Update
            </span>
        </div>
    );
};

export default AttendanceBanner;
