const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add User to imports if missing
if (!content.includes(' User,')) {
    content = content.replace(/import { Users,/, 'import { User, Users,');
}

// Rename Calendar back to CalendarIcon in my new modal code
// Or just import Calendar
content = content.replace(/import {([^}]*)Calendar as CalendarIcon([^}]*)} from 'lucide-react';/, "import {$1Calendar as CalendarIcon, Calendar$2} from 'lucide-react';");

fs.writeFileSync(file, content);
console.log("Updated imports");
