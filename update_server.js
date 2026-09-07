const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /app\.post\('\/api\/semesters', async \(req, res\) => \{\n    const \{ branch, batch, startDate, endDate \} = req\.body;\n    try \{\n        await pool\.query\(\n            'UPDATE semesters SET state = \$1 WHERE branch = \$2 AND batch = \$3 AND state = \$4',\n            \['Completed', branch, batch, 'Active'\]\n        \);\n        await pool\.query\(\n            'INSERT INTO semesters \(name, branch, batch, start_date, end_date, state, status\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)',\n            \[\`Semester \$\{startDate\.substring\(0,4\)\}\`, branch, batch, startDate, endDate, 'Active', 'Approved'\]\n        \);/,
    `app.post('/api/semesters', async (req, res) => {
    const { branch, batch, startDate, endDate, name } = req.body;
    try {
        await pool.query(
            'UPDATE semesters SET state = $1 WHERE branch = $2 AND batch = $3 AND state = $4',
            ['Completed', branch, batch, 'Active']
        );
        const finalName = name || \`Semester \${startDate.substring(0,4)}\`;
        await pool.query(
            'INSERT INTO semesters (name, branch, batch, start_date, end_date, state, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [finalName, branch, batch, startDate, endDate, 'Active', 'Approved']
        );`
);

fs.writeFileSync(file, content);
console.log("Updated server.js");
