"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var android = path.resolve(root, "../02_HardwareController_Android_Sprint8");
var count = 0;

function ok(value, message) { assert.ok(value, message); count += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); count += 1; }
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

global.window = global;
var store = {};
global.localStorage = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
};
var elements = {};
function element(id) {
    if (!elements[id]) elements[id] = { id: id, value: "", innerHTML: "", textContent: "", disabled: false };
    return elements[id];
}
global.document = {
    readyState: "complete",
    getElementById: element,
    addEventListener: function () {}
};
global.setTimeout = function (fn) { fn(); return 1; };
global.salesHistory = [
    { orderNo: "M202607220021", amount: 100, paidAmount: 100, status: "normal", createdAt: Date.now(), items: [{ id: "baby", price: 100, token: 0, toy: "none" }] },
    { orderNo: "M202607220022", amount: 250, paidAmount: 250, status: "normal", createdAt: Date.now(), items: [{ id: "green", price: 250, token: 10, toy: "green" }] },
    { orderNo: "MEMBER-TEST", amount: 50, status: "normal", memberId: "member-1", createdAt: Date.now(), items: [] }
];
global.todayStats = {};
global.monthStats = {};
global.totalStats = {};
global.saveTodayStats = function () { store.statsSaved = "yes"; };
global.MonsterCashOperations = {
    getRecords: function () {
        return {
            one: { orderId: "M202607220021", status: "TICKET_ISSUED", paidNtd: 100, revision: 5 },
            two: { orderId: "M202607220022", status: "TICKET_ISSUED", paidNtd: 250, revision: 5 },
            partial: { orderId: "PARTIAL", status: "RECONCILIATION_REQUIRED", paidNtd: 100, revision: 2 }
        };
    }
};

vm.runInThisContext(read("js/modules/testDataCleanup.js"), { filename: "testDataCleanup.js" });

equal(MonsterTestDataCleanup._test.normalizeIds("A\nA, B，C").join("|"), "A|B|C", "訂單編號應去重並正規化");
var safe = MonsterTestDataCleanup._test.buildPreview(["M202607220021", "M202607220022"]);
equal(safe.foundRows.length, 2, "已知兩筆實機測試應可被預覽");
equal(safe.blocked, false, "已安全出票的非會員測試單可清除");
var member = MonsterTestDataCleanup._test.buildPreview(["MEMBER-TEST"]);
equal(member.blocked, true, "會員測試單必須封鎖自動清除");
var partial = MonsterTestDataCleanup._test.buildPreview(["PARTIAL"]);
equal(partial.blocked, true, "未結案部分收款必須封鎖清除");

MonsterTestDataCleanup.recalculateLocalStats();
equal(todayStats.tickets, 2, "今日統計應從剩餘訂單重算");
equal(todayStats.income, 350, "今日收入應從票券快照重算");
equal(todayStats.tokens, 10, "代幣數應重算");
equal(todayStats.greenToy, 1, "玩具數應重算");
equal(store.statsSaved, "yes", "重算後應保存統計");

var index = read("index.html");
ok(index.indexOf('id="testCleanupPanel"') >= 0, "資料管理應有測試資料清除面板");
ok(index.indexOf('id="testCleanupPassword"') >= 0, "清除前應再次輸入店長密碼");
ok(index.indexOf('id="testCleanupPhrase"') >= 0, "清除前應輸入指定確認文字");
ok(index.indexOf('id="productionReadinessPanel"') >= 0, "現金對帳應有正式營運健康面板");
ok(index.indexOf('id="productionMonitorBanner"') >= 0, "Kiosk 應有故障警示橫幅");

var role = read("js/modules/roleManager.js");
ok(role.indexOf("verifyCurrentAdminPassword") >= 0, "應重新驗證目前店長密碼");
var orderSync = read("js/cloud/cloud-order-sync.js");
ok(orderSync.indexOf("purgeTestOrders") >= 0 && orderSync.indexOf("test-data-cleanup") >= 0, "雲端訂單應以防回傳 tombstone 清除");
var cashOps = read("js/hardware/cash-operations.js");
ok(cashOps.indexOf("purgeRecords") >= 0, "現金對帳應能清除指定測試帳本");
ok(cashOps.indexOf("operationalReadiness") >= 0, "應集中判定正式營運狀態");

var manifest = fs.readFileSync(path.join(android, "app/src/main/AndroidManifest.xml"), "utf8");
ok(manifest.indexOf("RECEIVE_BOOT_COMPLETED") >= 0, "Android 應取得開機自啟權限");
ok(manifest.indexOf("BootCompletedReceiver") >= 0, "Android 應註冊開機接收器");
var activity = fs.readFileSync(path.join(android, "app/src/main/java/com/littlemonster/hardwareconsole/MainActivity.kt"), "utf8");
ok(activity.indexOf("ensureMdbAutoConnection") >= 0, "Android 應自動連線 ttyS1");
ok(activity.indexOf("AUTO_RECONNECT_BASE_MS") >= 0, "Android 應具備漸進重連間隔");
ok(activity.indexOf("FLAG_KEEP_SCREEN_ON") >= 0, "正式營運時應防止控制器休眠");
var bridge = fs.readFileSync(path.join(android, "app/src/main/java/com/littlemonster/hardwareconsole/LocalTicketBridge.kt"), "utf8");
ok(bridge.indexOf("/v1/maintenance/purge-test-data") >= 0, "本機橋接應提供受配對保護的測試帳本清除入口");
ok(bridge.indexOf("CLEAR_TEST_ONLY") >= 0, "本機清除入口應要求固定確認 token");
var storeSource = fs.readFileSync(path.join(android, "app/src/main/java/com/littlemonster/hardwareconsole/TicketOrderStore.kt"), "utf8");
ok(storeSource.indexOf("MANAGER_TEST_DATA_PURGED") >= 0, "Android 應保留清除稽核記錄");
ok(storeSource.indexOf("requiresReconciliation") >= 0, "Android 不得刪除待人工處理的現金證據");

console.log("PASS Sprint 8 production go-live: " + count + " assertions");
