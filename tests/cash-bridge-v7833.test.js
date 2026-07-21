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

function button() {
    var listeners = {};
    return {
        disabled: false,
        addEventListener: function (name, handler) { listeners[name] = handler; },
        click: function () { if (listeners.click) listeners.click(); }
    };
}

var elements = {
    countdownNumber: { innerHTML: "" },
    successTip: { innerHTML: "" },
    linePayBtn: button(),
    cashBtn: button(),
    cartLineBtn: button(),
    cartCashBtn: button()
};

global.window = global;
global.document = { getElementById: function (id) { return elements[id] || null; } };
global.cart = [{
    id: "ticket2hGreen",
    title: "2H 小怪獸",
    price: 110,
    token: 10,
    toy: "green",
    reward: "band",
    canEnter: true
}];
global.selectedTicket = "";
global.ticketData = { ticket2hGreen: global.cart[0] };
global.salesHistory = [];
global.todayStats = {};
global.monthStats = {};
global.totalStats = {};
global.currentPrintOrder = null;
global.currentMember = { id: "member-1", name: "測試會員", points: 50 };
global.memberData = [global.currentMember];
global.isReprint = false;
global.generateOrderNo = function () { return "S6-7833-TEST-01"; };
global.getCurrentMemberOrderInfo = function () {
    return { memberId: "member-1", memberName: "測試會員" };
};
global.MonsterTicketDataSync = {
    snapshot: function (id, source) {
        var copy = JSON.parse(JSON.stringify(source));
        copy.id = id;
        copy.snapshotVersion = "7.8.3.3";
        return copy;
    }
};
global.MonsterSaleRule = {
    evaluate: function () { return { available: true }; }
};
var pointResetCalls = 0;
global.ConsumePoints = {
    current: function () { return { points: 10, discount: 10 }; },
    reset: function () { pointResetCalls += 1; }
};
global.MonsterTicketValidation = {
    decorateOrder: function (order) {
        order.validationDecorated = true;
        return order;
    }
};

var salesSaves = 0;
var memberCalls = 0;
var statCalls = 0;
var printCalls = 0;
global.saveSalesHistory = function () { salesSaves += 1; };
global.applyMemberPurchase = function (amount, order, pointUse) {
    memberCalls += 1;
    equal(amount, 100, "會員消費只可累積實付100元");
    equal(pointUse.points, 10, "應保留付款前凍結的折抵點數");
    order.memberApplied = true;
};
global.updateStats = function () { statCalls += 1; };
global.saveTodayStats = function () {};
global.showPage = function () {};
global.updateSuccessItems = function () {};
global.startPrintAnimation = function () { printCalls += 1; };
global.applyPaymentSetting = function () {};
global.playClick = function () {};
global.renderTicketCatalog = function () {};
global.alert = function () {};

var paymentSource = fs.readFileSync(path.resolve(__dirname, "../js/modules/payment.js"), "utf8");
vm.runInThisContext(paymentSource, { filename: "payment.js" });

var cashStartCalls = 0;
global.MonsterCashBridge = {
    startCashPayment: function () { cashStartCalls += 1; },
    hasBlockingTransaction: function () { return false; }
};
elements.cashBtn.click();
equal(cashStartCalls, 1, "按現金付款必須進入本機配對／收款橋接");
equal(salesHistory.length, 0, "按現金付款時不得直接建立成功訂單");

var context = MonsterPayment.buildContext();
equal(context.orderNo, "S6-7833-TEST-01", "付款前應建立固定訂單編號");
equal(context.originalAmount, 110, "應保留票券原價");
equal(context.amount, 100, "硬體只可收取扣除點數後的100元");
equal(context.items[0].snapshotVersion, "7.8.3.3", "應沿用新版票券快照");

var transaction = { order: context };
var authorization = {
    authorizationId: "PRINT-S6-7833-ABC",
    paymentId: "PAY-S6-7833-ABC",
    paidAt: 123456789,
    bridgeVersion: "1.0-sprint6"
};

MonsterPayment.finalizeAuthorizedCash(transaction, authorization);
MonsterPayment.finalizeAuthorizedCash(transaction, authorization);

