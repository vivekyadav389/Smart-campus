const fs = require('fs');

const adminFile = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(adminFile, 'utf8');

const startIdx = content.indexOf('{/* Detailed Student Modal */}');
if (startIdx === -1) process.exit(1);

// The modal ends at the matching div for the selectedDetailedStudent block.
// It looks like:
/*
            {/* Detailed Student Modal *\/}
            {selectedDetailedStudent && (
                <div ...>
                    ...
                </div>
            )}
*/
// Find the exact string that ends the modal
let substr = content.substring(startIdx);
let endString = "                        </div>\n                    </div>\n                </div>\n            )}";
let endIdx = substr.indexOf(endString);
if (endIdx === -1) {
    console.error("End string not found");
    process.exit(1);
}

const modalJSX = substr.substring(0, endIdx + endString.length);

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
            // A class day is when there's an explicit "Class" or "Extra Class" event, OR if there's no event but it's a weekday (fallback).
            // But if a "Class" event is removed (meaning no event and it's a weekday), we should respect "No Class".
            // Since mockDb doesn't have a specific way to mark "deleted class" except removing the event,
            // we will assume ONLY events with type='Class' or 'Extra Class' are class days!
            const hasClassEvent = eventForDay && (eventForDay.type === 'Class' || eventForDay.type === 'Extra Class');
            
            if (hasClassEvent) {
                isClassDay = true;
            }
            
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

// Remove the modal from AdminDashboard.jsx and insert the component
content = content.replace(modalJSX, `            <StudentDetailsModal student={selectedDetailedStudent} onClose={() => setSelectedDetailedStudent(null)} />`);

if (!content.includes('import StudentDetailsModal')) {
    content = content.replace(/import \{ getStats/, "import StudentDetailsModal from '../components/StudentDetailsModal';\nimport { getStats");
}

fs.writeFileSync(adminFile, content);
console.log("Updated AdminDashboard.jsx");

