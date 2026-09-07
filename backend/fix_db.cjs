const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'semesters'").then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
