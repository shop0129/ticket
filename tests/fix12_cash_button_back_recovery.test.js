"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function button() {
    var listeners = {};
    return {
        disabled: false,
        addEventListener: function (type, listener) {
            listeners[type] = listener;
        },
        click: function () {
            if (!this.disabled && listeners.click) listeners.click.call(this, {});
        }
    };
}

function testStalePaymentLockRecovery() {
    var elements = {
        countdownNumber: { innerHTML: "" },
        successTip: { innerHTML: "" },
        linePayBtn: button(),
        cashBtn: button(),
        cartLineBtn: button(),
        cartCashBtn: button()
    };
    var started = 0;
    var resumed = 0;
    var blocking = false;
    var sandbox = {
        console: console,
        window: null,
        document: {
            getElementById: function (id) { return elements[id] || null; },
            querySelector: function () { return { id: "detailPage" }; }
        },
        cart: [],
        selectedTicket: "",
        ticketData: {},
        salesHistory: [],
        playClick: function () {},
        applyPaymentSetting: function () {},
        MonsterCashBridge: {
            hasBlockingTransaction: function () { return blocking; },
            startCashPayment: function () { started += 1; },
            resumeActivePayment: function () { resumed += 1; }
        },
        MonsterLinePayScanner: {
            hasBlockingTransaction: function () { return false; }
        },
        JSON: JSON,
        Object: Object,
        Number: Number,
        String: String,
        Date: Date,
        Math: Math,
        isFinite: isFinite,
        alert: function () {}
    };
    sandbox.window = sandbox;
    vm.runInNewContext(read("js/modules/payment.js"), sandbox, {
        filename: "payment.js"
    });

    sandbox.MonsterPayment.setLocked(true);
    assert.strictEqual(elements.cashBtn.disabled, true);
    sandbox.paymentSuccess("現金");
    assert.strictEqual(started, 1, "stale web-only lock should be cleared and cash should start");
    assert.strictEqual(elements.cashBtn.disabled, false);

    blocking = true;
    sandbox.MonsterPayment.setLocked(true);
    sandbox.paymentSuccess("現金");
    assert.strictEqual(
        started,
        2,
        "a real cash transaction should enter the FIX13 verify-or-resume path"
    );
    assert.strictEqual(
        resumed,
        0,
        "payment.js must not bypass FIX13 controller reconciliation"
    );
}

function classList(initial) {
    var values = {};
    (initial || []).forEach(function (name) { values[name] = true; });
    return {
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; },
        contains: function (name) { return !!values[name]; }
    };
}

function testTicketBackClearsStaleLock() {
    return new Promise(function (resolve, reject) {
        var pages = {
            homePage: { id: "homePage", classList: classList([]) },
            ticketPage: { id: "ticketPage", classList: classList(["active"]) }
        };
        var startButton = button();
        var backButton = button();
        var paymentInProgress = true;
        var sandbox = {
            console: console,
            window: null,
            document: {
                querySelectorAll: function (selector) {
                    return selector === ".page" ? [pages.homePage, pages.ticketPage] : [];
                },
                getElementById: function (id) {
                    if (id === "startBtn") return startButton;
                    if (id === "backBtn") return backButton;
                    return pages[id] || null;
                },
                addEventListener: function () {}
            },
            systemData: { homeTimeout: 999 },
            countdownTimer: null,
            idleTimer: null,
            paymentInProgress: paymentInProgress,
            resetPaymentLock: function () {
                sandbox.paymentInProgress = false;
            },
            MonsterCashBridge: {
                hasBlockingTransaction: function () { return false; }
            },
            MonsterLinePayScanner: {
                hasBlockingTransaction: function () { return false; }
            },
            playClick: function () {},
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            clearInterval: clearInterval
        };
        sandbox.window = sandbox;
        try {
            vm.runInNewContext(read("js/modules/page.js"), sandbox, {
                filename: "page.js"
            });
            backButton.click();
            setTimeout(function () {
                try {
                    assert.strictEqual(sandbox.paymentInProgress, false);
                    assert.strictEqual(pages.homePage.classList.contains("active"), true);
                    assert.strictEqual(pages.ticketPage.classList.contains("active"), false);
                    clearTimeout(sandbox.idleTimer);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 120);
        } catch (error) {
            reject(error);
        }
    });
}

function makeOverlayElement(elements, tagName) {
    var attributes = {};
    var inner = "";
    var element = {
        tagName: String(tagName || "div").toUpperCase(),
        id: "",
        style: {},
        className: "",
        classList: classList([]),
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
            var match;
            var expression = /id="([^"]+)"/g;
            inner = String(value || "");
            while ((match = expression.exec(inner))) {
                if (!elements[match[1]]) {
                    var child = makeOverlayElement(elements, "div");
                    child.id = match[1];
                    elements[child.id] = child;
                }
            }
        }
    });
    return element;
}

