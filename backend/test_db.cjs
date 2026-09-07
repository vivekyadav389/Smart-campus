const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/smart_campus' });
async function test() {
    try {
        const { rows } = await pool.query('SELECT * FROM semesters LIMIT 1');
        console.log(rows);
    } catch(err) { console.error(err); }
    pool.end();
}
test();
