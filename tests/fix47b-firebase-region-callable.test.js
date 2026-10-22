const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function expect(value, message) { if (!value) throw new Error(message); }

const app = read('js/staff/staff-app.js');
const manager = read('js/staff/enterprise-manager.js');
const queue = read('js/cloud/prepaid-print-queue.js');
const index = read('index.html');
const staff = read('staff.html');
const sw = read('service-worker.js');
const combined = app + '\n' + manager + '\n' + queue;

expect(!/firebase\.functions\(["']asia-east1["']\)/.test(combined), 'invalid Firebase regional API remains');
expect(app.includes('firebase.app().functions("asia-east1")'), 'prepaid callable region binding missing');
expect(manager.includes("firebase.app().functions('asia-east1')"), 'delete callable region binding missing');
expect(queue.includes('firebase.app().functions("asia-east1")'), 'print queue callable region binding missing');
expect(index.includes('prepaid-print-queue.js?v=7833fix47b'), 'kiosk FIX47B cache bust missing');
expect(staff.includes('staff-app.js?v=fix47b'), 'staff app FIX47B cache bust missing');
expect(staff.includes('enterprise-manager.js?v=fix47b'), 'manager FIX47B cache bust missing');
expect(sw.includes('7833-fix47b-firebase-region-callable-20261022-1'), 'FIX47B cache missing');

console.log('FIX47B Firebase regional callable tests passed');
