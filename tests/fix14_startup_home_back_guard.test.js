"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
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

function makeClassList() {
    return {
        add: function () {},
        remove: function () {},
        contains: function () { return false; }
    };
}

function makeElement(elements) {
    var inner = "";
    var element = {
        id: "",
        style: {},
        classList: makeClassList(),
        textContent: "",
        disabled: false,
        appendChild: function (child) {
            if (child && child.id) elements[child.id] = child;
            return child;
        },
        addEventListener: function () {},
        setAttribute: function (name, value) {
            if (name === "id") {
                this.id = String(value);
                elements[this.id] = this;
            }
        },
        getAttribute: function () { return null; }
    };
    Object.defineProperty(element, "innerHTML", {
        get: function () { return inner; },
        set: function (value) {
            var match;
            var pattern = /id="([^"]+)"/g;
            inner = String(value || "");
            while ((match = pattern.exec(inner))) {
                if (!elements[match[1]]) {
                    var child = makeElement(elements);
                    child.id = match[1];
                    elements[child.id] = child;
                }
            }
        }
    });
    return element;
}

async function flush(count) {
    var remaining = count || 24;
    while (remaining > 0) {
        await Promise.resolve();
        remaining -= 1;
    }
}

async function zeroCashBootTransactionIsCanceled() {
    var listeners = {};
    var elements = {};
    var requests = [];
    var storage = {
        monsterCashBridgePairingKeyV1: "12345678",
        monsterCashBridgeTransactionV1: JSON.stringify({
            state: "QUEUED",
            requestId: "WEB-FIX14-ZERO",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastPaidNtd: 0,
            order: {
                orderNo: "FIX14-ZERO",
                amount: 250,
                purchasePage: "ticketPage",
                items: [{ id: "ticket-a" }]
            }
        })
    };
    var replies = [
        {
            status: 200,
            payload: {
                ok: true,
                status: "PAYMENT_PENDING",
                orderId: "FIX14-ZERO",
                amountNtd: 250,
                paidNtd: 0,
                remainingNtd: 250
            }
        },
        {
            status: 202,
            payload: {
                ok: true,
                status: "CANCEL_REQUESTED",
                orderId: "FIX14-ZERO",
                paidNtd: 0
            }
        },
        {
            status: 200,
            payload: {
                ok: true,
                status: "CANCELED",
                orderId: "FIX14-ZERO",
                paidNtd: 0
            }
        }
    ];
    var activePage = "homePage";
    var document = {
        readyState: "loading",
        head: makeElement(elements),
        body: makeElement(elements),
        documentElement: makeElement(elements),
        createElement: function () { return makeElement(elements); },
        getElementById: function (id) { return elements[id] || null; },
        querySelector: function () { return { id: activePage }; },
        addEventListener: function (type, listener) { listeners[type] = listener; }
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
            setItem: function (key, value) { storage[key] = String(value); },
            removeItem: function (key) { delete storage[key]; }
        },
        fetch: function (url, options) {
            var reply = replies.shift();
            requests.push({ url: url, options: options || {} });
            if (!reply) return Promise.reject(new Error("Unexpected request " + url));
            return Promise.resolve(response(reply.status, reply.payload));
        },
        MonsterPayment: {
            setLocked: function () {},
            restoreFailedCashCheckout: function (context, page) {
                activePage = page;
            }
        },
        salesHistory: [],
        saveSalesHistory: function () {},
        showPage: function (page) { activePage = page; },
        setTimeout: function (callback, delay) {
            if (delay === 500) Promise.resolve().then(callback);
            return 1;
        },
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

    listeners.DOMContentLoaded();
    await flush(40);

    assert.strictEqual(activePage, "homePage");
    assert.strictEqual(sandbox.MonsterCashBridge._test.getActive(), null);
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(storage, "monsterCashBridgeTransactionV1"),
        false
    );
    assert.strictEqual(
        requests.some(function (item) {
            return item.options.method === "POST" &&
                /\/payments\/FIX14-ZERO\/cancel$/.test(item.url);
        }),
        true,
        "boot recovery must ask Controller 113 to cancel a zero-cash stale order"
    );
}

function paidTransactionStillBlocks() {
    var source = read("js/hardware/cash-bridge.js");
    assert.ok(source.indexOf("CASH_ALREADY_ACCEPTED") >= 0);
    assert.ok(source.indexOf("if (!isZeroCashCancelableStatus(payload))") >= 0);
    assert.ok(source.indexOf("已收現金就拒絕取消") === -1);
}

function currentFilesCarryFix14Guard() {
    var index = read("index.html");
    var page = read("js/modules/page.js");
    var worker = read("service-worker.js");
    assert.ok(index.indexOf("V7.8.3.3 · FIX14 STARTUP HOME + BACK GUARD") >= 0);
    assert.ok(index.indexOf("data-fix14-back-guard") >= 0);
    assert.ok(index.indexOf("event.stopImmediatePropagation()") >= 0);
    assert.ok(index.indexOf("activateWaitingWorker") >= 0);
    assert.ok(page.indexOf("forceHomePageIfSafe") >= 0);
    assert.ok(worker.indexOf("7833-fix14-startup-home-back-guard-20260729-1") >= 0);
}

(async function () {
    await zeroCashBootTransactionIsCanceled();
    paidTransactionStillBlocks();
    currentFilesCarryFix14Guard();
    console.log("PASS FIX14 startup home and back guard: 12 assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