function testResumeShowsDetailsBeforeControllerReply() {
    var elements = {};
    var storage = {};
    var locked = false;
    var activePage = { id: "ticketPage" };
    var document = {
        readyState: "loading",
        head: makeOverlayElement(elements, "head"),
        body: makeOverlayElement(elements, "body"),
        documentElement: makeOverlayElement(elements, "html"),
        createElement: function (tag) { return makeOverlayElement(elements, tag); },
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
        fetch: function () {
            return new Promise(function () {});
        },
        MonsterPayment: {
            setLocked: function (value) { locked = !!value; }
        },
        showPage: function (id) { activePage = { id: id }; },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        Promise: Promise,
        Math: Math,
        Date: Date,
        Object: Object,
        Number: Number,
        String: String,
        JSON: JSON,
        encodeURIComponent: encodeURIComponent,
        alert: function () {},
        confirm: function () { return true; },
        prompt: function () { return "12345678"; }
    };
    sandbox.window = sandbox;
    vm.runInNewContext(read("js/hardware/cash-bridge.js"), sandbox, {
        filename: "cash-bridge.js"
    });
    sandbox.MonsterCashBridge._test.setActive({
        state: "REQUESTING",
        lastPaidNtd: 100,
        lastCoinCount: 0,
        lastBillCount: 1,
        lastCounts: { "100": 1 },
        order: {
            orderNo: "FIX12-RECOVER-01",
            amount: 250,
            purchasePage: "ticketPage",
            items: [{ id: "ticket-a", quantity: 1 }]
        }
    });

    assert.strictEqual(sandbox.MonsterCashBridge.resumeActivePayment(), true);
    assert.strictEqual(locked, true);
    assert.strictEqual(elements.hardwareCashOverlay.style.display, "flex");
    assert.strictEqual(elements.hardwareCashPaid.textContent, "NT$100");
    assert.strictEqual(elements.hardwareCashRemaining.textContent, "NT$150");
    assert.strictEqual(elements.hardwareCashBillCount.textContent, "1 張");
    assert.strictEqual(elements.hardwareCashBreakdown.textContent, "投入明細：100元 × 1張");
}

(async function () {
    testStalePaymentLockRecovery();
    await testTicketBackClearsStaleLock();
    testResumeShowsDetailsBeforeControllerReply();

    var index = read("index.html");
    var worker = read("service-worker.js");
    var bridge = read("js/hardware/cash-bridge.js");
    assert.ok(index.indexOf("V7.8.3.3 · FIX13 STARTUP + CASH + BACK RECOVERY") >= 0);
    assert.ok(index.indexOf("js/modules/payment.js?v=7833fix13") >= 0);
    assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix13") >= 0);
    assert.ok(worker.indexOf("7833-fix13-startup-cash-back-recovery-20260729-1") >= 0);
    assert.ok(bridge.indexOf("API_TIMEOUT_MS = 5000") >= 0);
    assert.ok(bridge.indexOf("active.cancelReturnPage") >= 0);

    console.log("PASS FIX12 cash button, overlay recovery, and ticket back: 22 assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
