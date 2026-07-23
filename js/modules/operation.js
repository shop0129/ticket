// V7 Phase 1 Legacy Build | js/modules/operation.js
// =========================================
// 小怪獸售票機 V6.1A
// 交易流程優化
// =========================================
var shiftReportContent = document.getElementById("shiftReportContent");
// =========================================
// 今日日期
// =========================================
function getOperationTodayDate() {
    return new Date()
        .toLocaleDateString("zh-TW");
}
// =========================================
// 取得今日訂單
// =========================================
function getTodaySalesOrders() {
    var today = getOperationTodayDate();
    return (Array.isArray(salesHistory)
        ? salesHistory
        : []).filter(function (order) {
        return order.date === today;
    });
}
// =========================================
// 計算交班報表
// =========================================
function calculateShiftReport() {
    var orders = getTodaySalesOrders();
    var normalOrders = orders.filter(function (order) {
        return order.status !== "cancel";
    });
    var cancelledOrders = orders.filter(function (order) {
        return order.status === "cancel";
    });
    var cashAmount = 0;
    var linePayAmount = 0;
    var otherAmount = 0;
    var ticketCount = 0;
    var tokenCount = 0;
    var greenToy = 0;
    var redToy = 0;
    var parentCount = 0;
    normalOrders.forEach(function (order) {
        var amount = Number(order.paidAmount != null ? order.paidAmount : order.amount || 0);
        if (order.payment === "現金") {
            cashAmount += amount;
        }
        else if (order.payment === "LINE Pay") {
            linePayAmount += amount;
        }
        else {
            otherAmount += amount;
        }
        var items = Array.isArray(order.items)
            ? order.items
            : [];
        ticketCount +=
            items.length;
        items.forEach(function (item) {
            tokenCount += window.MonsterTicketDataSync
                ? MonsterTicketDataSync.tokenOf(item)
                : Number(item.token || 0);
            if (item.toy === "green") {
                greenToy++;
            }
            if (item.toy === "red") {
                redToy++;
            }
            if (item.id === "parent") {
                parentCount++;
            }
        });
    });
    return {
        date: getOperationTodayDate(),
        normalOrderCount: normalOrders.length,
        cancelledOrderCount: cancelledOrders.length,
        ticketCount: ticketCount,
        cashAmount: cashAmount,
        linePayAmount: linePayAmount,
        otherAmount: otherAmount,
        totalAmount: cashAmount +
            linePayAmount +
            otherAmount,
        tokenCount: tokenCount,
        greenToy: greenToy,
        redToy: redToy,
        parentCount: parentCount
    };
}
// =========================================
// 金額格式
// =========================================
function formatOperationAmount(value) {
    return Number(value || 0)
        .toLocaleString("zh-TW");
}
// =========================================
// 開啟交班報表
// =========================================
function openShiftReport() {
    renderShiftReport();
    showPage("shiftReportPage");
}
// =========================================
// 顯示交班報表
// =========================================
function renderShiftReport() {
    if (!shiftReportContent)
        return;
    var report = calculateShiftReport();
    shiftReportContent.innerHTML = "\n\n<div class=\"shift-report-card\">\n\n    <div class=\"shift-report-header\">\n\n        <div>\n\n            <div class=\"shift-report-title\">\n                \uD83D\uDCCB \u4ECA\u65E5\u4EA4\u73ED\u5831\u8868\n            </div>\n\n            <div class=\"shift-report-date\">\n                ".concat(report.date, "\n            </div>\n\n        </div>\n\n        <div class=\"shift-report-order-count\">\n            \u6B63\u5E38\u8A02\u55AE ").concat(report.normalOrderCount, " \u7B46\n        </div>\n\n    </div>\n\n    <div class=\"shift-summary-grid\">\n\n        <div class=\"shift-summary-card shift-total-card\">\n\n            <div class=\"shift-summary-label\">\n                \u4ECA\u65E5\u7E3D\u6536\u5165\n            </div>\n\n            <div class=\"shift-summary-value\">\n                NT$").concat(formatOperationAmount(report.totalAmount), "\n            </div>\n\n        </div>\n\n        <div class=\"shift-summary-card\">\n\n            <div class=\"shift-summary-label\">\n                \u73FE\u91D1\u6536\u5165\n            </div>\n\n            <div class=\"shift-summary-value\">\n                NT$").concat(formatOperationAmount(report.cashAmount), "\n            </div>\n\n        </div>\n\n        <div class=\"shift-summary-card\">\n\n            <div class=\"shift-summary-label\">\n                LINE Pay\n            </div>\n\n            <div class=\"shift-summary-value\">\n                NT$").concat(formatOperationAmount(report.linePayAmount), "\n            </div>\n\n        </div>\n\n        <div class=\"shift-summary-card\">\n\n            <div class=\"shift-summary-label\">\n                \u5176\u4ED6\u4ED8\u6B3E\n            </div>\n\n            <div class=\"shift-summary-value\">\n                NT$").concat(formatOperationAmount(report.otherAmount), "\n            </div>\n\n        </div>\n\n    </div>\n\n    <div class=\"shift-detail-grid\">\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83C\uDFAB \u552E\u51FA\u7968\u5238</span>\n            <strong>").concat(report.ticketCount, " \u5F35</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83E\uDDFE \u6B63\u5E38\u8A02\u55AE</span>\n            <strong>").concat(report.normalOrderCount, " \u7B46</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\u274C \u4F5C\u5EE2\u8A02\u55AE</span>\n            <strong>").concat(report.cancelledOrderCount, " \u7B46</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83E\uDE99 \u61C9\u767C\u4EE3\u5E63</span>\n            <strong>").concat(report.tokenCount, " \u679A</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83D\uDFE2 \u7DA0\u6A19\u73A9\u5177</span>\n            <strong>").concat(report.greenToy, " \u500B</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83D\uDD34 \u7D05\u6A19\u73A9\u5177</span>\n            <strong>").concat(report.redToy, " \u500B</strong>\n        </div>\n\n        <div class=\"shift-detail-item\">\n            <span>\uD83D\uDC68 \u966A\u540C\u7968</span>\n            <strong>").concat(report.parentCount, " \u5F35</strong>\n        </div>\n\n    </div>\n\n    <div class=\"shift-report-actions\">\n\n        <button\n            class=\"big-btn shift-refresh-btn\"\n            onclick=\"playClick(); renderShiftReport()\">\n            \uD83D\uDD04 \u91CD\u65B0\u8A08\u7B97\n        </button>\n\n        <button\n            class=\"big-btn shift-print-btn\"\n            onclick=\"printShiftReport()\">\n            \uD83D\uDDA8\uFE0F \u5217\u5370\u5831\u8868\n        </button>\n\n    </div>\n\n</div>\n\n");
}
// =========================================
// 列印交班報表
// =========================================
function printShiftReport() {
    playClick();
    renderShiftReport();
    window.print();
}
// =========================================
// 一鍵補印最近一筆
// =========================================
function reprintLatestOrder() {
    playClick();
    var latestOrder = (Array.isArray(salesHistory)
        ? salesHistory
        : []).find(function (order) {
        return order.status !== "cancel";
    });
    if (!latestOrder) {
        alert("目前沒有可補印的正常訂單");
        return;
    }
    var confirmed = confirm("\u78BA\u5B9A\u88DC\u5370\u6700\u8FD1\u4E00\u7B46\u8A02\u55AE\uFF1F\n\n\u8A02\u55AE\u7DE8\u865F\uFF1A".concat(latestOrder.orderNo, "\n\u91D1\u984D\uFF1ANT$").concat(formatOperationAmount(latestOrder.amount)));
    if (!confirmed)
        return;
    reprintOrder(latestOrder.orderNo, true);
}
// =========================================
// 售票紀錄搜尋
// =========================================
function refreshHistorySearch() {
    renderSalesHistory();
}
function clearHistorySearch() {
    playClick();
    var keywordInput = document.getElementById("historySearchInput");
    var paymentSelect = document.getElementById("historyPaymentFilter");
    var statusSelect = document.getElementById("historyStatusFilter");
    if (keywordInput) {
        keywordInput.value = "";
    }
    if (paymentSelect) {
        paymentSelect.value = "all";
    }
    if (statusSelect) {
        statusSelect.value = "all";
    }
    renderSalesHistory();
}
var historySearchInput = document.getElementById("historySearchInput");
var historyPaymentFilter = document.getElementById("historyPaymentFilter");
var historyStatusFilter = document.getElementById("historyStatusFilter");
if (historySearchInput) {
    historySearchInput.addEventListener("input", refreshHistorySearch);
}
if (historyPaymentFilter) {
    historyPaymentFilter.addEventListener("change", refreshHistorySearch);
}
if (historyStatusFilter) {
    historyStatusFilter.addEventListener("change", refreshHistorySearch);
}
