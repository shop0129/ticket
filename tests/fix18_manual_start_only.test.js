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

function classList(initial) {
    var values = initial || [];
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
        classList: classList(active ? ["active"] : []),
        style: {},
        addEventListener: function (name, handler) {
            listeners[name] = handler;
        },
        setAttribute: function (name, value) {
            attributes[name] = String(value);
        },
        getAttribute: function (name) {
            return attributes[name] || null;
        },
        removeAttribute: function (name) {
            delete attributes[name];
        },
        listeners: listeners
    };
}

async function runBehaviorTest() {
    var now = 100000;
    var home = element("homePage", true);
    var tickets = element("ticketPage", false);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, tickets];
    var context = {
        window: {},
        document: {
            getElementById: function (id) {
                return {
                    homePage: home,
                    ticketPage: tickets,
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
        Date: { now: function () { return now; } },
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
        whenReady: function () { return Promise.resolve(true); }
    };

    vm.runInNewContext(read("js/modules/page.js"), context);
    now += 2000;

    assert.strictEqual(context.showPage("ticketPage"), false);
    assert.strictEqual(home.classList.contains("active"), true);

    start.listeners.click({
        isTrusted: false,
        preventDefault: function () {}
    });
    await Promise.resolve();
    assert.strictEqual(home.classList.contains("active"), true);

    start.listeners.click({
        isTrusted: true,
        preventDefault: function () {}
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(tickets.classList.contains("active"), true);
}

var index = read("index.html");
var page = read("js/modules/page.js");
var cash = read("js/hardware/cash-bridge.js");
var worker = read("service-worker.js");
var activity = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/build.gradle.kts"
);
var installer = readProject("01_INSTALL_CONTROLLER115_FIX29A_AND_REBOOT.cmd");

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix25") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix24") >= 0);
assert.ok(index.indexOf("data-fix18-manual-start") >= 0);
assert.ok(page.indexOf("event.isTrusted !== true") >= 0);
assert.ok(page.indexOf("ticketEntryPermit") >= 0);
assert.ok(page.indexOf("permitTicketPageForManualStart") >= 0);
assert.ok(page.indexOf("TICKET_ENTRY_BLOCKED") >= 0);
assert.ok(page.indexOf('version: "fix25"') >= 0);
assert.ok(cash.indexOf("首頁已顯示時，零投入的背景恢復不得把客人推進票種頁") >= 0);
assert.ok(worker.indexOf("7833-fix18-manual-start-only-20260730-1") >= 0);
assert.ok(activity.indexOf("kiosk=125&home=1&build=fix25") >= 0);
assert.ok(activity.indexOf("markNativeHomeReady('kiosk125')") >= 0);
assert.ok(activity.indexOf("NATIVE_HOME_RELEASE_GUARD_MS = 400L") >= 0);
assert.ok(build.indexOf("versionCode = 125") >= 0);
assert.ok(build.indexOf("1.23-sprint11z-kiosk125-linepay-input-unlock") >= 0);
assert.ok(installer.indexOf("versionCode=115") >= 0);
assert.ok(installer.indexOf("versionCode=125") >= 0);

runBehaviorTest().then(function () {
    console.log("PASS FIX18 manual Start-only routing: 18 assertions");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
