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
    var attributes = {};
    return {
        id: id,
        classList: classList(active),
        style: {},
        addEventListener: function () {},
        setAttribute: function (name, value) { attributes[name] = String(value); },
        getAttribute: function (name) { return attributes[name] || null; },
        removeAttribute: function (name) { delete attributes[name]; }
    };
}

function verifyInstantNativeStart() {
    var home = element("homePage", true);
    var tickets = element("ticketPage", false);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, tickets];
    var ticketReady = "";
    var unresolvedCatalog = new Promise(function () {});
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
        localStorage: {
            values: {},
            getItem: function (key) { return this.values[key] || null; },
            setItem: function (key, value) { this.values[key] = String(value); }
        }
    };
    context.window = context;
    context.MonsterTicketCatalog = {
        whenReady: function () { return unresolvedCatalog; }
    };
    context.MonsterNativeKiosk = {
        ticketPageReady: function (source) { ticketReady = source; },
        showHome: function () {},
        ticketBackRequested: function () {},
        startBlocked: function () {}
    };

    vm.runInNewContext(read("js/modules/page.js"), context);

    assert.strictEqual(
        context.MonsterKioskRouting.openTicketsFromNative("fix24-test"),
        "TICKET_READY"
    );
    assert.strictEqual(home.classList.contains("active"), false);
    assert.strictEqual(tickets.classList.contains("active"), true);
    assert.strictEqual(ticketReady, "fix24-test");
}

var index = read("index.html");
var page = read("js/modules/page.js");
var catalog = read("js/modules/ticketCatalog.js");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");
var activity = readProject(
    "02_Android_Kiosk124_Native_Route_State/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Kiosk124_Native_Route_State/webkiosk/build.gradle.kts"
);
var installer = readProject("01_INSTALL_KIOSK124_NATIVE_ROUTE_AND_REBOOT.cmd");
var renderStart = catalog.indexOf("function renderTicketCatalog()");
var fallbackCommit = catalog.indexOf("commitTicketCatalog(entries, {})", renderStart);
var preloadStart = catalog.indexOf("Promise.all", renderStart);

assert.ok(index.indexOf("V7.8.3.3 · FIX24 NATIVE ROUTE STATE") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix24") >= 0);
assert.ok(index.indexOf("js/modules/ticketCatalog.js?v=7833fix24") >= 0);
assert.ok(index.indexOf("js/core/enterprise-core.js?v=7833fix24") >= 0);
assert.strictEqual(index.indexOf('id="v7-phase1-badge"'), -1);
assert.ok(enterprise.indexOf('var VERSION = "7.8.3.3"') >= 0);
assert.ok(enterprise.indexOf('var BUILD = "FIX24"') >= 0);
assert.ok(enterprise.indexOf('" · " + BUILD + " · "') >= 0);
assert.ok(fallbackCommit >= 0 && fallbackCommit < preloadStart);
assert.ok(catalog.indexOf('version: "fix24"') >= 0);
assert.ok(page.indexOf('return "TICKET_READY"') >= 0);
assert.ok(activity.indexOf('result == "TICKET_READY"') >= 0);
assert.ok(activity.indexOf("completeNativeRoute(") >= 0);
assert.ok(activity.indexOf("NativeDestination.OPENING_TICKET") >= 0);
assert.ok(activity.indexOf("kiosk=124&home=1&build=fix24") >= 0);
assert.ok(build.indexOf("versionCode = 124") >= 0);
assert.ok(build.indexOf("1.22-sprint11y-kiosk124-native-route-state") >= 0);
assert.ok(worker.indexOf("7833-fix24-native-route-state-20260731-1") >= 0);
assert.ok(installer.indexOf(":webkiosk:installDebug") >= 0);
assert.strictEqual(installer.indexOf(":app:installDebug"), -1);
assert.ok(installer.indexOf("versionCode=113") >= 0);

verifyInstantNativeStart();
console.log("PASS FIX22 preserved instant Start + single version badge: 23 assertions");
