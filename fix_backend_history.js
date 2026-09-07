const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /let query = 'SELECT \* FROM semesters WHERE status = \$1';\n\s*let params = \['Completed'\];/,
    "let query = 'SELECT * FROM semesters WHERE state = $1';\n        let params = ['Ended'];"
);

fs.writeFileSync(file, content);
console.log("Patched server.js");
