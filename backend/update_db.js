import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Applying batch level enhancements...");
        await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS batch VARCHAR(50) DEFAULT 'All';`);
        await pool.query(`ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_date_key;`);
        await pool.query(`ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_date_batch_key UNIQUE (date, batch);`);
        console.log("Schema updated successfully!");
    } catch (e) {
        console.error("Failed to update schema:", e.message);
        console.log("\n[TIP] Check if the password in your .env is correct.");
    } finally {
        await pool.end();
    }
}

run();