equal(salesHistory.length, 1, "相同出票授權不得建立第二筆訂單");
equal(salesHistory[0].orderNo, "S6-7833-TEST-01", "付款前後必須沿用同一訂單");
equal(salesHistory[0].paymentId, "PAY-S6-7833-ABC", "訂單應保存硬體付款ID");
equal(salesHistory[0].printAuthorizationId, "PRINT-S6-7833-ABC", "訂單應保存唯一出票授權");
equal(salesHistory[0].originalAmount, 110, "訂單應保存原價");
equal(salesHistory[0].amount, 100, "訂單應保存實付金額");
equal(salesHistory[0].usedPoints, 10, "訂單應保存使用點數");
ok(salesHistory[0].validationDecorated, "現金訂單仍須經過V7.8.3.3票券驗證");
equal(memberCalls, 1, "重送授權不得重複累積會員消費");
equal(statCalls, 3, "一張票只可更新今日／本月／累積統計一次");
equal(pointResetCalls, 1, "成功付款後只可清除一次點數折抵");
equal(printCalls, 1, "相同授權重送不得再次出票");
ok(salesSaves >= 2, "應先保存授權訂單，再保存完成副作用狀態");

var bridgeSource = fs.readFileSync(path.resolve(__dirname, "../js/hardware/cash-bridge.js"), "utf8");
ok(bridgeSource.indexOf("http://127.0.0.1:8765/v1") !== -1, "橋接只能指向本機loopback");
ok(bridgeSource.indexOf("X-Monster-Bridge-Key") !== -1, "每個本機API請求都應帶配對碼");
ok(bridgeSource.indexOf('active.state = "CLAIMED"') !== -1, "出票前應保存CLAIMED checkpoint");
ok(bridgeSource.indexOf("/issued") !== -1, "出票完成後應回覆控制器");
ok(bridgeSource.indexOf("RECOVERY_REQUIRED") !== -1, "不確定狀態應轉人工處理");
ok(bridgeSource.indexOf("finalizePointOnly") !== -1, "全額點數折抵不得啟動收鈔／收幣");

var indexSource = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
ok(indexSource.indexOf("css/cash-bridge.css") !== -1, "首頁應載入現金付款畫面");
ok(indexSource.indexOf("js/hardware/cash-bridge.js") !== -1, "首頁應在付款模組後載入本機橋接");
ok(indexSource.indexOf('content="V7.8.3.3 Sprint 6 FIX1"') !== -1, "首頁應帶有可核對的FIX1版本");
ok(indexSource.indexOf('id="v7-phase1-badge"') === -1, "首頁不得再建立第二個固定版本標籤");

var enterpriseSource = fs.readFileSync(path.resolve(__dirname, "../js/core/enterprise-core.js"), "utf8");
ok(enterpriseSource.indexOf('VERSION = "7.8.3.3 S6 FIX1"') !== -1, "唯一狀態標籤應顯示目前正式版本");

var printSource = fs.readFileSync(path.resolve(__dirname, "../js/modules/print.js"), "utf8");
ok(printSource.indexOf("onTicketAnimationFinished") !== -1, "出票動畫完成後才可確認出票");

var workerSource = fs.readFileSync(path.resolve(__dirname, "../service-worker.js"), "utf8");
ok(workerSource.indexOf("7833-sprint6-fix1-cash-pairing") !== -1, "PWA快取版本應更新");
ok(workerSource.indexOf("self.skipWaiting()") !== -1, "新版Service Worker應立即接管舊PWA");
ok(workerSource.indexOf("./js/hardware/cash-bridge.js") !== -1, "PWA應快取現金橋接");
ok(workerSource.indexOf("./css/cash-bridge.css") !== -1, "PWA應快取現金付款樣式");

var pwaSource = fs.readFileSync(path.resolve(__dirname, "../js/pwa/pwa-manager.js"), "utf8");
ok(pwaSource.indexOf("location.reload()") !== -1, "新控制器接管後應自動重新載入新版首頁");

console.log("PASS V7.8.3.3 Sprint 6 cash integration: " + count + " assertions");
