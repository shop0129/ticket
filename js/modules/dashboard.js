// V7 Phase 1 Legacy Build | js/modules/dashboard.js
// =========================================
// 小怪獸售票機 V6.2
// 後台 Dashboard
// =========================================
var dashboardDate = document.getElementById("dashboardDate");
var dashboardIncome = document.getElementById("dashboardIncome");
var dashboardTickets = document.getElementById("dashboardTickets");
var dashboardCash = document.getElementById("dashboardCash");
var dashboardLinePay = document.getElementById("dashboardLinePay");
var dashboardOrders = document.getElementById("dashboardOrders");
var dashboardCancelled = document.getElementById("dashboardCancelled");
var dashboardMemberOrders = document.getElementById("dashboardMemberOrders");
var dashboardMemberIncome = document.getElementById("dashboardMemberIncome");
var dashboardNonMemberIncome = document.getElementById("dashboardNonMemberIncome");
var dashboardNewMembers = document.getElementById("dashboardNewMembers");
var dashboardRecentOrders = document.getElementById("dashboardRecentOrders");
// =========================================
// 顯示金額
// =========================================
function formatDashboardAmount(value) {
    return Number(value || 0)
        .toLocaleString("zh-TW");
}
// =========================================
// 最近訂單
// =========================================
function renderDashboardRecentOrders() {
    if (!dashboardRecentOrders)
        return;
    var recentOrders = (Array.isArray(salesHistory)
        ? salesHistory
        : []).slice(0, 5);
    if (recentOrders.length === 0) {
        dashboardRecentOrders.innerHTML = "\n\n<div class=\"dashboard-empty\">\n    \u76EE\u524D\u6C92\u6709\u552E\u7968\u7D00\u9304\n</div>\n\n";
        return;
    }
    var html = "";
    recentOrders.forEach(function (order) {
        var index = salesHistory.indexOf(order);
        var itemCount = Array.isArray(order.items)
            ? order.items.length
            : 0;
        var cancelled = order.status === "cancel";
        html += "\n\n<button\n    type=\"button\"\n    class=\"dashboard-order-row ".concat(cancelled ? "cancelled" : "", "\"\n    onclick=\"playClick(); openOrderDetail(").concat(index, ")\">\n\n    <div class=\"dashboard-order-main\">\n\n        <div class=\"dashboard-order-number\">\n            ").concat(order.orderNo || "未編號", "\n        </div>\n\n        <div class=\"dashboard-order-meta\">\n            ").concat(order.time || "", "\u30FB").concat(order.payment || "未記錄", "\u30FB").concat(itemCount, " \u5F35\n            ").concat(order.memberId ? "\u30FB\uD83D\uDC64 ".concat(order.memberName || "會員") : "", "\n        </div>\n\n    </div>\n\n    <div class=\"dashboard-order-right\">\n\n        <div class=\"dashboard-order-amount\">\n            NT$").concat(formatDashboardAmount(order.amount), "\n        </div>\n\n        <div class=\"dashboard-order-status\">\n            ").concat(cancelled ? "已作廢" : "正常", "\n        </div>\n\n    </div>\n\n</button>\n\n");
    });
    dashboardRecentOrders.innerHTML =
        html;
}
// =========================================
// 更新 Dashboard
// =========================================
function renderAdminDashboard() {
    if (!dashboardIncome)
        return;
    var report = typeof calculateShiftReport === "function"
        ? calculateShiftReport()
        : {
            date: new Date().toLocaleDateString("zh-TW"),
            totalAmount: 0,
            ticketCount: 0,
            cashAmount: 0,
            linePayAmount: 0,
            normalOrderCount: 0,
            cancelledOrderCount: 0
        };
    if (dashboardDate) {
        dashboardDate.textContent =
            "".concat(report.date, " \u4ECA\u65E5\u71DF\u904B\u6982\u6CC1");
    }
    dashboardIncome.textContent =
        "NT$".concat(formatDashboardAmount(report.totalAmount));
    dashboardTickets.textContent =
        "".concat(report.ticketCount, " \u5F35");
    dashboardCash.textContent =
        "NT$".concat(formatDashboardAmount(report.cashAmount));
    dashboardLinePay.textContent =
        "NT$".concat(formatDashboardAmount(report.linePayAmount));
    dashboardOrders.textContent =
        "".concat(report.normalOrderCount, " \u7B46");
    dashboardCancelled.textContent =
        "".concat(report.cancelledOrderCount, " \u7B46");
    var today = new Date().toLocaleDateString("zh-TW");
    var todayOrders = (Array.isArray(salesHistory)
        ? salesHistory
        : []).filter(function (order) {
        return order.date === today &&
            order.status !== "cancel";
    });
    var memberOrders = todayOrders.filter(function (order) {
        return Boolean(order.memberId);
    });
    var nonMemberOrders = todayOrders.filter(function (order) {
        return !order.memberId;
    });
    var memberIncome = memberOrders.reduce(function (sum, order) {
        return sum + Number(order.amount || 0);
    }, 0);
    var nonMemberIncome = nonMemberOrders.reduce(function (sum, order) {
        return sum + Number(order.amount || 0);
    }, 0);
    var newMembers = (typeof memberData !== "undefined" &&
        Array.isArray(memberData)
        ? memberData
        : []).filter(function (member) {
        return member.joinDate === today;
    }).length;
    if (dashboardMemberOrders) {
        dashboardMemberOrders.textContent =
            "".concat(memberOrders.length, " \u7B46");
    }
    if (dashboardMemberIncome) {
        dashboardMemberIncome.textContent =
            "NT$".concat(formatDashboardAmount(memberIncome));
    }
    if (dashboardNonMemberIncome) {
        dashboardNonMemberIncome.textContent =
            "NT$".concat(formatDashboardAmount(nonMemberIncome));
    }
    if (dashboardNewMembers) {
        dashboardNewMembers.textContent =
            "".concat(newMembers, " \u4EBA");
    }
    renderDashboardRecentOrders();
}
// =========================================
// 回到後台首頁時自動更新
// =========================================
document.addEventListener("click", function (event) {
    var button = event.target.closest('[onclick*="adminHomePage"]');
    if (!button)
        return;
    setTimeout(renderAdminDashboard, 0);
});
window.addEventListener("focus", renderAdminDashboard);
renderAdminDashboard();
