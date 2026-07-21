"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var count = 0;

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    count += 1;
}

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

var store = {};
global.window = global;
global.localStorage = {
    getItem: function (key) { return store[key] || null; },
    setItem: function (key, value) { store[key] = String(value); }
};
var elements = {};
function element(id) {
    if (!elements[id]) {
        elements[id] = {
            id: id,
            textContent: "",
            innerHTML: "",
            classList: { toggle: function () {} }
        };
    }
    return elements[id];
}
global.document = {
    readyState: "complete",
    body: { appendChild: function () {}, removeChild: function () {} },
    getElementById: function (id) { return element(id); },
    addEventListener: function () {},
    createElement: function () { return { click: function () {} }; }
};
global.addEventListener = function () {};
global.setInterval = function () { return 1; };
global.setTimeout = function (fn) { fn(); return 1; };
global.alert = function () {};
global.salesHistory = [{
    orderNo: "WEB-100",
    payment: "現金",
    amount: 100,
    paidAmount: 100,
    status: "normal",
    createdAt: Date.now()
}, {
    orderNo: "WEB-10",
    payment: "現金",
    amount: 10,
    paidAmount: 10,
    status: "normal",
    createdAt: Date.now()
}];

var source = fs.readFileSync(path.resolve(__dirname, "../js/hardware/cash-operations.js"), "utf8");
vm.runInThisContext(source, { filename: "cash-operations.js" });

var now = Date.now();
MonsterCashOperations._test.setState({
    records: {
        success100: {
            orderId: "WEB-100", status: "TICKET_ISSUED", amountNtd: 100, paidNtd: 100,
            billCount: 1, coinCount: 0, counts: { "100": 1 }, createdAt: now, issuedAt: now, revision: 5
        },
        success10: {
            orderId: "WEB-10", status: "TICKET_ISSUED", amountNtd: 10, paidNtd: 10,
            billCount: 0, coinCount: 1, counts: { "10": 1 }, createdAt: now, issuedAt: now, revision: 5
        },
        refunded50: {
            orderId: "PARTIAL-REFUND", status: "CANCELED", amountNtd: 100, paidNtd: 50,
            billCount: 0, coinCount: 1, counts: { "50": 1 }, resolution: "REFUNDED",
            resolutionNote: "店長已退還", resolvedAt: now, createdAt: now, revision: 4
        },
        unresolved5: {
            orderId: "PARTIAL-OPEN", status: "RECONCILIATION_REQUIRED", amountNtd: 100, paidNtd: 5,
            billCount: 0, coinCount: 1, counts: { "5": 1 }, createdAt: now, finishedAt: now, revision: 3
        }
    },
    hardware: {
        controllerOnline: true,
        updatedAt: now,
        hardware: { mdbConnected: true, safetyReady: true, message: "可收款" }
    },
    businessDate: new Date().toISOString().slice(0, 10),
    updatedAt: now
});

var summary = MonsterCashOperations.getSummary();
equal(summary.webCashSales, 110, "正常現金訂單應為110元");
equal(summary.gross, 165, "硬體總實收應包含成功、退款前與未結案款項");
equal(summary.refunded, 50, "已退款金額應獨立扣除");
equal(summary.expectedDrawer, 115, "錢箱預估應為硬體實收減退款");
equal(summary.difference, 5, "未結案5元應顯示為對帳差額");
equal(summary.unresolved, 1, "只應有一筆待人工處理");
equal(summary.unresolvedAmount, 5, "待人工處理金額應為5元");
equal(summary.billCount, 1, "紙鈔應統計1張");
equal(summary.coinCount, 3, "硬幣應統計3枚");
equal(summary.counts["100"], 1, "100元面額應保留");
equal(summary.counts["50"], 1, "50元面額應保留");
equal(summary.counts["10"], 1, "10元面額應保留");
equal(summary.counts["5"], 1, "5元面額應保留");

ok(source.indexOf("monsterTicket/v1/cashOperations") !== -1, "對帳資料應同步到獨立雲端路徑");
ok(source.indexOf("REFUNDED") !== -1 && source.indexOf("MANUAL_RECORDED") !== -1, "人工處理只能分成退款或人工入帳");
ok(source.indexOf("不會自動出幣、出鈔或出票") !== -1, "人工結案前應明確維持危險功能封鎖");

var index = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
ok(index.indexOf('id="cashReconciliationPage"') !== -1, "店長後台應有現金對帳頁");
ok(index.indexOf("MonsterCashOperations.exportCsv") !== -1, "現金對帳應可匯出CSV");
ok(index.indexOf("MonsterCashOperations.exportJson") !== -1, "現金對帳應可匯出JSON");

console.log("PASS Sprint 7 cash operations: " + count + " assertions");
