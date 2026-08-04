"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var packageRoot = path.resolve(root, "..");
var controllerRoot = path.join(packageRoot, "02_Android_Controller115_Coin_Reset_Manager");
var source = fs.readFileSync(path.join(root, "js/hardware/coin-manager.js"), "utf8");
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var bridge = fs.readFileSync(path.join(
    controllerRoot,
    "app/src/main/java/com/littlemonster/hardwareconsole/LocalTicketBridge.kt"
), "utf8");
var store = fs.readFileSync(path.join(
    controllerRoot,
    "app/src/main/java/com/littlemonster/hardwareconsole/CoinInventoryStore.kt"
), "utf8");
var main = fs.readFileSync(path.join(
    controllerRoot,
    "app/src/main/java/com/littlemonster/hardwareconsole/MainActivity.kt"
), "utf8");

assert.ok(html.indexOf("FIX29A CONTROLLER115 COIN RESET MANAGER") >= 0);
assert.ok(html.indexOf("coinResetPhysicalConfirm") >= 0);
assert.ok(html.indexOf("coinResetPassword") >= 0);
assert.ok(html.indexOf("resetAllCoinInventory()") >= 0);
assert.ok(source.indexOf("resetCoinDenomination") >= 0);
assert.ok(source.indexOf("PHYSICAL_COIN_DENOMINATION_") >= 0);
assert.ok(source.indexOf("PHYSICAL_COIN_MODULE_EMPTIED") >= 0);
assert.ok(bridge.indexOf("/v1/coins/inventory/reset-denomination") >= 0);
assert.ok(bridge.indexOf("INVALID_DENOMINATION") >= 0);
assert.ok(store.indexOf("resetDenominationAfterPhysicalEmpty") >= 0);
assert.ok(main.indexOf("COIN_INVENTORY_DENOMINATION_EMPTY_RESET") >= 0);
assert.ok(main.indexOf("noDispense=true noNoteDispense=true") >= 0);

var elements = {};
function element(id) {
    if (!elements[id]) {
        elements[id] = {
            id: id,
            className: "",
            textContent: "",
            innerHTML: "",
            disabled: false,
            checked: false,
            value: "",
            focus: function () {}
        };
    }
    return elements[id];
}

var resetButtons = [element("reset-all-mock")];
var calls = [];
var alerts = [];
var audits = [];
var stored = { monsterCashBridgePairingKeyV1: "12345678" };
var status = {
    ok: true,
    controllerOnline: true,
    pendingRequest: null,
    activeRefill: null,
    inventory: {
        source: "MDB_REFILL_LEDGER_CONFIRMED_TUBE_EVENTS",
        updatedAt: Date.now(),
        totalNtd: 320,
        entries: [
            { denominationNtd: 1, count: 10, amountNtd: 10, threshold: 3, lowStock: false, full: false },
            { denominationNtd: 5, count: 10, amountNtd: 50, threshold: 3, lowStock: false, full: false },
            { denominationNtd: 10, count: 10, amountNtd: 100, threshold: 3, lowStock: false, full: false },
            { denominationNtd: 50, count: 3, amountNtd: 150, threshold: 3, lowStock: true, full: false }
        ]
    },
    thresholds: { "1": 3, "5": 3, "10": 3, "50": 3 },
    maintenance: { message: "Controller 已連線", error: null },
    note100Availability: { state: "AVAILABLE", active: false },
    note100DispenseEnabled: true,
    note100RefillEnabled: true,
    productionChange: null,
    lastPhysicalEmptyReset: null
};

var sandbox = {
    console: console,
    Promise: Promise,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    isFinite: isFinite,
    localStorage: {
        getItem: function (key) { return stored[key] || null; },
        setItem: function (key, value) { stored[key] = String(value); },
        removeItem: function (key) { delete stored[key]; }
    },
    document: {
        activeElement: null,
        getElementById: element,
        querySelectorAll: function () { return resetButtons; }
    },
    MonsterPermission: { requirePermission: function () { return true; } },
    MonsterAuth: {
        getActor: function () { return { id: "manager-1", account: "manager", name: "店長" }; },
        audit: function (action, detail) { audits.push({ action: action, detail: detail }); }
    },
    MonsterRole: {
        getCurrentUser: function () {
            return { id: "manager-1", account: "manager", name: "店長", role: "admin" };
        },
        login: function (account, password) {
            return account === "manager" && password === "1234";
        }
    },
    showPage: function () {},
    alert: function (message) { alerts.push(String(message)); },
    confirm: function () { return true; },
    prompt: function () { return null; },
    setTimeout: function () { return 1; },
    clearTimeout: function () {},
    fetch: function (url, options) {
        var body = options && options.body ? JSON.parse(options.body) : null;
        calls.push({ url: url, options: options || {}, body: body });
        var responseBody = url.indexOf("/coins/refills") >= 0
            ? { ok: true, records: [] }
            : (url.indexOf("/coins/status") >= 0 ? status : { ok: true, message: "操作已送出" });
        return Promise.resolve({
            ok: true,
            status: 200,
            text: function () { return Promise.resolve(JSON.stringify(responseBody)); }
        });
    }
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, { filename: "coin-manager.js" });

async function flush() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

(async function () {
    sandbox.openCoinManager();
    await flush();

    element("coinResetPhysicalConfirm").checked = true;
    element("coinResetPassword").value = "1234";
    sandbox.resetCoinDenomination(10);
    await flush();

    var single = calls.filter(function (call) {
        return call.url.indexOf("/coins/inventory/reset-denomination") >= 0;
    })[0];
    assert.ok(single, "必須送出單一面額清零請求");
    assert.strictEqual(single.body.denominationNtd, 10);
    assert.strictEqual(single.body.confirmation, "PHYSICAL_COIN_DENOMINATION_10_EMPTIED");
    assert.ok(audits.some(function (row) { return row.action === "coin.inventory_reset_denomination"; }));

    element("coinResetPhysicalConfirm").checked = true;
    element("coinResetPassword").value = "1234";
    sandbox.resetAllCoinInventory();
    await flush();

    var all = calls.filter(function (call) {
        return call.url.indexOf("/coins/inventory/reset-physical-empty") >= 0;
    })[0];
    assert.ok(all, "必須送出全部硬幣清零請求");
    assert.strictEqual(all.body.confirmation, "PHYSICAL_COIN_MODULE_EMPTIED");
    assert.ok(audits.some(function (row) { return row.action === "coin.inventory_reset_all"; }));
    assert.strictEqual(alerts.length, 0, "正確店長驗證不應顯示錯誤");

    element("coinResetPhysicalConfirm").checked = true;
    element("coinResetPassword").value = "wrong";
    var before = calls.length;
    sandbox.resetCoinDenomination(5);
    await flush();
    assert.strictEqual(calls.length, before, "密碼錯誤時不得呼叫Controller");
    assert.ok(alerts.some(function (message) { return message.indexOf("店長密碼錯誤") >= 0; }));

    console.log("PASS FIX29A coin reset manager");
}()).catch(function (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
});
