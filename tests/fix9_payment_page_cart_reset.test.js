"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var checks = 0;

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function ok(value, message) {
    assert.ok(value, message);
    checks += 1;
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    checks += 1;
}

var page = read("js/modules/page.js");
ok(page.indexOf("hasBlockingCheckoutTransaction") >= 0, "idle navigation has a checkout guard");
ok(page.indexOf("window.MonsterCashBridge.hasBlockingTransaction()") >= 0, "cash transaction blocks home timeout");
ok(page.indexOf("resetIdleTimer();") >= 0, "busy checkout rearms the idle timer");

var payment = read("js/modules/payment.js");
ok(payment.indexOf('activePage.id === "detailPage"') >= 0, "direct purchase page is captured");
ok(payment.indexOf("purchasePage: purchasePage") >= 0, "purchase page is stored in payment context");
ok(payment.indexOf("restoreFailedCashCheckout") >= 0, "failed cash payment restores checkout UI");

var bridge = read("js/hardware/cash-bridge.js");
ok(bridge.indexOf("keepPurchasePageVisible") >= 0, "cash overlay keeps the purchase page visible");
ok(bridge.indexOf("getPurchasePage: purchasePage") >= 0, "page guard can resolve the active purchase page");
ok(bridge.indexOf("restoreFailedCashCheckout(checkout)") >= 0, "canceled zero-cash order refreshes checkout");

var index = read("index.html");
ok(index.indexOf("V7.8.3.3 FIX9 Payment Page + Cart Reset") >= 0, "FIX9 version is exposed");
ok(index.indexOf("js/modules/page.js?v=7833fix9") >= 0, "page guard cache key is bumped");
ok(index.indexOf("js/modules/consumePoints.js?v=7833fix9") >= 0, "cart total cache key is bumped");
ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix9") >= 0, "cash bridge cache key is bumped");

var cartPrice = { innerHTML: "" };
var buttons = {
    cartLineBtn: { textContent: "" },
    cartCashBtn: { textContent: "" },
    linePayBtn: { textContent: "" },
    cashBtn: { textContent: "" }
};
global.window = global;
global.cart = [];
global.selectedTicket = "powerbank";
global.ticketData = { powerbank: { price: 50 } };
global.currentMember = null;
global.localStorage = {
    getItem: function () { return null; },
    setItem: function () {}
};
global.CustomEvent = function (type, options) {
    this.type = type;
    this.detail = options && options.detail;
};
global.document = {
    activeElement: null,
    querySelectorAll: function () { return []; },
    querySelector: function (selector) {
        return selector === "#cartAmount .cartTotalPrice" ? cartPrice : null;
    },
    getElementById: function (id) { return buttons[id] || null; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
global.dispatchEvent = function () {};

vm.runInThisContext(read("js/modules/consumePoints.js"), {
    filename: "consumePoints.js"
});

ConsumePoints.render();
equal(cartPrice.innerHTML, "NT$0", "empty cart never inherits the previous selected ticket price");
equal(buttons.cartCashBtn.textContent, "現金付款", "empty cart cash button has no stale amount");

cart = [{ price: 40 }];
ConsumePoints.render();
equal(cartPrice.innerHTML, "NT$40", "cart total updates from actual cart contents");

console.log("PASS FIX9 payment page/cart reset: " + checks + " checks");
