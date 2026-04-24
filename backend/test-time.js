import { getCollegeTiming, updateCollegeTiming } from './src/utils/mockDb.js';

console.log("Initial Timing:", getCollegeTiming());

updateCollegeTiming('09:00', '17:00');
console.log("Updated Timing:", getCollegeTiming());

const timing = getCollegeTiming();
const now = new Date();
const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
const isWithinHours = currentTime >= timing.startTime && currentTime <= timing.endTime;

console.log(`Current Time is ${currentTime}`);
console.log(`Is within hours (${timing.startTime} - ${timing.endTime})? ${isWithinHours}`);
