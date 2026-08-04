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

async function verifyNativeReleaseIsImmediate() {
    var home = element("homePage", true);
    var tickets = element("ticketPage", false);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, tickets];
    var ticketReady = "";
    var homeShown = "";
    var releaseCatalog;
    var catalog = new Promise(function (resolve) { releaseCatalog = resolve; });
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
    context.MonsterNativeKiosk = {
        ticketPageReady: function (source) { ticketReady = source; },
        showHome: function (reason) { homeShown = reason; },
        startBlocked: function () {}
    };

    vm.runInNewContext(read("js/modules/page.js"), context);

    assert.strictEqual(context.showPage("ticketPage"), false);
    assert.strictEqual(home.classList.contains("active"), true);
    assert.strictEqual(
        context.MonsterKioskRouting.openTicketsFromNative("native-test"),
        "TICKET_READY"
    );
    assert.strictEqual(tickets.classList.contains("active"), true);
    assert.strictEqual(ticketReady, "native-test");

    releaseCatalog(true);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(context.showPage("homePage"), true);
    assert.strictEqual(home.classList.contains("active"), true);
    assert.strictEqual(homeShown, "show-page");
}

var index = read("index.html");
var page = read("js/modules/page.js");
var cash = read("js/hardware/cash-bridge.js");
var worker = read("service-worker.js");
var activity = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var layout = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/src/main/res/layout/activity_kiosk.xml"
);
var build = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/build.gradle.kts"
);
var installer = readProject("01_INSTALL_CONTROLLER115_FIX29A_AND_REBOOT.cmd");
var verifier = activity;

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix25") >= 0);
assert.ok(page.indexOf("openTicketsFromNative") >= 0);
assert.ok(page.indexOf("notifyNativeTicketReady") >= 0);
assert.ok(worker.indexOf("7833-fix25-linepay-input-unlock-20260731-1") >= 0);
assert.ok(layout.indexOf('android:id="@+id/kioskHomePanel"') >= 0);
assert.ok(layout.indexOf('android:id="@+id/kioskHomeStart"') >= 0);
assert.ok(layout.indexOf('@drawable/kiosk_home_bg') >= 0);
assert.ok(layout.indexOf('@drawable/kiosk_start_btn') >= 0);
assert.ok(activity.indexOf("MotionEvent.ACTION_DOWN") >= 0);
assert.ok(activity.indexOf("MotionEvent.ACTION_UP") >= 0);
assert.ok(activity.indexOf("NATIVE_TOUCH_ARM_MS = 500L") >= 0);
assert.ok(activity.indexOf("NATIVE_TOUCH_MIN_MS = 0L") >= 0);
assert.ok(activity.indexOf("ticketPageReady") >= 0);
assert.ok(activity.indexOf("activePaymentReady") >= 0);
assert.ok(cash.indexOf("MonsterNativeKiosk.activePaymentReady") >= 0);
assert.ok(activity.indexOf("mainFrameLoaded = false") >= 0);
assert.ok(build.indexOf("versionCode = 125") >= 0);
assert.ok(installer.indexOf(":app:installDebug") >= 0);
assert.strictEqual(installer.indexOf(":webkiosk:installDebug"), -1);
assert.ok(verifier.indexOf("KIOSK125_NATIVE_HOME_READY") >= 0);
assert.ok(verifier.indexOf("native_home_visible") >= 0);

verifyNativeReleaseIsImmediate().then(function () {
    console.log("PASS FIX20 native Home gate: 31 assertions");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
