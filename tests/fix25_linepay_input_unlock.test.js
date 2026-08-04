"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(
    path.join(root, "js/cloud/linepay-scanner.js"),
    "utf8"
);
var activeKey = "monsterLinePayScannerTransactionV1";
var listeners = {};
var documentListeners = {};
var storage = {};
var overlayVisible = true;
var overlay = {
    classList: {
        contains: function (name) {
            return name === "show" && overlayVisible;
        },
        add: function (name) {
            if (name === "show") overlayVisible = true;
        },
        remove: function (name) {
            if (name === "show") overlayVisible = false;
        }
    }
};
var context = {
    console: console,
    Date: Date,
    JSON: JSON,
    Math: Math,
    Promise: Promise,
    paymentInProgress: true,
    setTimeout: function () { return 1; },
    clearTimeout: function () {},
    setInterval: function () { return 2; },
    clearInterval: function () {},
    localStorage: {
        getItem: function (key) { return storage[key] || null; },
        setItem: function (key, value) { storage[key] = String(value); },
        removeItem: function (key) { delete storage[key]; }
    },
    document: {
        readyState: "loading",
        getElementById: function (id) {
            return id === "linePayScanOverlay" ? overlay : null;
        },
        createElement: function () {
            return {
                className: "",
                innerHTML: "",
                setAttribute: function () {},
                addEventListener: function () {}
            };
        },
        addEventListener: function (type, handler) {
            documentListeners[type] = handler;
        },
        body: { appendChild: function () {} }
    }
};

storage[activeKey] = JSON.stringify({
    state: "WAITING_SCAN",
    order: { orderNo: "OLD-NO-PAYMENT", amount: 300 },
    createdAt: 1,
    updatedAt: 1,
    submittedAt: 1
});
context.window = context;
context.window.addEventListener = function (type, handler) {
    listeners[type] = handler;
};

vm.runInNewContext(source, context, { filename: "linepay-scanner.js" });

assert.strictEqual(typeof documentListeners.DOMContentLoaded, "function");
documentListeners.DOMContentLoaded();
assert.strictEqual(
    context.MonsterLinePayScanner.hasBlockingTransaction(),
    false,
    "未掃碼的舊等待狀態不得阻擋開始購票或返回首頁"
);
assert.strictEqual(storage[activeKey], undefined);
assert.strictEqual(context.paymentInProgress, false);

context.MonsterLinePayScanner._test.setActive({
    state: "WAITING_SCAN",
    order: { orderNo: "CURRENT-SCAN", amount: 300 }
});
overlayVisible = true;
var preventedOnInput = 0;
listeners.keydown({
    key: "1",
    which: 49,
    keyCode: 49,
    target: { tagName: "INPUT", isContentEditable: false },
    preventDefault: function () { preventedOnInput += 1; }
});
assert.strictEqual(
    preventedOnInput,
    0,
    "登入密碼欄的數字鍵必須交給 input，不得被掃描器吃掉"
);

var preventedOnScanner = 0;
listeners.keydown({
    key: "1",
    which: 49,
    keyCode: 49,
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault: function () { preventedOnScanner += 1; }
});
assert.strictEqual(
    preventedOnScanner,
    1,
    "LINE Pay 掃描畫面顯示時仍須接收 USB HID 掃描碼"
);

overlayVisible = false;
var preventedWhenHidden = 0;
listeners.keydown({
    key: "2",
    which: 50,
    keyCode: 50,
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault: function () { preventedWhenHidden += 1; }
});
assert.strictEqual(
    preventedWhenHidden,
    0,
    "掃描遮罩未顯示時不得攔截全頁數字"
);

context.MonsterLinePayScanner._test.setActive({
    state: "CHECKING",
    submittedAt: 100,
    order: { orderNo: "PAYMENT-CHECK", amount: 300 }
});
assert.strictEqual(
    context.MonsterLinePayScanner.hasBlockingTransaction(),
    true,
    "已送出付款碼並查帳中的交易必須繼續保護"
);
assert.strictEqual(
    context.MonsterLinePayScanner.clearUnfundedTransaction("test"),
    false,
    "查帳中的交易不得被安全清除功能刪除"
);

var index = fs.readFileSync(path.join(root, "index.html"), "utf8");
var activity = fs.readFileSync(
    path.join(
        root,
        "..",
        "02_Android_Controller115_Coin_Reset_Manager",
        "webkiosk",
        "src",
        "main",
        "java",
        "com",
        "littlemonster",
        "webkiosk",
        "KioskActivity.kt"
    ),
    "utf8"
);
assert.ok(index.indexOf("FIX25 LINEPAY INPUT UNLOCK") >= 0);
assert.ok(/id="adminLoginPassword"[\s\S]*?inputmode="numeric"/.test(index));
assert.ok(activity.indexOf("kioskHomePanel.isClickable = false") >= 0);
assert.ok(activity.indexOf("webView.requestFocus(View.FOCUS_DOWN)") >= 0);
assert.ok(activity.indexOf("kiosk125-startup") >= 0);

console.log("PASS FIX25 LINE Pay/input unlock: 15 assertions");
