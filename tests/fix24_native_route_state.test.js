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

async function verifyRoutes() {
    var home = element("homePage", true);
    var ticket = element("ticketPage", false);
    var admin = element("adminLoginPage", false);
    var start = element("startBtn", false);
    var back = element("backBtn", false);
    var pages = [home, ticket, admin];
    var nativeHomeRequests = [];
    var context = {
        window: {},
        document: {
            getElementById: function (id) {
                return {
                    homePage: home,
                    ticketPage: ticket,
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
        },
        MonsterNativeKiosk: {
            ticketPageReady: function () {},
            startBlocked: function () {},
            homeRequested: function (reason) {
                nativeHomeRequests.push(reason);
            }
        }
    };
    context.window = context;
    context.MonsterCashBridge = {
        hasBlockingTransaction: function () { return false; },
        hasAcceptedPayment: function () { return false; },
        // A zero-cash boot session still blocks a new cash payment, but FIX24
        // lets the customer browse and choose tickets.
        isStartBlocked: function () { return true; },
        blocksTicketBrowsing: function () { return false; },
        requestHomeIfSafe: function () { return Promise.resolve(true); }
    };

    vm.runInNewContext(read("js/modules/page.js"), context);

    start.listeners.click({
        isTrusted: true,
        preventDefault: function () {}
    });
    assert.strictEqual(ticket.classList.contains("active"), true);
    assert.strictEqual(home.classList.contains("active"), false);

    // Native Admin may be requested while an old ticket DOM is underneath the
    // native Home. It must select Admin directly with no ticket route.
    assert.strictEqual(
        context.MonsterKioskRouting.openAdminFromNative("kiosk125-test"),
        "ADMIN_READY"
    );
    assert.strictEqual(admin.classList.contains("active"), true);
    assert.strictEqual(ticket.classList.contains("active"), false);

    await context.returnToKioskHome("admin-login-back");
    await Promise.resolve();
    assert.strictEqual(home.classList.contains("active"), true);
    assert.strictEqual(ticket.classList.contains("active"), false);
    assert.deepStrictEqual(nativeHomeRequests, ["admin-login-back"]);
}

var index = read("index.html");
var cash = read("js/hardware/cash-bridge.js");
var role = read("js/modules/roleManager.js");
var activity = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/src/main/java/" +
    "com/littlemonster/webkiosk/KioskActivity.kt"
);
var build = readProject(
    "02_Android_Controller115_Coin_Reset_Manager/webkiosk/build.gradle.kts"
);

assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(index.indexOf("returnToKioskHome('admin-login-back')") >= 0);
assert.ok(role.indexOf('returnToKioskHome("admin-logout")') >= 0);
assert.ok(cash.indexOf("blocksTicketBrowsing") >= 0);
assert.ok(cash.indexOf("hasAcceptedPayment") >= 0);
assert.ok(activity.indexOf("enum class NativeDestination") >= 0);
assert.ok(activity.indexOf("postVisualStateCallback") >= 0);
assert.ok(activity.indexOf("confirmWebHomeThenShow") >= 0);
assert.ok(activity.indexOf("confirmExplicitHomeSafe") >= 0);
assert.ok(activity.indexOf("NativeDestination.OPENING_TICKET") >= 0);
assert.ok(activity.indexOf("NativeDestination.OPENING_ADMIN") >= 0);
assert.ok(activity.indexOf("kiosk=125&home=1&build=fix25") >= 0);
assert.ok(build.indexOf("versionCode = 125") >= 0);

verifyRoutes().then(function () {
    console.log("PASS FIX24 native-route state: 20 assertions");
}).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
