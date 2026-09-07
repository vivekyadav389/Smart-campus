import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/smart_campus' });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'semesters'").then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
