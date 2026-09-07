const fs = require('fs');

const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `const [activeTab, setActiveTab] = useState('attendance');`;
const replaceStr = `const [activeTab, setActiveTab] = useState('attendance');
    const [selectedDetailedStudent, setSelectedDetailedStudent] = useState(null);`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(file, content);
console.log("Fixed TeacherDashboard");
