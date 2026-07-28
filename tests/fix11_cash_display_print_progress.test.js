"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var elements = {};
var storage = {};
var activePage = { id: "ticketPage" };

function classList() {
    var values = {};
    return {
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; },
        contains: function (name) { return !!values[name]; }
    };
}

function makeElement(tagName) {
    var attributes = {};
    var inner = "";
    var element = {
        tagName: String(tagName || "div").toUpperCase(),
        id: "",
        style: {},
        classList: classList(),
        textContent: "",
        disabled: false,
        appendChild: function (child) {
            if (child && child.id) elements[child.id] = child;
            return child;
        },
        addEventListener: function () {},
        setAttribute: function (name, value) {
            attributes[name] = String(value);
            if (name === "id") {
                this.id = String(value);
                elements[this.id] = this;
            }
        },
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(attributes, name)
                ? attributes[name]
                : null;
        }
    };
    Object.defineProperty(element, "innerHTML", {
        get: function () { return inner; },
        set: function (value) {
            inner = String(value || "");
            var match;
            var expression = /id="([^"]+)"/g;
            while ((match = expression.exec(inner))) {
                if (!elements[match[1]]) {
                    var child = makeElement("div");
                    child.id = match[1];
                    elements[child.id] = child;
                }
            }
        }
    });
    return element;
}

var document = {
    readyState: "loading",
    head: makeElement("head"),
    body: makeElement("body"),
    documentElement: makeElement("html"),
    createElement: makeElement,
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function (selector) {
        return selector === ".page.active" ? activePage : null;
    },
    addEventListener: function () {}
};

var sandbox = {
    console: console,
    document: document,
    localStorage: {
        getItem: function (key) {
            return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
        },
        setItem: function (key, value) { storage[key] = String(value); },
        removeItem: function (key) { delete storage[key]; }
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    Math: Math,
    Date: Date,
    Object: Object,
    Number: Number,
    String: String,
    JSON: JSON,
    isFinite: isFinite,
    alert: function () {},
    confirm: function () { return true; },
    prompt: function () { return "23360700"; },
    showPage: function (pageId) { activePage = { id: pageId }; },
    salesHistory: [],
    saveSalesHistory: function () {}
};
sandbox.window = sandbox;

var bridgeSource = fs.readFileSync(
    path.join(root, "js", "hardware", "cash-bridge.js"),
    "utf8"
);
vm.runInNewContext(bridgeSource, sandbox, { filename: "cash-bridge.js" });

sandbox.MonsterCashBridge._test.setActive({
    state: "PAYMENT_PENDING",
    lastCoinCount: 1,
    lastBillCount: 2,
    lastCounts: { "100": 2, "50": 1 },
    order: {
        orderNo: "FIX11-TEST-01",
        amount: 250,
        purchasePage: "ticketPage",
        items: [
            { id: "ticket-a", quantity: 2 },
            { id: "ticket-b", quantity: 1 }
        ]
    }
});
sandbox.MonsterCashBridge._test.showOverlay({
    title: "請投入現金",
    amount: 250,
    paid: 250,
    remaining: 0,
    orderNo: "FIX11-TEST-01",
    coinCount: 1,
    billCount: 2,
    counts: { "100": 2, "50": 1 }
});

assert.strictEqual(elements.hardwareCashOverlay.style.display, "flex");
assert.ok(elements.hardwareCashOverlay.classList.contains("show"));
assert.strictEqual(elements.hardwareCashAmount.textContent, "NT$250");
assert.strictEqual(elements.hardwareCashPaid.textContent, "NT$250");
assert.strictEqual(elements.hardwareCashRemaining.textContent, "NT$0");
assert.strictEqual(elements.hardwareCashTicketCount.textContent, "3 張");
assert.strictEqual(elements.hardwareCashBillCount.textContent, "2 張");
assert.strictEqual(elements.hardwareCashCoinCount.textContent, "1 枚");
assert.strictEqual(
    elements.hardwareCashBreakdown.textContent,
    "投入明細：100元 × 2張、50元 × 1枚"
);
assert.ok(elements.hardwareCashCriticalStyle.textContent.indexOf("2147483000") >= 0);

sandbox.MonsterCashBridge._test.hideOverlay();
assert.strictEqual(elements.hardwareCashOverlay.style.display, "none");

var printSource = fs.readFileSync(
    path.join(root, "js", "modules", "print.js"),
    "utf8"
);
assert.ok(printSource.indexOf("requestAnimationFrame") >= 0);
assert.ok(printSource.indexOf("cubic-bezier(.18,.74,.22,1)") >= 0);
assert.ok(printSource.indexOf("RECEIPT_PROGRESS_MIN_VISIBLE_MS = 1150") >= 0);
assert.ok(printSource.indexOf("finishPhysicalPrintAfterVisibleProgress") >= 0);
assert.ok(printSource.indexOf("setInterval(function () {\n        percent") < 0);

console.log("PASS FIX11 cash display and smooth print progress: 17 assertions");
