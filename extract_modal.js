const fs = require('fs');

const adminFile = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(adminFile, 'utf8');

// Find the modal block
const modalStartStr = '{/* Detailed Student Modal */}';
const modalEndStr = '</div>\n                </div>\n            )}\n        </div>';

const startIdx = content.indexOf(modalStartStr);
const endIdx = content.indexOf(modalEndStr);

if (startIdx === -1 || endIdx === -1) {
    console.error("Modal not found in AdminDashboard.jsx");
    process.exit(1);
}

const modalJSX = content.substring(startIdx, endIdx);

// The component file
const modalComponent = `
import React, { useState, useEffect } from 'react';
import { User, MapPin, Calendar as CalendarIcon, Calendar, CheckCircle, XCircle, ChevronRight, Hash, Phone, Mail, Building, Activity, X } from 'lucide-react';
import { getSemesters, getSemesterHistory, getAttendanceLogs, getCalendarEvents } from '../utils/mockDb';

const StudentDetailsModal = ({ student, onClose }) => {
    const [detailedStudentSemesters, setDetailedStudentSemesters] = useState([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState('Current');
    const [detailedStudentStats, setDetailedStudentStats] = useState({ present: 0, total: 0 });

    useEffect(() => {
        if (!student) return;
        const loadData = async () => {
            try {
                const [activeSems, historySems, logs, events] = await Promise.all([
                    getSemesters(student.branch, student.batch),
                    getSemesterHistory(student.branch, student.batch),
                    getAttendanceLogs(student.id),
                    getCalendarEvents(student.branch, student.batch)
                ]);
                
                const allSems = [...(activeSems || []), ...(historySems || [])];
                setDetailedStudentSemesters(allSems);
                
                student._logs = logs || [];
                student._events = events || [];
                
                calculateDetailedStats(student, 'Current', activeSems && activeSems.length > 0 ? activeSems[0] : null, allSems);
            } catch(e) { console.error(e); }
        };
        loadData();
    }, [student]);

    const calculateDetailedStats = (stu, semId, defaultSem = null, allSems = detailedStudentSemesters) => {
        let targetSem = defaultSem;
        if (semId !== 'Current') {
            targetSem = allSems.find(s => s.id === parseInt(semId));
        } else if (!targetSem && allSems.length > 0) {
            targetSem = allSems.find(s => s.state === 'Active');
        }

        if (!targetSem) {
            setDetailedStudentStats({ present: parseInt(stu.classesAttended) || 0, total: parseInt(stu.totalClasses) || 0 });
            return;
        }

        const st = new Date(targetSem.start_date || targetSem.startdate);
        const en = new Date(targetSem.end_date || targetSem.enddate || new Date());
        const today = new Date();
        const calcEnd = en > today ? today : en;

        let totalClassDays = 0;
        let presentCount = 0;

        let current = new Date(st);
        while (current <= calcEnd) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const eventForDay = (stu._events || []).find(e => e.date.startsWith(dateStr) && e.status === 'Verified');
            const isHoliday = eventForDay && eventForDay.type === 'Holiday';
            const isExtraClass = eventForDay && eventForDay.type === 'Extra Class';
            
            let isClassDay = false;
            if (!isWeekend && !isHoliday) isClassDay = true;
            if (isExtraClass) isClassDay = true;
            
            // Check if it's today and if we want to count today if no class event
            // Wait, we just use eventForDay logic which we will refine later for 'No Class' logic globally.
            // For now, if no event is found and it's a weekday, it's considered a class day. 
            // BUT if the user wants 'No Class' when event is deleted, we might need to ONLY count days that HAVE a 'Class' event.
            // In the DB, mockDb generates 'Class' events for every weekday?
            // Actually, for stats, it's safer to only count 'Class' or 'Extra Class' events if they exist, or fallback to weekdays.
            // Let's adapt it: if eventForDay doesn't exist, it's a normal weekday (so a class day, UNLESS they manually deleted the 'Class' event, in which case it shouldn't be counted?)
            // We'll address the "No Class" globally later, for now just copy the logic.
            
            if (isClassDay) {
                totalClassDays++;
                const log = (stu._logs || []).find(l => l.date.startsWith(dateStr) && l.status === 'Present');
                if (log) presentCount++;
            }
            
            current.setDate(current.getDate() + 1);
        }

        setDetailedStudentStats({ present: presentCount, total: totalClassDays });
    };

    const handleSemesterChange = (e) => {
        const val = e.target.value;
        setSelectedSemesterId(val);
        calculateDetailedStats(student, val);
    };

    if (!student) return null;

    return (
        ${modalJSX.replace(/selectedDetailedStudent/g, 'student').replace(/setSelectedDetailedStudent\(null\)/g, 'onClose()').trim()}
    );
};

export default StudentDetailsModal;
`;

fs.writeFileSync('/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx', modalComponent);
console.log("Extracted StudentDetailsModal.jsx");

// Update AdminDashboard.jsx
const newAdminContent = content.substring(0, startIdx) + 
`            <StudentDetailsModal 
                student={selectedDetailedStudent} 
                onClose={() => setSelectedDetailedStudent(null)} 
            />
` + content.substring(endIdx);

fs.writeFileSync(adminFile, newAdminContent);
console.log("Updated AdminDashboard.jsx modal mounting");

