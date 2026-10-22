const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const printer = read('js/hardware/receipt-printer.js');
const html = read('index.html');
const sw = read('service-worker.js');

assert(printer.includes('new XMLHttpRequest()'), 'XHR controller transport missing');
assert(printer.includes('http://127.0.0.1:8765/v1'), '127.0.0.1 bridge missing');
assert(printer.includes('http://localhost:8765/v1'), 'localhost bridge fallback missing');
assert(printer.includes('xhr.timeout = API_TIMEOUT_MS'), 'XHR timeout missing');
assert(printer.includes('已嘗試 127.0.0.1 與 localhost'), 'diagnostic fallback message missing');
assert(html.includes('receipt-printer.js?v=7833fix47g'), 'printer cache bust missing');
assert(html.includes('prepaid-print-queue.js?v=7833fix47g'), 'queue cache bust missing');
assert(sw.includes('fix47g-xhr-loopback-recovery'), 'service worker cache bust missing');
console.log('PASS FIX47G XHR loopback recovery');
