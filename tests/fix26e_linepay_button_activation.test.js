"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var count = 0;

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

var index = read("index.html");
var payment = read("js/modules/payment.js");
var cart = read("js/modules/cart.js");
var settings = read("js/modules/systemSetting.js");
var scanner = read("js/cloud/linepay-scanner.js");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");

ok(index.indexOf("FIX26E LINEPAY BUTTON + ACTIVATION") >= 0, "首頁應保留 FIX26E 回歸標記");
ok(index.indexOf("js/modules/payment.js?v=7833fix26f") >= 0, "付款核心快取版本應更新");
ok(index.indexOf("js/cloud/linepay-scanner.js?v=7833fix26f") >= 0, "LINE Pay 模組快取版本應更新");
ok(enterprise.indexOf('var BUILD = "FIX27"') >= 0, "右下角版本應顯示目前 FIX27");
ok(worker.indexOf("7833-fix27-member-self-service-20260803-1") >= 0, "Service Worker 快取應更新");

ok(payment.indexOf('bindPaymentButton(linePayBtn, "LINE Pay")') >= 0, "單張票 LINE Pay 應綁定付款核心");
ok(cart.indexOf('paymentSuccess("LINE Pay")') >= 0, "購物車 LINE Pay 應綁定付款核心");
ok(payment.indexOf("LINE Pay 目前在「管理 → 系統設定 → 付款方式」中關閉") >= 0, "關閉設定時應明確提示");
ok(settings.indexOf('data-payment-setting-disabled') >= 0, "停用設定不應再靜默吃掉點擊");
ok(settings.indexOf("applyLinePayButtonSetting(lineBtn)") >= 0, "單張票應套用共用 LINE Pay 開關");
ok(settings.indexOf("applyLinePayButtonSetting(cartLine)") >= 0, "購物車應套用共用 LINE Pay 開關");

ok(scanner.indexOf('state: "CHECKING_BACKEND"') >= 0, "按下後應立即進入後端檢查狀態");
ok(scanner.indexOf('callable("linePayHealth", {})') >= 0, "付款開始前應檢查後端與裝置狀態");
ok(scanner.indexOf("result.registered !== true") >= 0, "未啟用裝置應直接進入啟用流程");
ok(scanner.indexOf('action: "啟用裝置"') >= 0, "未啟用畫面應提供啟用按鈕");
ok(scanner.indexOf('active.state = "WAITING_SCAN"') >= 0, "已啟用裝置才進入掃描狀態");
ok(scanner.indexOf('state === "CHECKING_BACKEND"') >= 0, "尚未送款的後端檢查不可被當成已付款交易");

console.log("PASS FIX26E LINE Pay button + activation: " + count + " assertions");
