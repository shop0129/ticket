"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var updatesSent = [];
var statusCalls = [];
var dispatched = [];
var readyCallback = null;
var valueCallback = null;
var onlineCallback = null;
var count = 0;

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

global.window = global;
global.salesHistory = [];
global.localStorage = { setItem: function () {} };
global.document = { getElementById: function () { return null; } };
global.CustomEvent = function (type, options) { this.type = type; this.detail = options.detail; };
global.dispatchEvent = function (event) { dispatched.push(event); };
global.addEventListener = function (type, callback) {
    if (type === "online") { onlineCallback = callback; }
};

var orderRef = {
    on: function (event, callback) {
        if (event === "value") { valueCallback = callback; }
    },
    update: function (updates) {
        updatesSent.push(updates);
        return Promise.resolve();
    }
};

global.MonsterCloud = {
    uid: "test-device",
    database: { ref: function () { return orderRef; } },
    onReady: function (callback) { readyCallback = callback; },
    setStatus: function () { statusCalls.push(Array.prototype.slice.call(arguments)); }
};

require("../js/cloud/cloud-order-sync.js");

(async function () {
    ok(typeof readyCallback === "function", "訂單同步應等待 Firebase ready");
    readyCallback();
    ok(typeof valueCallback === "function", "應建立 orders value listener");
    valueCallback({ val: function () { return {}; } });

    global.salesHistory = [{
        orderNo: "TEST-001",
        amount: 300,
        status: "normal",
        items: [{ id: "ticket-2h", title: "2H票", price: 300 }]
    }];
    window.salesHistory = global.salesHistory;

    MonsterOrderCloud.onLocalSave(global.salesHistory);
    await new Promise(function (resolve) { setTimeout(resolve, 130); });

    ok(updatesSent.length >= 1, "本機新訂單應立即上傳");
    var sent = updatesSent[updatesSent.length - 1];
    var keys = Object.keys(sent);
    ok(keys.some(function (key) { return /TEST-001\/orderNo$/.test(key); }), "應使用訂單欄位路徑更新");
    ok(keys.some(function (key) { return /TEST-001\/updatedAt$/.test(key); }), "應附上 updatedAt");
    ok(!keys.some(function (key) { return key === "TEST-001"; }), "不可整筆覆寫訂單物件");
    ok(dispatched.some(function (event) { return event.type === "monster:orders-updated"; }), "同步後應發出即時更新事件");
    ok(statusCalls.length >= 1, "同步完成應更新連線狀態");
    ok(typeof onlineCallback === "function", "應支援網路恢復後重送");
    ok(MonsterOrderCloud.getInfo().lastCloudUpdateAt > 0, "應記錄最後同步時間");

    var staffSource = fs.readFileSync(path.resolve(__dirname, "../js/staff/order-center.js"), "utf8");
    ok(staffSource.indexOf("firebase.auth().currentUser") !== -1, "Staff 應等待 Firebase 使用者");
    ok(staffSource.indexOf("onAuthStateChanged") !== -1, "Staff 應監聽驗證完成事件");
    ok(staffSource.indexOf('.once("value")') !== -1, "重新整理按鈕應真正讀取雲端");
    ok(staffSource.indexOf("handleOrderReadError") !== -1, "Staff 應顯示同步錯誤");

    var workerSource = fs.readFileSync(path.resolve(__dirname, "../service-worker.js"), "utf8");
    ok(workerSource.indexOf("networkFirstCodeAsset") !== -1, "程式檔應採 network-first");
    ok(workerSource.indexOf("7833-sprint6-fix1-cash-pairing") !== -1, "應使用 Sprint 6 FIX1 PWA cache");

    console.log("PASS realtime order fix: " + count + " assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
