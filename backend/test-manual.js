const fetch = require('node-fetch');

async function run() {
    try {
        const res = await fetch('http://localhost:5001/api/attendance/manual-mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: 'S1', date: '2024-03-01', status: 'Present' })
        });
        const data = await res.json();
        console.log("Success:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
