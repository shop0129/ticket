"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function classList() {
    var values = {};
    return {
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; },
        contains: function (name) { return !!values[name]; }
    };
}

function makeElement(elements, tagName) {
    var attributes = {};
    var inner = "";
    var element = {
        tagName: String(tagName || "div").toUpperCase(),
        id: "",
        style: {},
        className: "",
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
            var match;
            var expression = /id="([^"]+)"/g;
            inner = String(value || "");
            while ((match = expression.exec(inner))) {
                if (!elements[match[1]]) {
                    var child = makeElement(elements, "div");
                    child.id = match[1];
                    elements[child.id] = child;
                }
            }
        }
    });
    return element;
}

function response(status, payload) {
    return {
        ok: status >= 200 && status < 300,
        status: status,
        text: function () {
            return Promise.resolve(JSON.stringify(payload || {}));
        }
    };
}

function createHarness(storedTransaction, responses) {
    var elements = {};
    var storage = {
        monsterCashBridgePairingKeyV1: "12345678"
    };
    var listeners = {};
    var requests = [];
    var locked = false;
    var activePage = { id: "homePage" };
    if (storedTransaction) {
        storage.monsterCashBridgeTransactionV1 =
            JSON.stringify(storedTransaction);
    }
    var document = {
        readyState: "loading",
        head: makeElement(elements, "head"),
        body: makeElement(elements, "body"),
        documentElement: makeElement(elements, "html"),
        createElement: function (tag) {
            return makeElement(elements, tag);
        },
        getElementById: function (id) {
            return elements[id] || null;
        },
        querySelector: function (selector) {
            return selector === ".page.active" ? activePage : null;
        },
        addEventListener: function (type, listener) {
            listeners[type] = listener;
        }
    };
    var sandbox = {
        console: console,
        document: document,
        localStorage: {
            getItem: function (key) {
                return Object.prototype.hasOwnProperty.call(storage, key)
                    ? storage[key]
                    : null;
            },
            setItem: function (key, value) {
                storage[key] = String(value);
            },
            removeItem: function (key) {
                delete storage[key];
            }
        },
        fetch: function (url, options) {
            var next = responses.shift();
            requests.push({ url: url, options: options || {} });
            if (next instanceof Error) return Promise.reject(next);
            if (!next) {
                return Promise.reject(new Error("Unexpected request " + url));
            }
            return Promise.resolve(response(next.status, next.payload));
        },
        MonsterPayment: {
            setLocked: function (value) { locked = !!value; },
            buildContext: function () {
                return {
                    orderNo: "FIX13-NEW-ORDER",
                    amount: 250,
                    purchasePage: "detailPage",
                    createdAt: Date.now(),
                    items: [{ id: "ticket-a" }]
                };
            },
            restoreFailedCashCheckout: function (context, page) {
                activePage = { id: page };
            }
        },
        MonsterReceiptPrinter: {
            getStatus: function () { return Promise.resolve({ ok: true }); }
        },
        salesHistory: [],
        saveSalesHistory: function () {},
        showPage: function (id) { activePage = { id: id }; },
        setTimeout: function () { return 1; },
        clearTimeout: function () {},
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
    return {
        sandbox: sandbox,
        listeners: listeners,
        elements: elements,
        storage: storage,
        requests: requests,
        locked: function () { return locked; },
        page: function () { return activePage.id; }
    };
}

function flush(times) {
    var promise = Promise.resolve();
    var count = times || 10;
    while (count > 0) {
        promise = promise.then(function () { return Promise.resolve(); });
        count -= 1;
    }
    return promise;
}

async function testStaleBootRecordDoesNotLeaveHome() {
    var harness = createHarness({
        state: "REQUESTING",
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 60000,
        lastPaidNtd: 0,
        order: {
            orderNo: "FIX13-STALE-BOOT",
            amount: 250,
            purchasePage: "ticketPage",
            items: [{ id: "ticket-a" }]
        }
    }, [{
        status: 404,
        payload: {
            ok: false,
            code: "ORDER_NOT_FOUND",
            message: "控制器找不到此訂單"
        }
    }]);

    assert.strictEqual(
        harness.sandbox.MonsterCashBridge.hasBlockingTransaction(),
        false,
        "開機對帳完成前不得用舊交易把首頁擋住"
    );
    assert.strictEqual(harness.page(), "homePage");
    harness.listeners.DOMContentLoaded();
    await flush();
    assert.strictEqual(harness.page(), "homePage");
    assert.strictEqual(harness.sandbox.MonsterCashBridge._test.getActive(), null);
    assert.strictEqual(harness.locked(), false);
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            harness.storage,
            "monsterCashBridgeTransactionV1"
        ),
        false,
        "Controller 已找不到的零元交易必須清除"
    );
}

