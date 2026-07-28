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

function ok(value, message) {
    assert.ok(value, message);
    checks += 1;
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    checks += 1;
}

var index = read("index.html");
ok(index.indexOf("V7.8.3.3 FIX9 Payment Page + Cart Reset") >= 0, "index exposes FIX9 version");
ok(index.indexOf('id="receiptPrintRecovery"') >= 0, "receipt recovery panel exists");
ok(index.indexOf("css/receipt-printer.css?v=7833fix7") >= 0, "receipt CSS is loaded");
ok(index.indexOf("js/hardware/receipt-printer.js?v=7833fix7") >= 0, "receipt bridge is loaded");
ok(
    index.indexOf("js/hardware/receipt-printer.js?v=7833fix7") <
        index.indexOf("js/hardware/cash-bridge.js?v=7833fix9"),
    "receipt bridge loads before the cash bridge"
);

var serviceWorker = read("service-worker.js");
ok(serviceWorker.indexOf("7833-fix9-payment-page-cart-reset-20260728-1") >= 0, "PWA cache is bumped");
ok(serviceWorker.indexOf('"./css/receipt-printer.css"') >= 0, "PWA caches receipt CSS");
ok(serviceWorker.indexOf('"./js/hardware/receipt-printer.js"') >= 0, "PWA caches receipt bridge");
ok(serviceWorker.indexOf("self.skipWaiting()") >= 0, "new worker takes over immediately");

var payment = read("js/modules/payment.js");
ok(payment.indexOf("hardwarePaidNtd") >= 0, "cash paid amount is saved");
ok(payment.indexOf("hardwareCashBreakdown") >= 0, "cash denomination breakdown is saved");
ok(payment.indexOf("order.changeAmount") >= 0, "automatic change amount is saved");
ok(payment.indexOf("MonsterLinePayScanner.start") >= 0, "LINE Pay flow remains present");

var cashBridge = read("js/hardware/cash-bridge.js");
ok(cashBridge.indexOf("MonsterReceiptPrinter.getStatus") >= 0, "printer is checked before cash collection");
ok(cashBridge.indexOf('receiptPrintStatus === "printed"') >= 0, "recovery requires confirmed print");
ok(cashBridge.indexOf('status === "CHANGE_PENDING"') >= 0, "pending change UI is handled");
ok(cashBridge.indexOf('status === "CHANGE_DISPENSING"') >= 0, "dispensing change UI is handled");

var printUi = read("js/modules/print.js");
ok(printUi.indexOf("physicalPrinted &&") >= 0, "ticket-issued acknowledgement waits for print");
ok(printUi.indexOf("showReceiptPrintRecovery") >= 0, "uncertain print enters recovery");
ok(
    printUi.indexOf("MonsterCashBridge.onTicketAnimationFinished") >
        printUi.indexOf("physicalPrinted &&"),
    "cash completion callback is guarded by physical print"
);

global.window = global;
var local = { monsterCashBridgePairingKeyV1: "12345678" };
global.localStorage = {
    getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(local, key) ? local[key] : null;
    }
};
global.salesHistory = [];
global.saveSalesHistory = function () {};
global.MonsterAuth = { audit: function () {} };
global.MonsterTicketDataSync = { tokenOf: function (item) { return Number(item.token || 0); } };
var requests = [];
global.fetch = function (url, options) {
    requests.push({ url: url, options: options });
    return Promise.resolve({
        ok: true,
        status: 200,
        text: function () {
            return Promise.resolve(JSON.stringify({
                ok: true,
                state: "PRINTED",
                bytesWritten: 888,
                finishedAt: 123456789
            }));
        }
    });
};

vm.runInThisContext(read("js/hardware/receipt-printer.js"), {
    filename: "receipt-printer.js"
});

var order = {
    orderNo: "FIX7-ORDER-250",
    payment: "現金",
    amount: 250,
    originalAmount: 250,
    paidAmount: 250,
    hardwarePaidNtd: 300,
    printAuthorizationId: "PRINT-FIX7-250",
    items: [
        {
            id: "ticket250",
            title: "2H 小怪獸",
            price: 250,
            token: 10,
            reward: "band",
            toy: "green"
        }
    ]
};

(async function () {
    var request = MonsterReceiptPrinter.buildRequest(order, { reprint: false });
    equal(request.paidNtd, 300, "receipt uses physically accepted cash");
    equal(request.changeNtd, 50, "receipt shows automatic change");
    equal(request.jobId, "AUTH:PRINT-FIX7-250", "original receipt is authorization-idempotent");

    await MonsterReceiptPrinter.printOrder(order, { reprint: false });
    equal(order.receiptPrintStatus, "printed", "order is marked printed only after success");
    equal(order.receiptPrintBytes, 888, "actual written byte count is recorded");
    equal(requests.length, 1, "one receipt request is sent");
    equal(requests[0].url, "http://127.0.0.1:8765/v1/receipts", "receipt uses local controller");

    console.log("PASS FIX8 web regression: " + checks + " checks");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
