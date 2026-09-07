const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/utils/mockDb.js';
let content = fs.readFileSync(file, 'utf8');

// Fix getSemesters
content = content.replace(
    /if \(branch\) url \+= `branch=\$\{encodeURIComponent\(branch\)\}&`;\n\s*if \(batch\) url \+= `batch=\$\{encodeURIComponent\(batch\)\}&`;/,
    `if (branch && branch !== 'All') url += \`branch=\${encodeURIComponent(branch)}&\`;
        if (batch && batch !== 'All') url += \`batch=\${encodeURIComponent(batch)}&\`;`
);

// Fix getSemesterHistory
content = content.replace(
    /if \(branch\) url \+= `branch=\$\{encodeURIComponent\(branch\)\}&`;\n\s*if \(batch\) url \+= `batch=\$\{encodeURIComponent\(batch\)\}&`;/g,
    `if (branch && branch !== 'All') url += \`branch=\${encodeURIComponent(branch)}&\`;
        if (batch && batch !== 'All') url += \`batch=\${encodeURIComponent(batch)}&\`;`
);

// Fix getCalendarEvents
content = content.replace(
    /if \(batch\) params\.push\(`batch=\$\{encodeURIComponent\(batch\)\}`\);\n\s*if \(branch\) params\.push\(`branch=\$\{encodeURIComponent\(branch\)\}`\);/,
    `if (batch && batch !== 'All') params.push(\`batch=\${encodeURIComponent(batch)}\`);
        if (branch && branch !== 'All') params.push(\`branch=\${encodeURIComponent(branch)}\`);`
);

fs.writeFileSync(file, content);
console.log("Patched mockDb.js");
