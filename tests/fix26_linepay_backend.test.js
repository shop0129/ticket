"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var packageRoot = path.resolve(root, "..");
var count = 0;

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readPackage(relativePath) {
    return fs.readFileSync(path.join(packageRoot, relativePath), "utf8");
}

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

var index = read("index.html");
var scanner = read("js/cloud/linepay-scanner.js");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");
var backend = readPackage("functions/index.js");
var client = readPackage("functions/lib/linepay-client.js");
var firebase = JSON.parse(readPackage("firebase.json"));

ok(index.indexOf("FIX26 LINEPAY OFFLINE V4") >= 0, "首頁應標示 FIX26");
ok(index.indexOf("checkLinePayBackend()") >= 0, "後台應提供後端連線檢查");
ok(scanner.indexOf("window.checkLinePayBackend = checkBackend") >= 0, "前端應提供健康檢查");
ok(scanner.indexOf('callable("payWithLinePayMyCode"') >= 0, "付款應只透過 Callable 後端");
ok(enterprise.indexOf('var BUILD = "FIX26"') >= 0, "單一版本標籤應更新 FIX26");
ok(worker.indexOf("7833-fix26-linepay-offline-v4-20260731-1") >= 0, "離線快取應更新 FIX26");

[
    "registerLinePayKiosk",
    "linePayHealth",
    "payWithLinePayMyCode",
    "checkLinePayOfflinePayment"
].forEach(function (name) {
    ok(backend.indexOf("exports." + name) >= 0, "後端缺少 " + name);
});

ok(backend.indexOf('secrets: [SECRET_NAME]') >= 0, "Functions 必須綁定 Firebase Secret");
ok(backend.indexOf("monsterSecure/v1/linePay") >= 0, "付款紀錄必須保存於客戶端不可讀路徑");
ok(backend.indexOf("validateOrder") >= 0, "付款前必須由後端重算票價");
ok(backend.indexOf("refundMismatch") >= 0, "金額不一致必須自動退款");
ok(client.indexOf('createHmac("sha256"') >= 0, "LINE Pay v4 必須使用 HMAC SHA256");
ok(client.indexOf("X-LINE-Authorization") >= 0, "LINE Pay v4 必須送出簽章");
ok(client.indexOf("X-LINE-ChannelSecret") === -1, "v4 不可直接送出 Channel Secret header");
ok(firebase.functions.runtime === "nodejs20", "Functions 必須使用 Node.js 20");
ok(fs.existsSync(path.join(packageRoot, "01_SETUP_LINEPAY_SANDBOX.cmd")), "缺少沙盒安裝程式");
ok(fs.existsSync(path.join(packageRoot, "03_SWITCH_LINEPAY_TO_PRODUCTION.cmd")), "缺少正式環境切換程式");

console.log("PASS FIX26 LINE Pay backend: " + count + " assertions");
