const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('DEBUG MODAL OVERLAY')) {
    content = content.replace(
        '<StudentDetailsModal \n                student={selectedDetailedStudent} \n                onClose={() => setSelectedDetailedStudent(null)} \n            />',
        `<StudentDetailsModal 
                student={selectedDetailedStudent} 
                onClose={() => setSelectedDetailedStudent(null)} 
            />
            {selectedDetailedStudent && (
                <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 99999, background: 'red', color: 'white', padding: '20px' }}>
                    DEBUG MODAL OVERLAY TRIGGERED FOR {selectedDetailedStudent.name}
                    <button onClick={() => setSelectedDetailedStudent(null)}>Close Debug</button>
                </div>
            )}`
    );
    fs.writeFileSync(file, content);
    console.log("Patched TeacherDashboard");
} else {
    console.log("Already patched");
}
