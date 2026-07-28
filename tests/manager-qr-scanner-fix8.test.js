const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const validator = fs.readFileSync(
    path.join(root, "js/staff/ticket-validator.js"),
    "utf8"
);
const css = fs.readFileSync(path.join(root, "css/staff.css"), "utf8");
const staffHtml = fs.readFileSync(path.join(root, "staff.html"), "utf8");
const serviceWorker = fs.readFileSync(
    path.join(root, "service-worker.js"),
    "utf8"
);

test("native and html5 scanners render only their own camera surface", () => {
    assert.match(
        validator,
        /mode==='native'[\s\S]*tvc-scanner-native[\s\S]*tvcVideo[\s\S]*tvc-scanner-html5[\s\S]*tvcScannerReader/
    );
    assert.doesNotMatch(
        validator,
        /<div id="tvcScannerReader"><\/div>'\+\(mode==='native'/
    );
});

test("html5 scanner no longer forces a square camera feed", () => {
    assert.doesNotMatch(validator, /aspectRatio\s*:\s*1/);
    assert.match(
        validator,
        /qrbox:function\(w,h\)\{var s=Math\.floor\(Math\.min\(w,h\)\*0\.72\)/
    );
});

test("scan success provides an unlocked sound and short vibration", () => {
    assert.match(validator, /function prepareScanFeedback\(\)/);
    assert.match(validator, /function playScanSuccessFeedback\(\)/);
    assert.match(
        validator,
        /playScanSuccessFeedback\(\);\s*stopScan\(\)\.then/
    );
    assert.match(validator, /navigator\.vibrate\(55\)/);
});

test("camera preview fills a bounded viewport without the old black spacer", () => {
    assert.match(css, /\.tvc-scanner-viewport\s*\{/);
    assert.match(css, /#tvcScannerReader\s*\{[\s\S]*height:100%!important/);
    assert.match(
        css,
        /#tvcScannerReader video,[\s\S]*object-fit:cover!important/
    );
    assert.doesNotMatch(css, /#tvcScannerReader\{width:100%;min-height:260px/);
});

test("staff and manager roles use the same FIX8 scanner assets", () => {
    assert.match(staffHtml, /css\/staff\.css\?v=7833fix8/);
    assert.match(
        staffHtml,
        /js\/staff\/ticket-validator\.js\?v=7833fix8/
    );
    assert.match(
        serviceWorker,
        /7833-fix12-cash-button-back-recovery-20260729-1/
    );
});
