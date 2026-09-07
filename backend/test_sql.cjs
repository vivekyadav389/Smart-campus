const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://smart_campus_user:smart_campus_pass@localhost:5432/smart_campus' });

pool.query('SELECT id, start_date, end_date, (end_date::date - start_date::date) + 1 as "totalDays" FROM semesters LIMIT 1')
  .then(res => { console.log("With ::date :", res.rows[0]); return pool.query('SELECT id, start_date, end_date, (end_date - start_date) as "diff" FROM semesters LIMIT 1'); })
  .then(res => { console.log("Without ::date :", res.rows[0]); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
