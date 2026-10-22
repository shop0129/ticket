const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const project = path.resolve(root, '..');

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function expect(value, message) { if (!value) throw new Error(message); }

const queue = read('js/cloud/prepaid-print-queue.js');
const manager = read('js/staff/enterprise-manager.js');
const staffApp = read('js/staff/staff-app.js');
const orderTools = read('js/staff/order-tools.js');
const index = read('index.html');
const staff = read('staff.html');
const sw = read('service-worker.js');
const functionsSource = fs.readFileSync(path.join(project, 'FIREBASE_STAFF_AUTH/functions-staff-auth/index.js'), 'utf8');

expect(functionsSource.includes('exports.prepaidPrintV1ClaimNext'), 'missing proactive print claim callable');
expect(queue.includes('prepaidPrintV1ClaimNext'), 'kiosk does not call proactive print claim');
expect(queue.includes('setInterval(pollNext, 3000)'), 'kiosk print polling interval missing');
expect(manager.includes("new Error('後端回應逾時')"), 'order delete timeout missing');
expect(manager.includes('deleteFallback:true'), 'order delete fallback missing');
expect(orderTools.includes('.once("value")'), 'member rebind must refresh cloud members');
expect(orderTools.includes('是否立即新增會員並自動綁定'), 'member create prompt missing');
expect(staffApp.includes('MonsterStaffMemberManager'), 'quick member manager bridge missing');
expect(staffApp.includes('memberCreatedCallback'), 'auto-bind callback missing');
expect(index.includes('prepaid-print-queue.js?v=7833fix46'), 'index FIX46 queue version missing');
expect(staff.includes('order-tools.js?v=fix46'), 'staff FIX46 order tools version missing');
expect(sw.includes('7833-fix46-cloud-print-delete-member-bind-20261022-1'), 'FIX46 service-worker cache missing');

console.log('FIX46 cloud print, delete and member bind tests passed');
