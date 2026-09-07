const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const regexFirstPut = /app\.put\('\/api\/semesters\/:id', async \(req, res\) => {[\s\S]*?res\.status\(500\)\.json\({ success: false, error: 'Internal Server Error' }\);\s*}\s*}\);\n/g;
const firstMatch = content.match(regexFirstPut);

// The generic one is at the bottom. We just want to delete the first one if there are two.
if (firstMatch && firstMatch.length >= 2) {
    // replace the first occurrence
    content = content.replace(firstMatch[0], '');
    fs.writeFileSync(file, content);
    console.log("Deleted first PUT /api/semesters/:id");
} else {
    console.log("Not two matches?");
}
