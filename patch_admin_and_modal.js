const fs = require('fs');

// Patch AdminDashboard.jsx
const adminFile = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

// Remove redundant states and simplify openDetailedStudent
adminContent = adminContent.replace(
    /const \[detailedStudentSemesters, setDetailedStudentSemesters\] = useState\(\[\]\);\n\s*const \[selectedSemesterId, setSelectedSemesterId\] = useState\('Current'\);\n\s*const \[detailedStudentStats, setDetailedStudentStats\] = useState\(\{ present: 0, total: 0 \}\);/,
    ''
);

const openDetailedStudentRegex = /const openDetailedStudent = async \(student\) => \{[\s\S]*?\n\s*const handleSemesterChange = \(e\) => \{[\s\S]*?\n\s*\};/;
adminContent = adminContent.replace(
    openDetailedStudentRegex,
    `const openDetailedStudent = (student) => {
        setSelectedDetailedStudent(student);
    };`
);
fs.writeFileSync(adminFile, adminContent);
console.log("Patched AdminDashboard.jsx");

// Patch StudentDetailsModal.jsx
const modalFile = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let modalContent = fs.readFileSync(modalFile, 'utf8');
modalContent = modalContent.replace(
    /getCalendarEvents\(student\.branch, student\.batch\)/g,
    "getCalendarEvents('Verified', student.batch, student.branch)"
);
fs.writeFileSync(modalFile, modalContent);
console.log("Patched StudentDetailsModal.jsx");
