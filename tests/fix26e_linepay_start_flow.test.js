"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function makeElement(id) {
    var attributes = {};
    var classes = {};
    return {
        id: id || "",
        className: "",
        innerHTML: "",
        textContent: "",
        style: {},
        listeners: {},
        classList: {
            add: function (name) { classes[name] = true; },
            remove: function (name) { delete classes[name]; },
            contains: function (name) { return !!classes[name]; }
        },
        setAttribute: function (name, value) { attributes[name] = String(value); },
        getAttribute: function (name) { return attributes[name]; },
        addEventListener: function (name, handler) { this.listeners[name] = handler; },
        focus: function () {}
    };
}

async function flushPromises() {
    await new Promise(function (resolve) { setImmediate(resolve); });
}

(async function () {
    var elements = {};
    var storage = {};
    var health = { registered: false, environment: "sandbox", apiVersion: "offline-v4" };
    var callableNames = [];
    var locked = false;
    var childIds = [
        "linePayScanCard",
        "linePayScanTitle",
        "linePayScanAmount",
        "linePayScanMessage",
        "linePayScanProgress",
        "linePayScanCount",
        "linePayScanOrder",
        "linePayScanCancel",
        "linePayScanAction"
    ];
    var document = {
        readyState: "complete",
        getElementById: function (id) { return elements[id] || null; },
        createElement: function () { return makeElement(""); },
        addEventListener: function () {},
        body: {
            appendChild: function (overlay) {
                elements[overlay.id] = overlay;
                childIds.forEach(function (id) { elements[id] = makeElement(id); });
            }
        }
    };
    var context = {
        console: console,
        Date: Date,
        JSON: JSON,
        Math: Math,
        Promise: Promise,
        setTimeout: function (handler) { handler(); return 1; },
        clearTimeout: function () {},
        setInterval: function () { return 2; },
        clearInterval: function () {},
        prompt: function () { return null; },
        alert: function () {},
        localStorage: {
            getItem: function (key) { return storage[key] || null; },
            setItem: function (key, value) { storage[key] = value; },
            removeItem: function (key) { delete storage[key]; }
        },
        document: document,
        MonsterCloud: { uid: "kiosk-anon-user" },
        MonsterPayment: {
            setLocked: function (value) { locked = !!value; }
        },
        firebase: {
            functions: true,
            app: function () {
                return {
                    functions: function () {
                        return {
                            httpsCallable: function (name) {
                                callableNames.push(name);
                                return function () { return Promise.resolve({ data: health }); };
                            }
                        };
                    }
                };
            }
        }
    };
    context.window = context;
    context.window.addEventListener = function () {};

    var source = fs.readFileSync(
        path.resolve(__dirname, "../js/cloud/linepay-scanner.js"),
        "utf8"
    );
    vm.runInNewContext(source, context, { filename: "linepay-scanner.js" });

    context.MonsterLinePayScanner.start({
        orderNo: "LP-FIX26E-1",
        amount: 250,
        originalAmount: 250,
        items: [{ id: "ticket2hGreen", quantity: 1 }]
    });
    assert.strictEqual(locked, true, "按 LINE Pay 後應立即鎖定付款按鈕");
    assert.strictEqual(elements.linePayScanTitle.textContent, "正在準備 LINE Pay");
    await flushPromises();
    assert.ok(callableNames.indexOf("linePayHealth") >= 0, "應呼叫後端健康檢查");
    assert.strictEqual(context.MonsterLinePayScanner._test.getActive().state, "SETUP_REQUIRED");
    assert.strictEqual(elements.linePayScanTitle.textContent, "此點餐機尚未啟用");
    assert.strictEqual(elements.linePayScanAction.textContent, "啟用裝置");

    context.MonsterLinePayScanner._test.setActive(null);
    health = { registered: true, environment: "sandbox", apiVersion: "offline-v4" };
    context.MonsterLinePayScanner.start({
        orderNo: "LP-FIX26E-2",
        amount: 300,
        originalAmount: 300,
        items: [{ id: "ticket3hGreen", quantity: 1 }]
    });
    await flushPromises();
    assert.strictEqual(context.MonsterLinePayScanner._test.getActive().state, "WAITING_SCAN");
    assert.strictEqual(elements.linePayScanTitle.textContent, "請出示 LINE Pay 付款碼");

    console.log("PASS FIX26E LINE Pay start flow: 9 assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
