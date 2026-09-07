const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/utils/mockDb.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /export const getSemesters = async \(branch, batch, status\) => {[\s\S]*?if \(status\) url \+= `status=\${encodeURIComponent\(status\)}&`;/g,
    `export const getSemesters = async (branch, batch, status, state) => {\n    try {\n        let url = \`\${API_BASE_URL}/api/semesters?\`;\n        if (branch) url += \`branch=\${encodeURIComponent(branch)}&\`;\n        if (batch) url += \`batch=\${encodeURIComponent(batch)}&\`;\n        if (status) url += \`status=\${encodeURIComponent(status)}&\`;\n        if (state) url += \`state=\${encodeURIComponent(state)}&\`;`
);
fs.writeFileSync(file, content);
console.log("Updated getSemesters successfully.");
