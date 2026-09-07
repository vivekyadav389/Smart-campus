const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
async function test() {
    try {
        const { rows } = await pool.query(`SELECT (CURRENT_TIMESTAMP - (CURRENT_TIMESTAMP - interval '10 days')) as intvl, (CURRENT_DATE - (CURRENT_DATE - 5)) as days`);
        console.log(rows);
    } catch(err) { console.error(err); }
    pool.end();
}
test();
