import { authenticateUser, getDeviceRequests, mockDatabase } from './src/utils/mockDb.js';

console.log("--- Testing Device Restriction Logic ---");

// 1. First login (Device 1)
console.log("Attempt 1: First login with Device A");
const res1 = authenticateUser('student@smartcollege.edu', 'password123', 'device_A_123');
console.log("Result 1 Success:", res1.success);
console.log("Alex's Registered Device:", mockDatabase.students[0].registeredDeviceId);

// 2. Second login (Device 2)
console.log("\nAttempt 2: Second login with Device B (Should Fail)");
const res2 = authenticateUser('student@smartcollege.edu', 'password123', 'device_B_456');
console.log("Result 2 Success:", res2.success);
console.log("Result 2 Error:", res2.error);

// 3. Check Admin Requests
const reqs = getDeviceRequests();
console.log("\nPending Admin Requests:", reqs.length);
console.log("Request Details:", reqs[0]?.newDeviceId);

// 4. Admin Approves Device B
import { approveDeviceRequest } from './src/utils/mockDb.js';
console.log("\nAdmin Approving Request...");
approveDeviceRequest(reqs[0]?.id);
console.log("Alex's NEW Registered Device:", mockDatabase.students[0].registeredDeviceId);

// 5. Attempt login with Device B again
console.log("\nAttempt 3: Login with Device B again (Should Succeed)");
const res3 = authenticateUser('student@smartcollege.edu', 'password123', 'device_B_456');
console.log("Result 3 Success:", res3.success);

// 6. Attempt login with Old Device A
console.log("\nAttempt 4: Login with Old Device A (Should Fail)");
const res4 = authenticateUser('student@smartcollege.edu', 'password123', 'device_A_123');
console.log("Result 4 Success:", res4.success);
