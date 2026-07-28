// 小怪獸售票機 V7.8.3.3 Sprint 10
// LINE Pay Offline API 掃碼＋本機硬體現金授權共用交易核心
// Android WebView 61 相容（ES5）
var countdownNumber = document.getElementById("countdownNumber");
var successTip = document.getElementById("successTip");
var linePayBtn = document.getElementById("linePayBtn");
var cashBtn = document.getElementById("cashBtn");
var paymentInProgress = false;

function clonePaymentValue(value) {
    return JSON.parse(JSON.stringify(value === undefined ? null : value));
}

function setPaymentButtonsDisabled(disabled) {
    [
        linePayBtn,
        cashBtn,
        document.getElementById("cartLineBtn"),
        document.getElementById("cartCashBtn")
    ].filter(Boolean).forEach(function (button) {
        button.disabled = !!disabled;
    });
}

function resetPaymentLock() {
    if (window.MonsterCashBridge && window.MonsterCashBridge.hasBlockingTransaction()) {
        return;
    }
    if (window.MonsterLinePayScanner && window.MonsterLinePayScanner.hasBlockingTransaction()) {
        return;
    }
    paymentInProgress = false;
    setPaymentButtonsDisabled(false);
    if (typeof applyPaymentSetting === "function") {
        applyPaymentSetting();
    }
}

function paymentTicketSnapshot(id, source) {
    var live = ticketData[id] || source || {};
    // V7.7+ snapshot 會保留 timeMode、playHours、playMinutes、fixedExitTime 等票券規則。
    if (window.MonsterTicketDataSync) {
        return MonsterTicketDataSync.snapshot(id, live);
    }
    return Object.assign({ id: id }, clonePaymentValue(source || live));
}

function currentPaymentItems() {
    if (cart.length > 0) {
        return cart.map(function (item) {
            return paymentTicketSnapshot(item.id, item);
        });
    }
    if (selectedTicket && ticketData[selectedTicket]) {
        return [paymentTicketSnapshot(selectedTicket, ticketData[selectedTicket])];
    }
    return [];
}

function validatePaymentItems(items) {
    if (!items.length) {
        throw new Error("請先選擇票券");
    }
    items.forEach(function (item) {
        var ticket = ticketData[item.id] || item;
        var sale = window.MonsterSaleRule
            ? MonsterSaleRule.evaluate(item.id, ticket)
            : { available: true };
        if (!sale.available) {
            if (typeof renderTicketCatalog === "function") renderTicketCatalog();
            throw new Error("「" + ((ticket && ticket.title) || "票券") + "」" + (sale.label || "目前無法購買"));
        }
    });
}

function currentPointUse() {
    var value = window.ConsumePoints
        ? ConsumePoints.current()
        : { points: 0, discount: 0 };
    return {
        points: Math.max(0, Number(value && value.points || 0)),
        discount: Math.max(0, Number(value && value.discount || 0))
    };
}

function validatePointUse(pointUse) {
    if (pointUse.points <= 0) return;
    if (!window.currentMember || Number(currentMember.points || 0) < pointUse.points) {
        throw new Error("會員點數不足，請重新確認");
    }
}

// 付款前完整凍結訂單內容。現金控制器只收到扣除點數後真正需收取的整數金額。
function buildPaymentContext() {
    var items = currentPaymentItems();
    validatePaymentItems(items);
    var originalAmount = items.reduce(function (sum, item) {
        return sum + Number(item.price || 0);
    }, 0);
    if (!isFinite(originalAmount) || originalAmount <= 0) {
        throw new Error("找不到可付款的票券或金額");
    }
    var pointUse = currentPointUse();
    validatePointUse(pointUse);
    pointUse.discount = Math.min(Math.round(originalAmount), Math.round(pointUse.discount));
    var paidAmount = Math.max(0, Math.round(originalAmount) - pointUse.discount);
    var activePage = document.querySelector
        ? document.querySelector(".page.active")
        : null;
    var purchasePage = activePage && activePage.id === "detailPage"
        ? "detailPage"
        : "ticketPage";
    return {
        orderNo: generateOrderNo(),
        amount: paidAmount,
        originalAmount: Math.round(originalAmount),
        pointUse: pointUse,
        items: clonePaymentValue(items),
        memberInfo: typeof getCurrentMemberOrderInfo === "function"
            ? clonePaymentValue(getCurrentMemberOrderInfo())
            : {},
        purchasePage: purchasePage,
        createdAt: Date.now()
    };
}

function restoreFailedCashCheckout(context, requestedPage) {
    var target = requestedPage === "homePage" ||
        requestedPage === "ticketPage" ||
        requestedPage === "detailPage"
        ? requestedPage
        : context && context.purchasePage === "detailPage"
            ? "detailPage"
            : "ticketPage";
    if (typeof updateCartPanel === "function") updateCartPanel();
    if (window.ConsumePoints && typeof window.ConsumePoints.render === "function") {
        window.ConsumePoints.render();
    }
    if (typeof showPage === "function") showPage(target);
}