async function testRealControllerTransactionIsRestored() {
    var pendingPayload = {
        ok: true,
        status: "PAYMENT_PENDING",
        orderId: "FIX13-LIVE",
        amountNtd: 250,
        paidNtd: 100,
        remainingNtd: 150,
        billCount: 1,
        coinCount: 0,
        counts: { "100": 1 }
    };
    var harness = createHarness({
        state: "QUEUED",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastPaidNtd: 0,
        order: {
            orderNo: "FIX13-LIVE",
            amount: 250,
            purchasePage: "ticketPage",
            items: [{ id: "ticket-a" }]
        }
    }, [
        { status: 200, payload: pendingPayload },
        { status: 200, payload: pendingPayload }
    ]);

    harness.listeners.DOMContentLoaded();
    await flush(16);
    assert.strictEqual(
        harness.page(),
        "homePage",
        "FIX19 開機恢復收款時保留首頁作為底層，不自動切到票種頁"
    );
    assert.strictEqual(
        harness.sandbox.MonsterCashBridge.hasBlockingTransaction(),
        true,
        "Controller 仍在收款時必須恢復安全鎖"
    );
    assert.strictEqual(harness.locked(), true);
    assert.strictEqual(
        harness.elements.hardwareCashOverlay.style.display,
        "flex"
    );
    assert.strictEqual(harness.elements.hardwareCashPaid.textContent, "NT$100");
}

async function testCashClickReplacesStaleRecordWithNewPayment() {
    var pendingPayload = {
        ok: true,
        status: "PAYMENT_PENDING",
        orderId: "FIX13-NEW-ORDER",
        amountNtd: 250,
        paidNtd: 0,
        remainingNtd: 250,
        billCount: 0,
        coinCount: 0,
        counts: {}
    };
    var harness = createHarness({
        state: "REQUESTING",
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 60000,
        lastPaidNtd: 0,
        order: {
            orderNo: "FIX13-OLD-ORDER",
            amount: 250,
            purchasePage: "ticketPage",
            items: [{ id: "ticket-old" }]
        }
    }, [
        {
            status: 404,
            payload: {
                ok: false,
                code: "ORDER_NOT_FOUND",
                message: "控制器找不到此訂單"
            }
        },
        {
            status: 202,
            payload: {
                ok: true,
                status: "QUEUED",
                orderId: "FIX13-NEW-ORDER"
            }
        },
        { status: 200, payload: pendingPayload }
    ]);

    harness.sandbox.MonsterCashBridge.startCashPayment();
    await flush(24);
    assert.strictEqual(
        harness.requests.some(function (item) {
            return item.options.method === "POST" &&
                /\/v1\/payments$/.test(item.url);
        }),
        true,
        "現金按鈕應在清除舊交易後建立新付款"
    );
    assert.strictEqual(
        harness.sandbox.MonsterCashBridge._test.getActive().order.orderNo,
        "FIX13-NEW-ORDER"
    );
    assert.strictEqual(harness.elements.hardwareCashOverlay.style.display, "flex");
}

(async function () {
    await testStaleBootRecordDoesNotLeaveHome();
    await testRealControllerTransactionIsRestored();
    await testCashClickReplacesStaleRecordWithNewPayment();

    var index = read("index.html");
    var worker = read("service-worker.js");
    assert.ok(index.indexOf("V7.8.3.3 · FIX13 STARTUP + CASH + BACK RECOVERY") >= 0);
    assert.ok(index.indexOf("js/modules/payment.js?v=7833fix13") >= 0);
    assert.ok(index.indexOf("js/hardware/cash-bridge.js?v=7833fix13") >= 0);
    assert.ok(worker.indexOf("7833-fix13-startup-cash-back-recovery-20260729-1") >= 0);

    console.log("PASS FIX13 startup, cash, and back recovery: 18 assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
