const fs = require('fs');
const assert = require('assert');

const staff = fs.readFileSync('js/staff/staff-app.js','utf8');
const html = fs.readFileSync('staff.html','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(staff.includes('function redeemPrepaidEntryDirect'), 'must provide direct RTDB fallback');
assert(staff.includes('prepaidRedeemRequests[requestId]'), 'fallback must be idempotent');
assert(staff.includes('/printJobs/'), 'fallback must enqueue a kiosk print job');
assert(staff.includes('source:"staff_prepaid_direct"'), 'fallback order must be identifiable');
assert(staff.includes('code.indexOf("failed-precondition")'), 'callable failed-precondition must trigger fallback');
assert(html.includes('staff-app.js?v=fix47d'), 'staff page must bust the old cached script');
assert(sw.includes('fix47d-direct-prepaid-fallback'), 'service worker cache must be bumped');

console.log('PASS FIX47D direct prepaid fallback');
