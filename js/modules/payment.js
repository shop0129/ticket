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
function saveSalesRecord(paymentType, totalAmount, pointUse) {
    var now = new Date();
    var order = __assign(__assign({ orderNo: generateOrderNo(), date: now.toLocaleDateString("zh-TW"), time: now.toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit"
        }), payment: paymentType, amount: Math.max(0, (Number(totalAmount)||0) - Number(pointUse && pointUse.discount || 0)), originalAmount: Number(totalAmount) || 0, usedPoints: Number(pointUse && pointUse.points || 0), pointDiscount: Number(pointUse && pointUse.discount || 0), paidAmount: Math.max(0, (Number(totalAmount)||0) - Number(pointUse && pointUse.discount || 0)) }, (typeof getCurrentMemberOrderInfo === "function" ? getCurrentMemberOrderInfo() : {})), { items: cart.length > 0
            ? JSON.parse(JSON.stringify(cart))
            : [{
                    id: selectedTicket,
                    title: ticketData[selectedTicket].title,
                    price: ticketData[selectedTicket].price,
                    token: ticketData[selectedTicket].token || 0,
                    toy: ticketData[selectedTicket].toy || "none",
                    reward: ticketData[selectedTicket].reward || "",
                    canEnter: ticketData[selectedTicket].canEnter !== false,
                    admissionRequired: ticketData[selectedTicket].canEnter !== false,
                    pickupItem: ticketData[selectedTicket].pickupItem || "none",
                    timeMode: ticketData[selectedTicket].timeMode || (ticketData[selectedTicket].canEnter !== false ? "duration" : "none"),
                    playHours: Number(ticketData[selectedTicket].playHours || ticketData[selectedTicket].hour || 0),
                    playMinutes: Number(ticketData[selectedTicket].playMinutes || (ticketData[selectedTicket].hour ? ticketData[selectedTicket].hour * 60 : 0)),
                    fixedExitTime: ticketData[selectedTicket].fixedExitTime || ""
                }], status: "normal" });
    if (window.MonsterAuth) {
        order = MonsterAuth.decorateRecord(order, "kiosk");
    }
    if (window.MonsterTicketValidation) {
        order = MonsterTicketValidation.decorateOrder(order);
    }
    currentPrintOrder = order;
    salesHistory.unshift(order);
    saveSalesHistory();
    if (window.MonsterAuth) {
        MonsterAuth.audit(
            "order.create",
            "建立訂單：" + order.orderNo + "，金額 NT$" + order.amount,
            { source: order.source || "kiosk", targetType: "order", targetId: order.orderNo }
        );
    }
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
    var pointUse = window.ConsumePoints ? ConsumePoints.current() : {points:0,discount:0};
    if (pointUse.points > 0 && (!window.currentMember || Number(currentMember.points||0) < pointUse.points)) { alert("❌ 會員點數不足，請重新確認"); resetPaymentLock(); return; }
    saveSalesRecord(paymentType, totalAmount, pointUse);
    if (typeof applyMemberPurchase === "function")
        applyMemberPurchase(Math.max(0,totalAmount-pointUse.discount), currentPrintOrder, pointUse);
    if (window.ConsumePoints) ConsumePoints.reset();
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
