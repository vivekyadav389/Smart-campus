import fetch from 'node-fetch'; // assuming node-fetch is available if we run it in the project root, or we use native fetch if node 18+

const API_URL = 'http://localhost:5000/api/auth/login';

async function runTest() {
    console.log("=== Testing Single Device Policy ===");
    
    // We assume the db has some users. Let's create a fake device ID.
    const mockDeviceId = 'dev_test_' + Date.now();
    
    // Attempt 1: Student A login (should succeed and bind device)
    console.log("\n[1] Student A attempts login with Device ID:", mockDeviceId);
    // Usually admin/admin or test users exist. Replace email/password if needed.
    const resA = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 's1@college.edu', password: 'password', deviceId: mockDeviceId })
    });
    const dataA = await resA.json();
    console.log("Student A Login Response:", dataA);
    
    if (!dataA.success) {
        console.error("Student A login failed! Check user credentials.");
        return;
    }

    // Attempt 2: Student B login on the SAME device
    console.log("\n[2] Student B attempts login on the SAME Device");
    const resB = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 's2@college.edu', password: 'password', deviceId: mockDeviceId })
    });
    const dataB = await resB.json();
    console.log("Student B Login Response (Should Fail):", dataB);
    
    if (resB.status === 403 && dataB.error === 'This device is already registered with another user.') {
        console.log("✅ TEST PASSED: Single Device Policy successfully blocked the unauthorized login.");
    } else {
        console.error("❌ TEST FAILED: The system allowed the login or gave the wrong error.");
    }
}

// In Node 18+, fetch is available globally. If older, this might fail without node-fetch.
runTest();
