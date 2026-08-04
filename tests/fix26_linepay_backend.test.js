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
var payment = read("js/modules/payment.js");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");
var deploy = readPackage("tools/deploy-member-portal.ps1");
var firebase = JSON.parse(readPackage("firebase.json"));

ok(index.indexOf("FIX26F LINEPAY WEBVIEW OVERLAY REPAIR") >= 0, "首頁應保留 FIX26F");
ok(index.indexOf("checkLinePayBackend()") >= 0, "後台應保留 LINE Pay 後端檢查");
ok(scanner.indexOf("window.checkLinePayBackend = checkBackend") >= 0, "前端應保留健康檢查");
ok(scanner.indexOf('callable("payWithLinePayMyCode"') >= 0, "付款仍只透過 Callable 後端");
ok(payment.indexOf('paymentType === "LINE Pay"') >= 0, "LINE Pay 付款完成路徑必須保留");
ok(enterprise.indexOf('var BUILD = "FIX27A"') >= 0, "單一版本標籤應更新 FIX27A");
ok(worker.indexOf("7833-fix27a-member-pin-20260803-1") >= 0, "離線快取應更新 FIX27A");
ok(firebase.functions.runtime === "nodejs20", "新增 Functions 必須使用 Node.js 20");
ok(deploy.indexOf("functions:setMemberPortalPin,functions:setMemberPortalBirthday,functions:memberPortalLogin,functions:memberPortalChangePin") >= 0,
    "FIX27A 只部署四支會員查詢 Functions");
[
    "functions:registerLinePayKiosk",
    "functions:linePayHealth",
    "functions:payWithLinePayMyCode",
    "functions:checkLinePayOfflinePayment"
].forEach(function (name) {
    ok(deploy.indexOf(name) === -1, "FIX27A 不可重新部署 " + name);
});

console.log("PASS FIX26 LINE Pay external-backend preservation: " + count + " assertions");
