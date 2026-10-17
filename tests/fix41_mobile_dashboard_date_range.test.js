"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function element(id) {
    var classes = {};
    return {
        id: id,
        value: "",
        textContent: "",
        innerHTML: "",
        style: {},
        dataset: {},
        disabled: false,
        addEventListener: function () {},
        classList: {
            add: function (name) { classes[name] = true; },
            remove: function (name) { classes[name] = false; },
            toggle: function (name, on) { classes[name] = !!on; },
            contains: function (name) { return !!classes[name]; }
        }
    };
}

var elements = {};
[
    "enterpriseClose", "enterpriseOverlay", "enterpriseDashboardPanel", "enterpriseTicketPanel",
    "ticketSearch", "ticketCategory", "ticketStatus", "ticketAdd", "ticketSave",
    "enterpriseTicketList", "ticketSummary", "dashRefresh", "dashResetOrders", "dashRecent",
    "dashCustomRange", "dashDateFrom", "dashDateTo", "dashDateApply", "dashPeriodTitle",
    "dashRevenue", "dashTickets", "dashOrders", "dashAverage", "dashCash", "dashLine",
    "dashCancelled", "dashTokens", "dashTicketRank", "dashHourRank", "dashStaffRank",
    "dashRevenueLabel", "dashTicketsLabel", "dashOrdersLabel", "dashAverageLabel",
    "dashCashLabel", "dashLineLabel", "dashCancelledLabel", "dashTokensLabel",
    "enterpriseToast"
].forEach(function (id) { elements[id] = element(id); });

var periodButtons = ["today", "month", "all", "custom"].map(function (period) {
    var button = element("period-" + period);
    button.dataset.period = period;
    return button;
});
var ready;
var sales = [
    { id: "a", date: "2026/10/10", time: "10:00", amount: 250, payment: "現金", items: [{ title: "票券", quantity: 1 }] },
    { id: "b", date: "2026/10/11", time: "11:00", amount: 300, payment: "LINE Pay", items: [{ title: "襪子", quantity: 2 }] },
    { id: "c", date: "2026/09/30", time: "12:00", amount: 100, payment: "現金", items: [{ title: "代幣", quantity: 1 }] }
];
var context = {
    console: console,
    Date: Date,
    Math: Math,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    isFinite: isFinite,
    confirm: function () { return false; },
    setTimeout: function () {},
    localStorage: {
        getItem: function (key) { return key === "salesHistory" ? JSON.stringify(sales) : null; },
        setItem: function () {},
        removeItem: function () {}
    },
    document: {
        body: element("body"),
        getElementById: function (id) { return elements[id] || null; },
        querySelectorAll: function (selector) {
            if (selector === ".enterprise-period [data-period]") return periodButtons;
            return [];
        },
        addEventListener: function (name, callback) { if (name === "DOMContentLoaded") ready = callback; }
    },
    window: {}
};
context.window.window = context.window;
context.window.document = context.document;
context.window.localStorage = context.localStorage;

vm.runInNewContext(
    fs.readFileSync(path.resolve(__dirname, "../js/staff/enterprise-manager.js"), "utf8"),
    context,
    { filename: "enterprise-manager.js" }
);
ready();

context.window.MonsterEnterpriseManager.setPeriod("month");
assert.strictEqual(elements.dashRevenueLabel.textContent, "本月總收入");
assert.strictEqual(elements.dashTicketsLabel.textContent, "本月售票張數");

context.window.MonsterEnterpriseManager.setPeriod("all");
assert.strictEqual(elements.dashRevenueLabel.textContent, "累積總收入");
assert.strictEqual(elements.dashTicketsLabel.textContent, "累積售票張數");
assert.strictEqual(elements.dashRevenue.textContent, "NT$650");
assert.strictEqual(elements.dashTickets.textContent, "4 張");

context.window.MonsterEnterpriseManager.setPeriod("custom");
elements.dashDateFrom.value = "2026-10-10";
elements.dashDateTo.value = "2026-10-11";
context.window.MonsterEnterpriseManager.applyCustomRange();
assert.strictEqual(elements.dashRevenueLabel.textContent, "指定期間總收入");
assert.strictEqual(elements.dashRevenue.textContent, "NT$550");
assert.strictEqual(elements.dashTickets.textContent, "3 張");
assert.ok(elements.dashPeriodTitle.textContent.indexOf("2026-10-10 ～ 2026-10-11") >= 0);

console.log("PASS FIX41 mobile dashboard periods and custom date range");
