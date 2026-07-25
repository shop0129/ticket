// V7 Phase 1 Legacy Build | js/modules/history.js
// =========================================
// 小怪獸售票機 V5.6.4
// 售票紀錄模組
// =========================================
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var salesHistoryList = document.getElementById("salesHistoryList");
var orderDetailContent = document.getElementById("orderDetailContent");
// =========================================
// 開啟售票紀錄
// =========================================
function openSalesHistory() {
    renderSalesHistory();
    showPage("salesHistoryPage");
}
// =========================================
// 金額格式
// =========================================
function getHistoryOrderAmount(order) { return Number(order && order.paidAmount != null ? order.paidAmount : (order && order.amount || 0)); }
function formatHistoryAmount(value) {
    return Number(value || 0)
        .toLocaleString("zh-TW");
}
// =========================================
// 售票紀錄搜尋條件
// =========================================
function getHistorySearchValues() {
    var keywordInput = document.getElementById("historySearchInput");
    var paymentSelect = document.getElementById("historyPaymentFilter");
    var statusSelect = document.getElementById("historyStatusFilter");
    return {
        keyword: keywordInput
            ? keywordInput.value.trim().toLowerCase()
            : "",
        payment: paymentSelect
            ? paymentSelect.value
            : "all",
        status: statusSelect
            ? statusSelect.value
            : "all"
    };
}
function getFilteredSalesHistory() {
    var filters = getHistorySearchValues();
    return (Array.isArray(salesHistory)
        ? salesHistory
        : [])
        .map(function (order, index) { return ({
        order: order,
        index: index
    }); })
        .filter(function (entry) {
        var order = entry.order;
        var searchableText = __spreadArray([
            order.orderNo,
            order.date,
            order.time,
            order.payment,
            order.amount,
            order.memberName,
            order.memberPhone,
            order.memberNo
        ], __read((Array.isArray(order.items)
            ? order.items.map(function (item) {
                return item.title || item.id || "";
            })
            : [])), false).join(" ")
            .toLowerCase();
        var keywordMatched = !filters.keyword ||
            searchableText.includes(filters.keyword);
        var paymentMatched = filters.payment === "all" ||
            order.payment === filters.payment;
        var statusMatched = filters.status === "all" ||
            (filters.status === "normal" &&
                order.status !== "cancel") ||
            (filters.status === "cancel" &&
                order.status === "cancel");
        return (keywordMatched &&
            paymentMatched &&
            statusMatched);
    });
}
// =========================================
// 顯示售票紀錄
// =========================================
function renderSalesHistory() {
    if (!salesHistoryList)
        return;
    if (!Array.isArray(salesHistory) ||
        salesHistory.length === 0) {
        salesHistoryList.innerHTML = "\n\n<div class=\"history-empty-card\">\n\n    <div class=\"history-empty-icon\">\n        \uD83E\uDDFE\n    </div>\n\n    <div class=\"history-empty-title\">\n        \u76EE\u524D\u6C92\u6709\u552E\u7968\u7D00\u9304\n    </div>\n\n    <div class=\"history-empty-text\">\n        \u5B8C\u6210\u552E\u7968\u5F8C\uFF0C\u8A02\u55AE\u6703\u986F\u793A\u5728\u9019\u88E1\n    </div>\n\n</div>\n\n";
        return;
    }
    var filteredHistory = getFilteredSalesHistory();
    if (filteredHistory.length === 0) {
        salesHistoryList.innerHTML = "\n\n<div class=\"history-empty-card\">\n\n    <div class=\"history-empty-icon\">\n        \uD83D\uDD0D\n    </div>\n\n    <div class=\"history-empty-title\">\n        \u627E\u4E0D\u5230\u7B26\u5408\u689D\u4EF6\u7684\u8A02\u55AE\n    </div>\n\n    <div class=\"history-empty-text\">\n        \u8ACB\u8ABF\u6574\u641C\u5C0B\u95DC\u9375\u5B57\u6216\u7BE9\u9078\u689D\u4EF6\n    </div>\n\n</div>\n\n";
        return;
    }
    var html = "";
    filteredHistory.forEach(function (_a) {
        var order = _a.order, index = _a.index;
        var isCancelled = order.status === "cancel";
        var itemCount = Array.isArray(order.items)
            ? order.items.length
            : 0;
        html += "\n\n<div\n    class=\"historyCard ".concat(isCancelled ? "history-cancelled" : "", "\"\n    onclick=\"openOrderDetail(").concat(index, ")\">\n\n    <div class=\"history-card-header\">\n\n        <div>\n\n            <div class=\"history-time\">\n                \uD83D\uDD52 ").concat(order.date || "", " ").concat(order.time || "", "\n            </div>\n\n            <div class=\"historyOrderNo\">\n                \uD83C\uDD94 ").concat(order.orderNo || "未編號", "\n            </div>\n\n        </div>\n\n        <div class=\"history-status-area\">\n\n            <div class=\"history-payment\">\n                \uD83D\uDCB3 ").concat(order.payment || "未記錄", "\n            </div>\n\n            ").concat(order.memberId
            ? "\n                <div class=\"history-member-badge\">\n                    \uD83D\uDC64 ".concat(order.memberName || "會員", "\n                </div>\n                ")
            : "", "\n\n            ").concat(isCancelled
            ? "<div class=\"cancelBadge\">\u274C \u5DF2\u4F5C\u5EE2</div>"
            : "<div class=\"normalBadge\">\uD83D\uDFE2 \u6B63\u5E38</div>", "\n\n        </div>\n\n    </div>\n\n    <div class=\"history-card-body\">\n\n        <div class=\"history-item-count\">\n            \uD83C\uDFAB \u5171 ").concat(itemCount, " \u5F35\u7968\u5238\n        </div>\n\n        <div class=\"historyAmount\">\n            NT$").concat(formatHistoryAmount(getHistoryOrderAmount(order)), "\n        </div>\n\n    </div>\n\n    <div class=\"history-card-footer\">\n\n        <button\n            type=\"button\"\n            class=\"history-detail-btn\"\n            onclick=\"event.stopPropagation(); playClick(); openOrderDetail(").concat(index, ")\">\n            \u67E5\u770B\u660E\u7D30\n        </button>\n\n        <button\n            type=\"button\"\n            class=\"deleteHistoryBtn\"\n            onclick=\"deleteSalesHistory(event,").concat(index, ")\">\n            \uD83D\uDDD1\uFE0F \u522A\u9664\u7D00\u9304\n        </button>\n\n    </div>\n\n</div>\n\n");
    });
    salesHistoryList.innerHTML = html;
}
// =========================================
// 刪除售票紀錄
// =========================================
function deleteSalesHistory(clickEvent, index) {
    if (clickEvent) {
        clickEvent.stopPropagation();
    }
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("order.cancel", "❌ 只有店長可以刪除售票紀錄")) {
        return;
    }
    if (!confirm("確定要刪除這筆售票紀錄？")) {
        return;
    }
    if (!Array.isArray(salesHistory) ||
        index < 0 ||
        index >= salesHistory.length) {
        return;
    }
    var deletedOrder = salesHistory[index];
    salesHistory.splice(index, 1);
    saveSalesHistory();
    if (window.MonsterAuth) {
        MonsterAuth.audit(
            "order.delete_record",
            "刪除售票紀錄：" + (deletedOrder.orderNo || ""),
            { source: "admin", targetType: "order", targetId: deletedOrder.orderNo || "" }
        );
    }
    renderSalesHistory();
}
// =========================================
// 整理訂單內容
// =========================================
function summarizeOrderItems(order) {
    var items = Array.isArray(order.items)
        ? order.items
        : [];
    var groupedItems = {};
    var totalToken = 0;
    var greenToy = 0;
    var redToy = 0;
    items.forEach(function (item) {
        if (!item)
            return;
        var itemId = item.id ||
            item.title ||
            "unknown";
        if (!groupedItems[itemId]) {
            groupedItems[itemId] = {
                title: item.title ||
                    "未命名票券",
                qty: 0,
                totalPrice: 0
            };
        }
        groupedItems[itemId].qty++;
        groupedItems[itemId].totalPrice +=
            Number(item.price || 0);
        totalToken +=
            Number(item.token || 0);
        if (item.toy === "green") {
            greenToy++;
        }
        if (item.toy === "red") {
            redToy++;
        }
    });
    return {
        groupedItems: groupedItems,
        totalToken: totalToken,
        greenToy: greenToy,
        redToy: redToy
    };
}
// =========================================
// 產生購買內容
// =========================================
function renderOrderItemRows(groupedItems) {
    var html = "";
    for (var id in groupedItems) {
        var item = groupedItems[id];
        html += "\n\n<div class=\"detailItem\">\n\n    <span class=\"detail-item-name\">\n        \uD83C\uDFAB ".concat(item.title, " \u00D7 ").concat(item.qty, "\n    </span>\n\n    <span class=\"detailItemPrice\">\n        NT$").concat(formatHistoryAmount(item.totalPrice), "\n    </span>\n\n</div>\n\n");
    }
    if (html === "") {
        html = "\n\n<div class=\"history-detail-empty\">\n    \u7121\u8CFC\u8CB7\u5167\u5BB9\n</div>\n\n";
    }
    return html;
}
// =========================================
// 產生贈送內容
// =========================================
function renderOrderRewardRows(totalToken, greenToy, redToy) {
    var html = "\n\n<div class=\"detailRow\">\n    \uD83E\uDE99 \u904A\u6232\u4EE3\u5E63\uFF1A".concat(formatHistoryAmount(totalToken), " \u679A\n</div>\n\n");
    if (greenToy > 0) {
        html += "\n\n<div class=\"detailRow\">\n    \uD83D\uDFE2 \u7DA0\u6A19\u73A9\u5177\uFF1A".concat(greenToy, " \u500B\n</div>\n\n");
    }
    if (redToy > 0) {
        html += "\n\n<div class=\"detailRow\">\n    \uD83D\uDD34 \u7D05\u6A19\u73A9\u5177\uFF1A".concat(redToy, " \u500B\n</div>\n\n");
    }
    if (totalToken === 0 &&
        greenToy === 0 &&
        redToy === 0) {
        html = "\n\n<div class=\"detailRow\">\n    \u7121\u8D08\u9001\u5167\u5BB9\n</div>\n\n";
    }
    return html;
}
// =========================================
// 開啟訂單明細
// =========================================
function openOrderDetail(index) {
    var order = salesHistory[index];
    if (!order)
        return;
    var summary = summarizeOrderItems(order);
    var htmlItems = renderOrderItemRows(summary.groupedItems);
    var htmlRewards = renderOrderRewardRows(summary.totalToken, summary.greenToy, summary.redToy);
    var isCancelled = order.status === "cancel";
    var html = "\n\n<div class=\"detailCard order-detail-card\">\n\n    <div class=\"order-detail-header\">\n\n        <div>\n\n            <div class=\"detailTitle\">\n                \uD83C\uDD94 ".concat(order.orderNo || "未編號", "\n            </div>\n\n            <div class=\"detailRow\">\n                \uD83D\uDD52 ").concat(order.date || "", " ").concat(order.time || "", "\n            </div>\n\n            <div class=\"detailRow\">\n                \uD83D\uDCB3 ").concat(order.payment || "未記錄", "\n            </div>\n\n        </div>\n\n        ").concat(isCancelled
        ? "<div class=\"cancelBadge detail-status-badge\">\u274C \u5DF2\u4F5C\u5EE2</div>"
        : "<div class=\"normalBadge detail-status-badge\">\uD83D\uDFE2 \u6B63\u5E38</div>", "\n\n    </div>\n\n    ").concat(order.memberId
        ? "\n        <div class=\"order-member-section\">\n\n            <div class=\"order-member-title\">\n                \uD83D\uDC64 \u6703\u54E1\u8CC7\u6599\n            </div>\n\n            <div class=\"order-member-grid\">\n\n                <div>\n                    <span>\u59D3\u540D</span>\n                    <strong>".concat(order.memberName || "", "</strong>\n                </div>\n\n                <div>\n                    <span>\u624B\u6A5F</span>\n                    <strong>").concat(order.memberPhone || "", "</strong>\n                </div>\n\n                <div>\n                    <span>\u6703\u54E1\u7DE8\u865F</span>\n                    <strong>").concat(order.memberNo || "", "</strong>\n                </div>\n\n            </div>\n\n        </div>\n        ")
        : "\n        <div class=\"order-nonmember-badge\">\n            \u975E\u6703\u54E1\u4EA4\u6613\n        </div>\n        ", "\n\n    <div class=\"order-detail-section\">\n\n        <h3>\n            \uD83C\uDFAB \u8CFC\u8CB7\u5167\u5BB9\n        </h3>\n\n        ").concat(htmlItems, "\n\n    </div>\n\n    <div class=\"order-detail-section\">\n\n        <h3>\n            \uD83C\uDF81 \u8D08\u9001\u5167\u5BB9\n        </h3>\n\n        ").concat(htmlRewards, "\n\n    </div>\n\n    <div class=\"order-detail-total\">\n\n        <div class=\"order-detail-total-label\">\n            \u8A02\u55AE\u91D1\u984D\n        </div>\n\n        <div class=\"detailPrice\">\n            NT$").concat(formatHistoryAmount(getHistoryOrderAmount(order)), "\n        </div>\n\n    </div>\n\n    <div id=\"toyPointOrderPanel\"></div>\n\n    <div class=\"detailButtons\">\n\n        <button\n            type=\"button\"\n            class=\"big-btn reprint-btn\"\n            ").concat(isCancelled
        ? "disabled"
        : "onclick=\"reprintOrder('".concat(order.orderNo, "')\""), ">\n\n            ").concat(isCancelled
        ? "🚫 已作廢不可補印"
        : "🖨️ 補印票券", "\n\n        </button>\n\n        <button\n            type=\"button\"\n            class=\"big-btn cancelBtn\"\n            ").concat(isCancelled
        ? "disabled"
        : "onclick=\"cancelOrder('".concat(order.orderNo, "')\""), ">\n\n            ").concat(isCancelled
        ? "✅ 已作廢"
        : "❌ 作廢訂單", "\n\n        </button>\n\n    </div>\n\n</div>\n\n");
    if (orderDetailContent) {
        orderDetailContent.innerHTML = html;
    }
    if (typeof renderToyPointOrderPanel ===
        "function") {
        renderToyPointOrderPanel(order.orderNo);
    }
    showPage("orderDetailPage");
}
// =========================================
// 補印票券
// =========================================
function reprintOrder(orderNo) {
    playClick();
    var order = salesHistory.find(function (item) {
        return item.orderNo === orderNo;
    });
    if (!order)
        return;
    isReprint = true;
    currentPrintOrder = order;
    if (window.MonsterAuth) {
        MonsterAuth.audit(
            "order.reprint",
            "補印訂單：" + orderNo,
            { source: "staff", targetType: "order", targetId: orderNo }
        );
    }
    showPage("successPage");
    updateSuccessItems();
    startPrintAnimation();
}
// =========================================
// 作廢訂單
// =========================================
function cancelOrder(orderNo) {
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("order.cancel", "❌ 只有店長可以作廢訂單")) {
        return;
    }
    var order = salesHistory.find(function (item) {
        return item.orderNo === orderNo;
    });
    if (!order)
        return;
    if (order.status === "cancel") {
        alert("此訂單已經作廢！");
        return;
    }
    if (!confirm("確定要作廢這筆訂單？")) {
        return;
    }
    if (typeof canRollbackMemberOrder ===
        "function" &&
        !canRollbackMemberOrder(order)) {
        return;
    }
    order.status = "cancel";
    order.playStatus = "cancelled";
    order.validationStatus = "cancelled";
    order.cancelled = true;
    order.voided = true;
    if (window.MonsterAuth) {
        var cancelActor = MonsterAuth.getActor("admin");
        order.cancelledAt = Date.now();
        order.cancelledBy = cancelActor.name;
        order.cancelledById = cancelActor.id;
        order.cancelledByRole = cancelActor.role;
    }
    if (typeof rollbackMemberPurchase ===
        "function") {
        rollbackMemberPurchase(order);
    }
    var items = Array.isArray(order.items)
        ? order.items
        : [];
    items.forEach(function (item) {
        rollbackStats(todayStats, item, item);
        rollbackStats(monthStats, item, item);
        rollbackStats(totalStats, item, item);
    });
    saveTodayStats();
    saveSalesHistory();
    if (window.MonsterAuth) {
        MonsterAuth.audit(
            "order.cancel",
            "作廢訂單：" + orderNo,
            { source: "admin", targetType: "order", targetId: orderNo }
        );
    }
    alert("✅ 訂單已作廢");
    var index = salesHistory.findIndex(function (item) {
        return item.orderNo === orderNo;
    });
    openOrderDetail(index);
}
