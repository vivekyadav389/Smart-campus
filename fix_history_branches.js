const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\{uniqueBatches\.filter\(b => b !== 'All'\)\.map\(batch => \(/,
    `{[...new Set(availableExportSemesters.map(s => s.batch).filter(Boolean))].map(batch => (`
); // just in case it wasn't replaced properly

content = content.replace(
    /\{\/\* Assuming user\.branch is the only one they teach, but we give All option \*\/\}\n\s*<option value=\{user\.branch\}>\{user\.branch\}<\/option>/,
    `{[...new Set(availableExportSemesters.map(s => s.branch).filter(Boolean))].map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                ))}`
);

fs.writeFileSync(file, content);
console.log("Fixed history branches dropdown");
