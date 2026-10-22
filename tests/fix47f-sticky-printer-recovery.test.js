const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const queue = read('js/cloud/prepaid-print-queue.js');
const html = read('index.html');
const sw = read('service-worker.js');

function assert(value, message) {
  if (!value) throw new Error(message);
}

assert(queue.includes('var connectionErrorLocked = false'), 'connection error lock missing');
assert(queue.includes('if (connectionErrorLocked) return Promise.resolve(false)'), 'poll overwrite guard missing');
assert(queue.includes('connectionErrorLocked = true;\n            showStatus("預存收據等待列印：'), 'timeout must lock recovery message');
assert(queue.includes('connectionErrorLocked = false;\n        MonsterReceiptPrinter.clearPairing()'), 'manual reconnect must unlock before prompt');
assert(html.includes('receipt-printer.js?v=7833fix47f'), 'printer cache bust missing');
assert(html.includes('prepaid-print-queue.js?v=7833fix47f'), 'queue cache bust missing');
assert(sw.includes('fix47f-sticky-printer-recovery'), 'service worker cache bust missing');
console.log('PASS FIX47F sticky printer recovery');
