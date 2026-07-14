// V7 Phase 1 Legacy Build | js/modules/payment.js
// =========================================
// 小怪獸售票機 V5.6.5
// 付款模組
// =========================================
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var countdownNumber = document.getElementById("countdownNumber");
var successTip = document.getElementById("successTip");
var linePayBtn = document.getElementById("linePayBtn");
var cashBtn = document.getElementById("cashBtn");
var paymentInProgress = false;
function setPaymentButtonsDisabled(disabled) {
    [
        linePayBtn,
        cashBtn,
        document.getElementById("cartLineBtn"),
        document.getElementById("cartCashBtn")
    ]
        .filter(Boolean)
        .forEach(function (button) {
        button.disabled = disabled;
    });
}
function resetPaymentLock() {
    paymentInProgress = false;
    setPaymentButtonsDisabled(false);
    if (typeof applyPaymentSetting ===
        "function") {
        applyPaymentSetting();
    }
}
// =========================================
// 建立售票紀錄
// =========================================
function saveSalesRecord(paymentType, totalAmount) {
    var now = new Date();
    var order = __assign(__assign({ orderNo: generateOrderNo(), date: now.toLocaleDateString("zh-TW"), time: now.toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit"
        }), payment: paymentType, amount: Number(totalAmount) || 0 }, (typeof getCurrentMemberOrderInfo === "function" ? getCurrentMemberOrderInfo() : {})), { items: cart.length > 0
            ? JSON.parse(JSON.stringify(cart))
            : [{
                    id: selectedTicket,
                    title: ticketData[selectedTicket].title,
                    price: ticketData[selectedTicket].price,
                    token: ticketData[selectedTicket].token || 0,
                    toy: ticketData[selectedTicket].toy || "none",
                    reward: ticketData[selectedTicket].reward || ""
                }], status: "normal" });
    currentPrintOrder = order;
    salesHistory.unshift(order);
    saveSalesHistory();
}
// =========================================
// 共用付款按鈕
// =========================================
function bindPaymentButton(button, paymentType) {
    if (!button)
        return;
    button.addEventListener("click", function () {
        playClick();
        paymentSuccess(paymentType);
    });
}
// =========================================
// 付款成功
// =========================================
function paymentSuccess(paymentType) {
    if (paymentInProgress) {
        return;
    }
    paymentInProgress = true;
    setPaymentButtonsDisabled(true);
    isReprint = false;
    var payItems = cart.length > 0
        ? cart
        : [{
                id: selectedTicket
            }];
    var totalAmount = 0;
    if (cart.length > 0) {
        totalAmount = cart.reduce(function (sum, item) {
            return sum + Number(item.price || 0);
        }, 0);
    }
    else if (selectedTicket) {
        totalAmount =
            Number(ticketData[selectedTicket].price || 0);
    }
    saveSalesRecord(paymentType, totalAmount);
    if (typeof applyMemberPurchase === "function")
        applyMemberPurchase(totalAmount);
    payItems.forEach(function (item) {
        var ticket = ticketData[item.id];
        if (!ticket)
            return;
        updateStats(todayStats, ticket, item);
        updateStats(monthStats, ticket, item);
        updateStats(totalStats, ticket, item);
    });
    saveTodayStats();
    showPage("successPage");
    countdownNumber.innerHTML = "";
    updateSuccessItems();
    startPrintAnimation();
    successTip.innerHTML =
        "👾 小怪獸正在準備您的票券...";
}
// =========================================
// 單張票券付款按鈕
// =========================================
bindPaymentButton(linePayBtn, "LINE Pay");
bindPaymentButton(cashBtn, "現金");
