"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var checks = 0;

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    checks += 1;
}

function ok(value, message) {
    assert.ok(value, message);
    checks += 1;
}

var stored = JSON.stringify({ pointValue: 99, maxPercent: 50, enabled: true });
var context = {
    console: console,
    isFinite: isFinite,
    Object: Object,
    Math: Math,
    Number: Number,
    JSON: JSON,
    setInterval: function () {},
    CustomEvent: function (type, options) { this.type = type; this.detail = options && options.detail; },
    localStorage: {
        getItem: function () { return stored; },
        setItem: function (key, value) { stored = value; }
    },
    document: {
        activeElement: null,
        querySelectorAll: function () { return []; },
        querySelector: function () { return null; },
        getElementById: function () { return null; },
        addEventListener: function () {},
        dispatchEvent: function () {}
    },
    cart: [],
    selectedTicket: "ticket",
    ticketData: { ticket: { price: 500 } },
    currentMember: { points: 27 }
};
context.window = context;
vm.runInNewContext(read("js/modules/consumePoints.js"), context);

equal(context.ConsumePoints.settings().pointValue, 1, "舊折抵倍率必須被固定規則取代");
equal(context.ConsumePoints.settings().redeemStep, 10, "折抵級距固定 10 點");
equal(context.ConsumePoints.calculateRedemption(9, 500, { points: 9 }).points, 0, "未滿 10 點不可折抵");
equal(context.ConsumePoints.calculateRedemption(10, 500, { points: 10 }).discount, 10, "10 點折 10 元");
equal(context.ConsumePoints.calculateRedemption(20, 500, { points: 20 }).discount, 20, "20 點折 20 元");
equal(context.ConsumePoints.calculateRedemption(27, 500, { points: 27 }).points, 20, "27 點只使用 20 點");
equal(context.ConsumePoints.calculateRedemption(27, 500, { points: 27 }).discount, 20, "27 點只折 20 元");
equal(context.ConsumePoints.maxRedeem(500, { points: 27 }), 20, "使用最多保留 7 點零頭");
equal(context.ConsumePoints.calculateRedemption(100, 50, { points: 100 }).discount, 20, "50% 上限 25 元需往下取 20 元");

context.ConsumePoints.save({ pointValue: 8, redeemStep: 1, redeemValue: 8, maxPercent: 100 });
equal(context.ConsumePoints.settings().pointValue, 1, "儲存時不得改寫固定一比一折抵");
equal(context.ConsumePoints.settings().redeemStep, 10, "儲存時不得改寫 10 點級距");
equal(context.ConsumePoints.calculateRedemption(40, 40, { points: 40 }).discount, 40, "允許比例足夠時可整數全額折抵");
context.ConsumePoints.save({ enabled: false, maxPercent: 100 });
equal(context.ConsumePoints.calculateRedemption(10, 100, { points: 10 }).discount, 0, "停用消費點數時不可折抵");
context.ConsumePoints.save({ enabled: true, maxPercent: 100 });

var paymentSource = read("js/modules/payment.js");
ok(paymentSource.indexOf("points % 10 !== 0") >= 0, "付款核心必須拒絕非 10 倍數");
ok(paymentSource.indexOf("discount !== points") >= 0, "付款核心必須驗證點數與折抵金額一致");
ok(paymentSource.indexOf("discount > Math.round(Number(originalAmount))") >= 0, "付款核心必須禁止超過訂單金額");
ok(paymentSource.indexOf("ConsumePoints.calculateRedemption") >= 0, "付款建立前必須重新正規化折抵");

var paymentContext = {
    console: console,
    isFinite: isFinite,
    Object: Object,
    Math: Math,
    Number: Number,
    JSON: JSON,
    Date: Date,
    cart: [],
    selectedTicket: "ticket",
    ticketData: { ticket: { id: "ticket", title: "測試票", price: 100 } },
    currentMember: { id: "member-1", points: 27 },
    generateOrderNo: function () { return "FIX27B-TEST"; },
    getCurrentMemberOrderInfo: function () { return { memberId: "member-1" }; },
    document: {
        getElementById: function () { return null; },
        querySelector: function () { return { id: "detailPage" }; }
    },
    ConsumePoints: {
        current: function () { return { points: 27, discount: 27 }; },
        calculateRedemption: function () { return { points: 20, discount: 20 }; }
    }
};
paymentContext.window = paymentContext;
vm.runInNewContext(paymentSource, paymentContext);
var frozen = paymentContext.MonsterPayment.buildContext();
equal(frozen.pointUse.points, 20, "付款凍結前需把 27 點正規化為 20 點");
equal(frozen.pointUse.discount, 20, "付款凍結折抵金額應為 20 元");
equal(frozen.amount, 80, "原價 100 元使用 20 點後應收 80 元");

paymentContext.ConsumePoints.calculateRedemption = function () {
    return { points: 17, discount: 17 };
};
assert.throws(function () {
    paymentContext.MonsterPayment.buildContext();
}, /每次須使用 10 點/, "付款核心需拒絕未正規化的非 10 倍數");
checks += 1;

var managerSource = read("js/staff/consume-points-manager.js");
ok(managerSource.indexOf("每 10 點折 10 元") >= 0, "店長畫面必須顯示固定規則");
ok(managerSource.indexOf("redeemStep:10") >= 0, "店長儲存需寫入 10 點級距");

var indexSource = read("index.html");
var workerSource = read("service-worker.js");
ok(indexSource.indexOf("FIX27B CONSUME POINTS 10 STEP") >= 0, "首頁必須標示 FIX27B");
ok(indexSource.indexOf("consumePoints.js?v=7833fix27b") >= 0, "點數模組必須更新快取版本");
ok(workerSource.indexOf("7833-fix27b-consume-points-10-step-20260804-1-lite1") >= 0, "PWA 必須切換 FIX27B 快取");

console.log("PASS FIX27B consume points 10-step: " + checks + " checks");
