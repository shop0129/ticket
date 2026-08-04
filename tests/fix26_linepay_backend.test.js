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

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

var index = read("index.html");
var scanner = read("js/cloud/linepay-scanner.js");
var payment = read("js/modules/payment.js");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");
var firebase = JSON.parse(read("firebase.json"));

ok(index.indexOf("FIX26F LINEPAY WEBVIEW OVERLAY REPAIR") >= 0, "首頁應保留 FIX26F");
ok(index.indexOf("checkLinePayBackend()") >= 0, "後台應保留 LINE Pay 後端檢查");
ok(scanner.indexOf("window.checkLinePayBackend = checkBackend") >= 0, "前端應保留健康檢查");
ok(scanner.indexOf('callable("payWithLinePayMyCode"') >= 0, "付款仍只透過 Callable 後端");
ok(payment.indexOf('paymentType === "LINE Pay"') >= 0, "LINE Pay 付款完成路徑必須保留");
ok(enterprise.indexOf('var BUILD = "FIX29A"') >= 0, "單一版本標籤應更新 FIX29A");
ok(worker.indexOf("7833-fix27b-consume-points-10-step-20260804-1") >= 0, "離線快取應更新 FIX27B");
ok(!firebase.functions, "FIX29A 網頁更新不可加入 Functions 部署設定");
ok(!fs.existsSync(path.join(packageRoot, "functions")), "FIX29A 不可包含或重部署 LINE Pay Functions");
ok(!fs.existsSync(path.join(packageRoot, "tools", "deploy-member-portal.ps1")),
    "FIX29A 不可夾帶會員後端部署工具");

console.log("PASS FIX26 LINE Pay external-backend preservation: " + count + " assertions");
