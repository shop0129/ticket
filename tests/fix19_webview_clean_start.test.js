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

function pageElement(id, active) {
    return {
        id: id,
        classList: classList(active),
        style: {},
        addEventListener: function () {},
        setAttribute: function () {},
        getAttribute: function () { return null; },
        removeAttribute: function () {}
    };
}

function verifyBootRecoveryStaysOverHome() {
    var home = pageElement("homePage", false);
    var tickets = pageElement("ticketPage", true);
    var start = pageElement("startBtn", false);
    var back = pageElement("backBtn", false);
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
                return pages.filter(function (item) {
                    return item.classList.contains("active");
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
    context.MonsterCashBridge = {
        hasBlockingTransaction: function () { return true; },
        isStartBlocked: function () { return true; },
        shouldKeepHomeDuringBootRecovery: function () { return true; },
        getPurchasePage: function () { return "ticketPage"; }
    };
    vm.runInNewContext(read("js/modules/page.js"), context);
    assert.strictEqual(context.showPage("homePage"), true);
    assert.strictEqual(home.classList.contains("active"), true);
    assert.strictEqual(tickets.classList.contains("active"), false);
}

var index = read("index.html");
var page = read("js/modules/page.js");
var cash = read("js/hardware/cash-bridge.js");
var worker = read("service-worker.js");
var activity = readProject(
    "02_Android_Kiosk122_Instant_Start/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Kiosk122_Instant_Start/webkiosk/build.gradle.kts"
);
var installer = readProject("01_INSTALL_KIOSK122_INSTANT_START_AND_REBOOT.cmd");
var verifier = readProject("tools/verify_kiosk122_worker.cmd");

assert.ok(index.indexOf("FIX22 INSTANT START") >= 0);
assert.ok(index.indexOf("js/modules/page.js?v=7833fix22") >= 0);
assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix22") >= 0);
assert.ok(worker.indexOf("7833-fix19-webview-clean-start-20260730-1") >= 0);
assert.ok(worker.indexOf("7833-fix22-instant-start-20260731-1") >= 0);

assert.ok(page.indexOf("shouldKeepHomeDuringBootRecovery") >= 0);
assert.ok(cash.indexOf("var bootSessionRecovery = !!active") >= 0);
assert.ok(cash.indexOf("if (bootSessionRecovery && active)") >= 0);
assert.ok(cash.indexOf("shouldKeepHomeDuringBootRecovery: function ()") >= 0);

assert.ok(activity.indexOf("purgeStalePwaStorageBeforeWebView()") >= 0);
assert.ok(
    activity.indexOf("purgeStalePwaStorageBeforeWebView()") <
        activity.indexOf("setContentView(R.layout.activity_kiosk)")
);
assert.ok(activity.indexOf('File(webViewRoot, "Default/Service Worker")') >= 0);
assert.ok(activity.indexOf('File(webViewRoot, "Default/Cache")') >= 0);
assert.ok(activity.indexOf("Local Storage") >= 0);
assert.strictEqual(activity.indexOf("WebStorage.getInstance().deleteAllData()"), -1);
assert.strictEqual(activity.indexOf("localStorage.clear()"), -1);
assert.ok(activity.indexOf("kiosk=122&home=1&build=fix22") >= 0);
assert.ok(build.indexOf("versionCode = 122") >= 0);
assert.ok(build.indexOf("1.20-sprint11w-kiosk122-instant-start") >= 0);

assert.ok(installer.indexOf("versionCode=113") >= 0);
assert.ok(installer.indexOf("versionCode=122") >= 0);
assert.ok(installer.indexOf("pwa_storage_reset_applied") >= 0);
assert.strictEqual(installer.indexOf("pm clear"), -1);
assert.ok(verifier.indexOf("KIOSK122_NATIVE_HOME_READY") >= 0);
assert.ok(verifier.indexOf("pwa_storage_reset_applied") >= 0);

verifyBootRecoveryStaysOverHome();
console.log("PASS FIX19 WebView clean start: 25 assertions");
