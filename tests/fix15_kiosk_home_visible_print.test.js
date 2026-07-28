"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

var index = read("index.html");
var page = read("js/modules/page.js");
var cash = read("js/hardware/cash-bridge.js");
var print = read("js/modules/print.js");
var css = read("css/style.css");
var worker = read("service-worker.js");

assert.ok(index.indexOf("V7.8.3.3 · FIX15 KIOSK HOME + VISIBLE PRINT") >= 0);
assert.ok(index.indexOf("data-fix15-back-guard") >= 0);
assert.ok(index.indexOf("receiptProgressSteps") >= 0);
assert.ok(page.indexOf("MonsterKioskRouting") >= 0);
assert.ok(page.indexOf('requestKioskHome("ticket-back")') >= 0);
assert.ok(cash.indexOf("requestHomeIfSafe") >= 0);
assert.ok(cash.indexOf("hasAcceptedCashEvidence(active)") >= 0);
assert.ok(cash.indexOf("verifyStoredTransaction()") >= 0);
assert.ok(print.indexOf("waitForReceiptProgressPaint") >= 0);
assert.ok(print.indexOf("activeReceiptProgressTimer = setInterval") >= 0);
assert.ok(print.indexOf("RECEIPT_PROGRESS_LIMIT = 94") >= 0);
assert.ok(css.indexOf("monsterReceiptProgressRamp") >= 0);
assert.ok(css.indexOf("receipt-progress-text-running") >= 0);
assert.ok(worker.indexOf("7833-fix15-kiosk-home-visible-print-20260729-1") >= 0);

console.log("PASS FIX15 kiosk home + visible print: 14 assertions");
