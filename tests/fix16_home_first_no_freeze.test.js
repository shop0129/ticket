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
var worker = read("service-worker.js");

assert.ok(
    /id="homePage"\s+class="page active"/.test(index),
    "Home must be the static first paint"
);
assert.ok(index.indexOf("FIX16 HOME FIRST + NO FREEZE") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix16") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix16") >= 0);
assert.ok(page.indexOf("home-first handshake") >= 0);
assert.ok(cash.indexOf("isPairingReady") >= 0);
assert.ok(cash.indexOf("recoverWhenBridgeReady") >= 0);
assert.ok(cash.indexOf("BOOT_PAIRING_POLL_MS") >= 0);
assert.ok(cash.indexOf("BOOT_RECOVERY_RETRY_DELAYS_MS") >= 0);
assert.ok(cash.indexOf("scheduleBootRecoveryRetry") >= 0);
assert.ok(cash.indexOf('result === "retry"') >= 0);
assert.ok(cash.indexOf('OVERLAY_FIX_VERSION = "fix16"') >= 0);
assert.ok(
    worker.indexOf("7833-fix16-home-first-no-freeze-20260729-1") >= 0
);

console.log("PASS FIX16 home-first/no-freeze: 13 assertions");
