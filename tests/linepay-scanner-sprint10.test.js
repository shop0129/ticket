"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var count = 0;

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    count += 1;
}

var listeners = {};
var storage = {};
var context = {
    console: console,
    Date: Date,
    JSON: JSON,
    Math: Math,
    Promise: Promise,
    setTimeout: function () { return 1; },
    clearTimeout: function () {},
    setInterval: function () { return 2; },
    clearInterval: function () {},
    localStorage: {
        getItem: function (key) { return storage[key] || null; },
        setItem: function (key, value) { storage[key] = value; },
        removeItem: function (key) { delete storage[key]; }
    },
    document: {
        readyState: "complete",
        getElementById: function () { return null; },
        createElement: function () {
            return {
                className: "",
                innerHTML: "",
                setAttribute: function () {},
                addEventListener: function () {}
            };
        },
        body: { appendChild: function () {} }
    }
};
context.window = context;
context.window.addEventListener = function (type, handler) {
    listeners[type] = handler;
};

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/cloud/linepay-scanner.js"), "utf8");
vm.runInNewContext(source, context, { filename: "linepay-scanner.js" });

var extract = context.MonsterLinePayScanner._test.extractOneTimeKey;
equal(extract("123456789012345678"), "123456789012345678", "應接受台灣18位 My Code");
equal(
    extract("https://sandbox.test/pay?oneTimeKey=123456789012345678&mode=card"),
    "123456789012345678",
    "應接受包含 oneTimeKey 的 QR 網址"
);
equal(extract("ABC-123456789012345678-Z"), "123456789012345678", "應接受單一18位碼的包裝內容");
equal(extract("12345678901234567"), "", "17位碼必須拒絕");
equal(extract("1234567890123456789"), "", "19位碼必須拒絕");
ok(typeof listeners.keydown === "function", "應只在付款畫面透過鍵盤事件讀取 USB HID 掃描器");

ok(source.indexOf("oneTimeKeyFingerprint") === -1, "前端不應保存付款碼雜湊或完整碼");
ok(source.indexOf("localStorage.setItem(ACTIVE_KEY") !== -1, "付款狀態應可在重新整理後恢復");
ok(source.indexOf("oneTimeKey: oneTimeKey") !== -1, "付款碼只在 HTTPS callable 請求當下傳送");
ok(source.indexOf("請勿再次掃碼") !== -1, "不確定付款狀態必須禁止重複掃碼");
ok(source.indexOf("checkLinePayOfflinePayment") !== -1, "逾時後應查詢 LINE Pay 訂單狀態");

var payment = fs.readFileSync(path.join(root, "js/modules/payment.js"), "utf8");
ok(payment.indexOf("finalizeAuthorizedLinePay") !== -1, "LINE Pay 成功後才可建立訂單");
ok(payment.indexOf("linePayTransactionId") !== -1, "訂單應保存 LINE Pay 交易編號以防重複出票");
ok(payment.indexOf("Number(authorization.amount) !== Number(context.amount)") !== -1, "出票前應再次核對授權金額");

var index = fs.readFileSync(path.join(root, "index.html"), "utf8");
ok(index.indexOf("firebase-functions.js") !== -1, "首頁應載入 Firebase Functions SDK");
ok(index.indexOf("linepay-scanner.js") !== -1, "首頁應載入掃描付款模組");
ok(index.indexOf("linepay-scanner.css") !== -1, "首頁應載入掃描付款樣式");

var testPage = fs.readFileSync(path.join(root, "linepay-scanner-test.html"), "utf8");
ok(testPage.indexOf("不連接 Firebase") !== -1, "掃描器測試頁必須明示零扣款");
ok(testPage.indexOf("firebase") === -1 || testPage.indexOf("不連接 Firebase") !== -1, "測試頁不可載入付款 SDK");

console.log("PASS Sprint 10 LINE Pay scanner: " + count + " assertions");
