const fs = require('fs');
function read(path){ return fs.readFileSync(path,'utf8'); }
function assert(value,message){ if(!value) throw new Error(message); }
const printer = read('js/hardware/receipt-printer.js');
const queue = read('js/cloud/prepaid-print-queue.js');
const html = read('index.html');
const sw = read('service-worker.js');
assert(printer.includes('receiptPair=(\\d{8})'), 'receipt pairing URL import missing');
assert(printer.includes('history.replaceState'), 'pairing URL cleanup missing');
assert(queue.includes('withConnectionTimeout'), 'queue connection timeout missing');
assert(queue.includes('連接收據機並重試'), 'manual pairing recovery missing');
assert(html.includes('receipt-printer.js?v=7833fix47e'), 'printer cache bust missing');
assert(html.includes('prepaid-print-queue.js?v=7833fix47e'), 'queue cache bust missing');
assert(sw.includes('fix47e-receipt-pair-recovery'), 'service worker cache bust missing');
console.log('PASS FIX47E receipt pairing recovery');
