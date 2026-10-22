const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const project = path.resolve(root, '..');

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function expect(value, message) { if (!value) throw new Error(message); }

const queue = read('js/cloud/prepaid-print-queue.js');
const printer = read('js/hardware/receipt-printer.js');
const manager = read('js/staff/enterprise-manager.js');
const index = read('index.html');
const staff = read('staff.html');
const sw = read('service-worker.js');
const functionsSource = fs.readFileSync(path.join(project, 'FIREBASE_STAFF_AUTH/functions-staff-auth/index.js'), 'utf8');

expect(functionsSource.includes('exports.prepaidPrintV1Status'), 'print queue status callable missing');
expect(functionsSource.includes('exports.prepaidPrintV1Retry'), 'manual receipt retry callable missing');
expect(functionsSource.includes('errorCode === "CONTROLLER_TIMEOUT"'), 'transient printer recovery missing');
expect(queue.includes('prepaidPrintV1Status'), 'kiosk does not check queue status');
expect(queue.includes('prepaidPrintV1Retry'), 'kiosk does not support failed job retry');
expect(queue.includes('prepaidPrintQueueStatus'), 'visible kiosk print status missing');
expect(queue.includes('連接收據機並重試'), 'visible printer recovery action missing');
expect(printer.includes('ensureReady'), 'printer readiness check missing');
expect(printer.includes('Controller 畫面上的 8 位數配對碼'), 'pairing recovery prompt missing');
expect(printer.includes('CONTROLLER_TIMEOUT'), 'printer bridge timeout missing');
expect(manager.includes("document.addEventListener('click',orderDeleteAction,true)"), 'mobile delegated delete handler missing');
expect(manager.includes('getIdToken(true)'), 'fresh mobile auth token missing');
expect(manager.includes("alert('刪除失敗：'+message)"), 'visible mobile delete failure missing');
expect(manager.includes("alert('已刪除「'+label+'」"), 'visible mobile delete success missing');
expect(index.includes('receipt-printer.js?v=7833fix47'), 'kiosk FIX47 printer cache bust missing');
expect(index.includes('prepaid-print-queue.js?v=7833fix47'), 'kiosk FIX47 queue cache bust missing');
expect(staff.includes('enterprise-manager.js?v=fix47'), 'staff FIX47 cache bust missing');
expect(sw.includes('7833-fix47-print-mobile-delete-recovery-20261022-1'), 'FIX47 service-worker cache missing');

console.log('FIX47 print and mobile delete recovery tests passed');