function findExistingAuthorizedOrder(context, hardware) {
    var authorizationId = hardware && hardware.authorizationId;
    var transactionId = hardware && hardware.transactionId;
    var paymentId = hardware && hardware.paymentId;
    return salesHistory.find(function (order) {
        return order && (
            (authorizationId && order.printAuthorizationId === authorizationId) ||
            (transactionId && order.linePayTransactionId === transactionId) ||
            (paymentId && order.linePayPaymentId === paymentId) ||
            order.orderNo === context.orderNo
        );
    }) || null;
}

function attachContextMember(context) {
    var memberId = context && context.memberInfo && context.memberInfo.memberId;
    if (!memberId || typeof memberData === "undefined" || !Array.isArray(memberData)) return;
    if (window.currentMember && currentMember.id === memberId) return;
    var matched = memberData.find(function (member) { return member && member.id === memberId; });
    if (matched) {
        currentMember = matched;
        window.currentMember = matched;
    }
}

// 必須先保存授權訂單，再執行會員與統計副作用；相同授權重送時不再建立或出票。
function savePaymentSalesRecord(paymentType, context, hardware) {
    var existing = findExistingAuthorizedOrder(context, hardware);
    if (existing) {
        currentPrintOrder = existing;
        window.currentPrintOrder = existing;
        return { order: existing, created: false };
    }
    var now = new Date(context.createdAt || Date.now());
    var pointUse = context.pointUse || { points: 0, discount: 0 };
    var order = Object.assign({
        orderNo: context.orderNo,
        date: now.toLocaleDateString("zh-TW"),
        time: now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
        payment: paymentType,
        amount: Number(context.amount) || 0,
        originalAmount: Number(context.originalAmount) || Number(context.amount) || 0,
        usedPoints: Number(pointUse.points || 0),
        pointDiscount: Number(pointUse.discount || 0),
        paidAmount: Number(context.amount) || 0
    }, clonePaymentValue(context.memberInfo || {}), {
        items: clonePaymentValue(context.items || []),
        status: "normal",
        createdAt: context.createdAt || Date.now(),
        updatedAt: Date.now()
    });
    if (hardware && paymentType === "現金") {
        order.paymentId = hardware.paymentId || "";
        order.printAuthorizationId = hardware.authorizationId || "";
        order.hardwarePaidAt = Number(hardware.paidAt || Date.now());
        order.hardwareCashStatus = "authorized";
        order.hardwareBridgeVersion = hardware.bridgeVersion || "1.8-sprint11k-controller110-production-auto-change";
        order.hardwarePaidNtd = Number(hardware.paidNtd || context.amount || 0);
        order.hardwareCoinCount = Number(hardware.coinCount || 0);
        order.hardwareBillCount = Number(hardware.billCount || 0);
        order.hardwareCashBreakdown = clonePaymentValue(hardware.counts || {});
        order.changeAmount = Math.max(
            0,
            order.hardwarePaidNtd - Number(context.amount || 0)
        );
    } else if (hardware && paymentType === "LINE Pay") {
        order.paymentId = hardware.paymentId || "";
        order.linePayPaymentId = hardware.paymentId || "";
        order.linePayTransactionId = String(hardware.transactionId || "");
        order.linePayProviderOrderId = hardware.providerOrderId || "";
        order.linePayPaidAt = Number(hardware.paidAt || Date.now());
        order.linePayStatus = "paid";
        order.linePayEnvironment = hardware.environment || "sandbox";
        order.linePayApiVersion = hardware.apiVersion || "offline-v4";
    }
    if (window.MonsterAuth) {
        order = MonsterAuth.decorateRecord(order, "kiosk");
    }
    if (window.MonsterTicketValidation) {
        order = MonsterTicketValidation.decorateOrder(order);
    }
    currentPrintOrder = order;
    window.currentPrintOrder = order;
    salesHistory.unshift(order);
    window.salesHistory = salesHistory;
    saveSalesHistory();
    if (window.MonsterAuth) {
        MonsterAuth.audit(
            "order.create",
            "建立訂單：" + order.orderNo + "，金額 NT$" + order.amount,
            { source: order.source || "kiosk", targetType: "order", targetId: order.orderNo }
        );
    }
    return { order: order, created: true };
}

