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
    "02_Android_Kiosk118_Manual_Start_Only/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);

assert.ok(index.indexOf("FIX18 MANUAL START ONLY") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix18") >= 0);
assert.ok(index.indexOf("js/modules/ticketCatalog.js?v=7833fix17") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix18") >= 0);

assert.ok(page.indexOf("isCheckoutStartBlocked") >= 0);
assert.ok(page.indexOf("MonsterCashBridge.isStartBlocked()") >= 0);
assert.ok(page.indexOf("MonsterTicketCatalog.whenReady()") >= 0);
assert.ok(
    startHandler.indexOf("waitForTicketCatalogReady().then") <
        startHandler.indexOf('showPage("ticketPage")'),
    "ticket page must wait for the catalog readiness gate"
);

assert.ok(cash.indexOf("bootHomeReleasePending") >= 0);
assert.ok(cash.indexOf("if (!data.preservePage) keepPurchasePageVisible();") >= 0);
assert.ok(cash.indexOf("零元殘留交易只在背景對帳") >= 0);
assert.ok(cash.indexOf("released = showHomeAfterSafeRelease();") >= 0);
assert.ok(cash.indexOf("isStartBlocked: function ()") >= 0);
assert.ok(cash.indexOf("hasAcceptedCashEvidence(active)") >= 0);

assert.ok(catalog.indexOf("preloadTicketImage") >= 0);
assert.ok(catalog.indexOf("Promise.all") >= 0);
assert.ok(
    renderCatalog.indexOf("commitTicketCatalog(entries, readyImages)") >
        renderCatalog.indexOf("Promise.all"),
    "catalog DOM must be committed only after images settle"
);
assert.ok(catalog.indexOf("TICKET_IMAGE_FALLBACK") >= 0);
assert.ok(catalog.indexOf('version: "fix17"') >= 0);

assert.ok(
    worker.indexOf("7833-fix18-manual-start-only-20260730-1") >= 0
);
assert.ok(activity.indexOf("kiosk=118&home=1&build=fix18") >= 0);
assert.ok(activity.indexOf("else returnHomeOrPreserveActivePayment()") >= 0);
assert.ok(
    activity.indexOf("if(cash||line||acceptedEvidence(transaction))return false;") >= 0
);
assert.ok(
    activity.indexOf("if(transaction&&transaction.state!=='COMPLETED')return false;") < 0,
    "a zero-cash boot record must not prevent the native Home fallback"
);

console.log("PASS FIX17 stable Home + ticket readiness: 24 assertions");
