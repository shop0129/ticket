"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var projectRoot = path.resolve(root, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function readProject(relative) {
    return fs.readFileSync(path.join(projectRoot, relative), "utf8");
}

function classList(active) {
    var values = active ? ["active"] : [];
    return {
        add: function (value) {
            if (values.indexOf(value) < 0) values.push(value);
        },
        remove: function (value) {
            values = values.filter(function (item) { return item !== value; });
        },
        contains: function (value) {
            return values.indexOf(value) >= 0;
        }
    };
}

function element(id, active) {
    var listeners = {};
    var attributes = {};
    return {
        id: id,
        classList: classList(active),
        style: {},
        addEventListener: function (name, handler) { listeners[name] = handler; },
        setAttribute: function (name, value) { attributes[name] = String(value); },
        getAttribute: function (name) { return attributes[name] || null; },
        removeAttribute: function (name) { delete attributes[name]; },
        listeners: listeners
    };
}

async function verifySingleActionRouting() {
    var home = element("homePage", true);
    var tickets = element("ticketPage", false);
    var admin = element("adminLoginPage", false);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, tickets, admin];
    var releaseCatalog;
    var releaseStartupHome;
    var catalog = new Promise(function (resolve) { releaseCatalog = resolve; });
    var startupHome = new Promise(function (resolve) { releaseStartupHome = resolve; });
    var context = {
        window: {},
        document: {
            getElementById: function (id) {
                return {
                    homePage: home,
                    ticketPage: tickets,
                    adminLoginPage: admin,
                    startBtn: start,
                    backBtn: back
                }[id] || null;
            },
            querySelectorAll: function (selector) {
                return selector === ".page" ? pages : [];
            },
            querySelector: function (selector) {
                if (selector !== ".page.active") return null;
                return pages.filter(function (page) {
                    return page.classList.contains("active");
                })[0] || null;
            },
            addEventListener: function () {}
        },
        Date: Date,
        Promise: Promise,
        setTimeout: function () { return 1; },
        clearTimeout: function () {},
        clearInterval: function () {},
        countdownTimer: null,
        idleTimer: null,
        systemData: { homeTimeout: 60 },
        paymentInProgress: false,
        playClick: function () {},
        alert: function () {},
        localStorage: {
            values: {},
            getItem: function (key) { return this.values[key] || null; },
            setItem: function (key, value) { this.values[key] = String(value); }
        }
    };
    context.window = context;
    context.MonsterTicketCatalog = {
        whenReady: function () { return catalog; }
    };
    context.MonsterCashBridge = {
        hasBlockingTransaction: function () { return false; },
        isStartBlocked: function () { return false; },
        requestHomeIfSafe: function () { return startupHome; }
    };

    vm.runInNewContext(read("js/modules/page.js"), context);
    context.MonsterKioskRouting.requestHome("startup-guard");

    start.listeners.click({
        isTrusted: true,
        preventDefault: function () {}
    });
    assert.strictEqual(tickets.classList.contains("active"), true);
    assert.strictEqual(home.classList.contains("active"), false);

    releaseStartupHome(true);
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(tickets.classList.contains("active"), true);
    assert.strictEqual(home.classList.contains("active"), false);

    context.showPage("homePage");
    context.openAdminLoginFromHome({
        preventDefault: function () {}
    });
    assert.strictEqual(admin.classList.contains("active"), true);
    assert.strictEqual(tickets.classList.contains("active"), false);

    releaseCatalog(true);
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(admin.classList.contains("active"), true);
    assert.strictEqual(tickets.classList.contains("active"), false);
}

var index = read("index.html");
var page = read("js/modules/page.js");
var worker = read("service-worker.js");
var enterprise = read("js/core/enterprise-core.js");
var activity = readProject(
    "02_Android_Kiosk125_LinePay_Input_Unlock/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Kiosk125_LinePay_Input_Unlock/webkiosk/build.gradle.kts"
);

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("openAdminLoginFromHome(event)") >= 0);
assert.ok(index.indexOf("setTimeout(forceHomeIfSafe, 1200)") < 0);
assert.ok(page.indexOf('openTicketsNow("browser-start")') >= 0);
assert.ok(page.indexOf('cancelTicketEntryRequest("admin")') >= 0);
assert.ok(page.indexOf('cancelPendingHomeRoute("start")') >= 0);
assert.ok(page.indexOf("waitForTicketCatalogReady().then") < 0);
assert.ok(page.indexOf('version: "fix25"') >= 0);
assert.ok(enterprise.indexOf('var BUILD = "FIX24"') >= 0);
assert.ok(worker.indexOf("7833-fix25-linepay-input-unlock-20260731-1") >= 0);
assert.ok(activity.indexOf("kiosk=125&home=1&build=fix25") >= 0);
assert.ok(activity.indexOf("NATIVE_TOUCH_ARM_MS = 500L") >= 0);
assert.ok(activity.indexOf("NATIVE_TOUCH_MIN_MS = 0L") >= 0);
assert.ok(build.indexOf("versionCode = 125") >= 0);

verifySingleActionRouting().then(function () {
    console.log("PASS FIX24 native-route-state routing: 22 assertions");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
