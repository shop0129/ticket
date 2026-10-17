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
        classList: {
            toggle: function (name, on) { classes[name] = !!on; },
            contains: function (name) { return !!classes[name]; }
        }
    };
}

var ids = [
    "dashboardPeriodToday", "dashboardPeriodMonth", "dashboardPeriodAll", "dashboardPeriodCustom",
    "dashboardCustomRange", "dashboardDateFrom", "dashboardDateTo", "dashboardDate",
    "dashboardIncomeLabel", "dashboardTicketsLabel", "dashboardNewMembersLabel",
    "dashboardIncome", "dashboardTickets", "dashboardCash", "dashboardLinePay",
    "dashboardOrders", "dashboardCancelled", "dashboardMemberOrders", "dashboardMemberIncome",
    "dashboardNonMemberIncome", "dashboardNewMembers", "dashboardAverageOrder", "dashboardTokens",
    "dashboardRecentOrders", "dashboardTopTickets", "dashboardHourlySales", "dashboardStaffSales",
    "dashboardRealtimeStatus"
];
var elements = {};
ids.forEach(function (id) { elements[id] = element(id); });

var context = {
    console: console,
    Date: Date,
    Math: Math,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    isFinite: isFinite,
    alert: function (message) { throw new Error(message); },
    setTimeout: function () {},
    salesHistory: [
        { date: "2026/10/10", time: "10:30", payment: "現金", amount: 250, status: "paid", items: [{ title: "2H", price: 250, quantity: 1 }] },
        { date: "2026/10/11", time: "15:00", payment: "LINE Pay", amount: 300, status: "paid", items: [{ title: "襪子", price: 150, quantity: 2 }] },
        { date: "2026/10/12", time: "12:00", payment: "現金", amount: 500, status: "cancel", items: [{ title: "作廢", price: 500, quantity: 1 }] },
        { date: "2026/09/30", time: "18:00", payment: "現金", amount: 100, status: "paid", items: [{ title: "代幣", price: 100, quantity: 1 }] }
    ],
    memberData: [
        { joinDate: "2026/10/10" },
        { joinDate: "2026/09/30" }
    ],
    document: {
        getElementById: function (id) { return elements[id] || null; },
        addEventListener: function () {}
    },
    window: {
        addEventListener: function () {}
    }
};

vm.runInNewContext(
    fs.readFileSync(path.resolve(__dirname, "../js/modules/dashboard.js"), "utf8"),
    context,
    { filename: "dashboard.js" }
);

context.setDashboardPeriod("month");
assert.strictEqual(elements.dashboardIncomeLabel.textContent, "本月總收入");
assert.strictEqual(elements.dashboardTicketsLabel.textContent, "本月售票");

context.setDashboardPeriod("all");
assert.strictEqual(elements.dashboardIncomeLabel.textContent, "累積總收入");
assert.strictEqual(elements.dashboardTicketsLabel.textContent, "累積售票");

context.setDashboardPeriod("custom");
elements.dashboardDateFrom.value = "2026-10-10";
elements.dashboardDateTo.value = "2026-10-11";
context.applyDashboardDateRange();

assert.strictEqual(elements.dashboardIncomeLabel.textContent, "指定期間總收入");
assert.strictEqual(elements.dashboardTicketsLabel.textContent, "指定期間售票");
assert.strictEqual(elements.dashboardIncome.textContent, "NT$550");
assert.strictEqual(elements.dashboardTickets.textContent, "3 張");
assert.strictEqual(elements.dashboardOrders.textContent, "2 筆");
assert.strictEqual(elements.dashboardCancelled.textContent, "0 筆");
assert.ok(elements.dashboardDate.textContent.indexOf("2026/10/10 ～ 2026/10/11") >= 0);

console.log("PASS FIX40 dashboard labels and custom date range");
