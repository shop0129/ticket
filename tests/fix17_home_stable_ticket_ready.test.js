"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var projectRoot = path.resolve(root, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function readProject(relative) {
    return fs.readFileSync(path.join(projectRoot, relative), "utf8");
}

var index = read("index.html");
var page = read("js/modules/page.js");
var cash = read("js/hardware/cash-bridge.js");
var catalog = read("js/modules/ticketCatalog.js");
var worker = read("service-worker.js");
var startHandler = page.slice(
    page.indexOf('.getElementById("startBtn")'),
    page.indexOf('.getElementById("backBtn")')
);
var renderCatalog = catalog.slice(
    catalog.indexOf("function renderTicketCatalog()"),
    catalog.indexOf("function whenTicketCatalogReady()")
);
var activity = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix25") >= 0);
assert.ok(index.indexOf("js/modules/ticketCatalog.js?v=7833fix24") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix24") >= 0);

assert.ok(page.indexOf("isCheckoutStartBlocked") >= 0);
assert.ok(page.indexOf("MonsterCashBridge.isStartBlocked()") >= 0);
assert.ok(page.indexOf("MonsterTicketCatalog.whenReady()") >= 0);
assert.strictEqual(startHandler.indexOf("waitForTicketCatalogReady().then"), -1);
assert.ok(page.indexOf('openTicketsNow("browser-start")') >= 0);

assert.ok(cash.indexOf("bootHomeReleasePending") >= 0);
assert.ok(cash.indexOf("if (!data.preservePage) keepPurchasePageVisible();") >= 0);
assert.ok(cash.indexOf("零元殘留交易只在背景對帳") >= 0);
assert.ok(cash.indexOf("released = showHomeAfterSafeRelease();") >= 0);
assert.ok(cash.indexOf("isStartBlocked: function ()") >= 0);
assert.ok(cash.indexOf("hasAcceptedCashEvidence(active)") >= 0);

assert.ok(catalog.indexOf("preloadTicketImage") >= 0);
assert.ok(catalog.indexOf("Promise.all") >= 0);
assert.ok(
    renderCatalog.indexOf("commitTicketCatalog(entries, {})") <
        renderCatalog.indexOf("Promise.all"),
    "complete fallback catalog must be committed before images settle"
);
assert.ok(catalog.indexOf("TICKET_IMAGE_FALLBACK") >= 0);
assert.ok(catalog.indexOf('version: "fix24"') >= 0);

assert.ok(
    worker.indexOf("7833-fix25-linepay-input-unlock-20260731-1") >= 0
);
assert.ok(activity.indexOf("kiosk=125&home=1&build=fix25") >= 0);
assert.ok(activity.indexOf("else returnHomeOrPreserveActivePayment()") >= 0);
assert.ok(
    activity.indexOf("if(cash||line||acceptedEvidence(transaction))return false;") >= 0
);
assert.ok(
    activity.indexOf("if(transaction&&transaction.state!=='COMPLETED')return false;") < 0,
    "a zero-cash boot record must not prevent the native Home fallback"
);

console.log("PASS FIX17 stable Home + ticket readiness: 24 assertions");
