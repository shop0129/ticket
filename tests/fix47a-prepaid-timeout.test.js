const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function expect(value, message) { if (!value) throw new Error(message); }

const app = read('js/staff/staff-app.js');
const staff = read('staff.html');
const sw = read('service-worker.js');

expect(app.includes('monsterPrepaidRedeemPendingV1'), 'safe pending redemption id missing');
expect(app.includes('Promise.race([callPromise,timeoutPromise])'), 'redemption timeout race missing');
expect(app.includes('PREPAID_TIMEOUT'), 'redemption timeout error missing');
expect(app.includes('getIdToken(true)'), 'fresh staff token missing');
expect(app.includes('不會重複扣次'), 'safe retry explanation missing');
expect(app.includes('button.disabled = false; button.textContent = "使用 1 次並列印"'), 'button recovery missing');
expect(staff.includes('staff-app.js?v=fix47b'), 'staff latest cache bust missing');
expect(sw.includes('7833-fix47b-firebase-region-callable-20261022-1'), 'latest cache missing');

console.log('FIX47A prepaid timeout recovery tests passed');
