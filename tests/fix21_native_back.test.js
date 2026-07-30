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

async function verifyTicketBackUsesNativeChannel() {
    var home = element("homePage", false);
    var tickets = element("ticketPage", true);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, tickets];
    var nativeBackReason = "";
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
    context.MonsterNativeKiosk = {
        ticketBackRequested: function (reason) { nativeBackReason = reason; },
        showHome: function () {},
        ticketPageReady: function () {},
        startBlocked: function () {}
    };

    vm.runInNewContext(read("js/modules/page.js"), context);

    assert.strictEqual(typeof back.listeners.touchend, "function");
    assert.strictEqual(typeof back.listeners.click, "function");
    back.listeners.touchend({
        type: "touchend",
        preventDefault: function () {},
        stopImmediatePropagation: function () {}
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(nativeBackReason, "ticket-page");
    assert.strictEqual(home.classList.contains("active"), true);
    assert.strictEqual(tickets.classList.contains("active"), false);
}

var index = read("index.html");
var page = read("js/modules/page.js");
var worker = read("service-worker.js");
var activity = readProject(
    "02_Android_Kiosk125_LinePay_Input_Unlock/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Kiosk125_LinePay_Input_Unlock/webkiosk/build.gradle.kts"
);
var installer = readProject("01_INSTALL_KIOSK125_LINEPAY_UNLOCK_AND_REBOOT.cmd");

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix25") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix24") >= 0);
assert.ok(page.indexOf("notifyNativeTicketBack") >= 0);
assert.ok(page.indexOf('"touchend", handleTicketBack, true') >= 0);
assert.ok(activity.indexOf("fun ticketBackRequested") >= 0);
assert.ok(activity.indexOf("requestWebHomeAfterNativeBack") >= 0);
assert.ok(activity.indexOf("acceptedEvidence(storedTransaction())") >= 0);
assert.ok(activity.indexOf("HOME_REQUESTED") >= 0);
assert.ok(activity.indexOf("PAYMENT_PRESERVED") >= 0);
assert.ok(build.indexOf("versionCode = 125") >= 0);
assert.ok(build.indexOf("1.23-sprint11z-kiosk125-linepay-input-unlock") >= 0);
assert.ok(installer.indexOf(":webkiosk:installDebug") >= 0);
assert.strictEqual(installer.indexOf(":app:installDebug"), -1);
assert.ok(worker.indexOf("7833-fix25-linepay-input-unlock-20260731-1") >= 0);

verifyTicketBackUsesNativeChannel().then(function () {
    console.log("PASS FIX21 native Back: 19 assertions");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