function applyPaymentSideEffects(context, order) {
    attachContextMember(context);
    if (typeof applyMemberPurchase === "function") {
        applyMemberPurchase(Number(context.amount) || 0, order, context.pointUse || { points: 0, discount: 0 });
    }
    if (window.ConsumePoints) ConsumePoints.reset();
    (context.items || []).forEach(function (item) {
        // 使用付款開始時的快照，避免收款途中雲端票價或贈品設定變更造成統計不一致。
        var ticket = item || ticketData[item.id];
        if (!ticket) return;
        updateStats(todayStats, ticket, item);
        updateStats(monthStats, ticket, item);
        updateStats(totalStats, ticket, item);
    });
    saveTodayStats();
    order.paymentEffectsAppliedAt = Date.now();
    order.updatedAt = Date.now();
    saveSalesHistory();
}

function showCompletedPayment(order) {
    currentPrintOrder = order;
    window.currentPrintOrder = order;
    isReprint = false;
    showPage("successPage");
    countdownNumber.innerHTML = "";
    updateSuccessItems();
    startPrintAnimation();
    successTip.innerHTML = "👾 小怪獸正在準備您的票券...";
}

function finalizePaymentContext(paymentType, context, hardware) {
    var saved = savePaymentSalesRecord(paymentType, context, hardware);
    if (!saved.created) {
        return { order: saved.order, created: false };
    }
    applyPaymentSideEffects(context, saved.order);
    showCompletedPayment(saved.order);
    return { order: saved.order, created: true };
}

function paymentSuccess(paymentType) {
    if (paymentInProgress) {
        if (
            paymentType === "現金" &&
            window.MonsterCashBridge &&
            typeof window.MonsterCashBridge.hasBlockingTransaction === "function" &&
            window.MonsterCashBridge.hasBlockingTransaction() &&
            typeof window.MonsterCashBridge.startCashPayment === "function"
        ) {
            // FIX13：先和 Controller 113 對帳；舊的零元交易失效時可直接建立新付款。
            window.MonsterCashBridge.startCashPayment();
            return;
        }
        if (
            window.MonsterLinePayScanner &&
            typeof window.MonsterLinePayScanner.hasBlockingTransaction === "function" &&
            window.MonsterLinePayScanner.hasBlockingTransaction()
        ) {
            return;
        }
        // 沒有任何付款模組持有交易時，解除上一筆中斷留下的假鎖定。
        resetPaymentLock();
    }
    if (paymentType === "現金") {
        if (window.MonsterCashBridge) {
            window.MonsterCashBridge.startCashPayment();
        } else {
            alert("現金控制器尚未載入，請重新整理售票機");
        }
        return;
    }
    try {
        var context = buildPaymentContext();
        if (paymentType === "LINE Pay") {
            if (Number(context.amount || 0) === 0) {
                finalizePointOnlyPayment(context);
                return;
            }
            if (!window.MonsterLinePayScanner) {
                throw new Error("LINE Pay 掃描器付款模組尚未載入");
            }
            window.MonsterLinePayScanner.start(context);
            return;
        }
        paymentInProgress = true;
        setPaymentButtonsDisabled(true);
        finalizePaymentContext(paymentType, context, null);
    } catch (error) {
        resetPaymentLock();
        alert("付款無法建立：" + (error.message || error));
    }
}

function finalizeAuthorizedCashPayment(transaction, authorization) {
    paymentInProgress = true;
    setPaymentButtonsDisabled(true);
    return finalizePaymentContext("現金", transaction.order, authorization).order;
}

function finalizeAuthorizedLinePayPayment(context, authorization) {
    var transactionId = String(authorization && authorization.transactionId || "");
    if (!transactionId) {
        throw new Error("LINE Pay 缺少交易編號，禁止建立訂單");
    }
    if (Number(authorization.amount) !== Number(context.amount)) {
        throw new Error("LINE Pay 授權金額與訂單不一致，禁止出票");
    }
    paymentInProgress = true;
    setPaymentButtonsDisabled(true);
    return finalizePaymentContext("LINE Pay", context, authorization).order;
}

function finalizePointOnlyPayment(context) {
    paymentInProgress = true;
    setPaymentButtonsDisabled(true);
    return finalizePaymentContext("會員點數", context, null).order;
}

window.MonsterPayment = {
    buildContext: buildPaymentContext,
    finalizeAuthorizedCash: finalizeAuthorizedCashPayment,
    finalizeAuthorizedLinePay: finalizeAuthorizedLinePayPayment,
    finalizePointOnly: finalizePointOnlyPayment,
    restoreFailedCashCheckout: restoreFailedCashCheckout,
    setLocked: function (locked) {
        paymentInProgress = !!locked;
        setPaymentButtonsDisabled(!!locked);
    },
    resetLock: resetPaymentLock
};

function bindPaymentButton(button, paymentType) {
    if (!button) return;
    button.addEventListener("click", function () {
        playClick();
        paymentSuccess(paymentType);
    });
}

bindPaymentButton(linePayBtn, "LINE Pay");
bindPaymentButton(cashBtn, "現金");
