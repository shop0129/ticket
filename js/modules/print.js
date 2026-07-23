// V7 Phase 1 Legacy Build | js/modules/print.js
// =========================================
// 小怪獸售票機 V5.6.3
// 列印模組
// =========================================
// =========================================
// 成功頁 DOM
// =========================================
var successItemsBox = document.getElementById("successItems");
var progressFill = document.getElementById("progressFill");
var progressText = document.getElementById("progressText");
var printStatus = document.getElementById("printStatus");
var successTitle = document.querySelector(".success-title");
var successItemsArea = document.querySelector(".success-items");
var activeReceiptProgressTimer = null;
var activeReceiptPrintToken = 0;
// =========================================
// 成功頁領取項目
// =========================================
function updateSuccessItems() {
    if (!successItemsBox)
        return;
    if (!currentPrintOrder) {
        successItemsBox.innerHTML =
            "<div class='success-items-content'>沒有可列印資料</div>";
        return;
    }
    var totalToken = 0;
    var greenToy = 0;
    var redToy = 0;
    var band = 0;
    var powerbank = 0;
    var items = currentPrintOrder.items || [];
    items.forEach(function (item) {
        if (!item)
            return;
        var ticket = item;
        // 一般票附贈代幣
        totalToken += window.MonsterTicketDataSync ? MonsterTicketDataSync.tokenOf(ticket) : Number(ticket.token || 0);
        // 入場手環
        if (ticket.reward &&
            ticket.reward.includes("band")) {
            band++;
        }
        // 玩具
        if (ticket.toy === "green") {
            greenToy++;
        }
        if (ticket.toy === "red") {
            redToy++;
        }
        // 行動電源
        if (item.id === "powerbank") {
            powerbank++;
        }
    });
    var html = "";
    if (band) {
        html +=
            "<div>\uD83C\uDFAB \u5165\u5834\u624B\u74B0 \u00D7 ".concat(band, "</div>");
    }
    if (totalToken) {
        html +=
            "<div>\uD83E\uDE99 \u904A\u6232\u4EE3\u5E63 \u00D7 ".concat(totalToken, " \u679A</div>");
    }
    if (greenToy) {
        html +=
            "<div>\uD83C\uDF81 \u7DA0\u6A19\u73A9\u5177 \u00D7 ".concat(greenToy, "</div>");
    }
    if (redToy) {
        html +=
            "<div>\uD83C\uDF81 \u7D05\u6A19\u73A9\u5177 \u00D7 ".concat(redToy, "</div>");
    }
    if (powerbank) {
        html +=
            "<div>\uD83D\uDD0B \u884C\u52D5\u96FB\u6E90 \u00D7 ".concat(powerbank, "</div>");
    }
    if (window.MonsterRewardEngine) html += MonsterRewardEngine.renderHtml(items);
    if (html === "") {
        html =
            "<div>無需領取物品</div>";
    }
    var receiptPreview = "";
    if (window.MonsterTicketValidation) {
        receiptPreview = MonsterTicketValidation.receiptHtml(currentPrintOrder);
    }
    successItemsBox.innerHTML =
        "<div class=\"success-items-content\">\n        ".concat(html, "\n    </div>") + receiptPreview;
}
// =========================================
// 重設列印畫面
// =========================================
function resetPrintDisplay() {
    clearInterval(countdownTimer);
    clearInterval(activeReceiptProgressTimer);
    activeReceiptProgressTimer = null;
    countdownNumber.innerHTML = "";
    printStatus.classList.remove("print-finish");
    printStatus.classList.remove("print-warning");
    progressFill.style.width = "0%";
    progressFill.style.borderRadius = "";
    progressFill.style.background =
        "linear-gradient(90deg,#FFD54F,#FF9800)";
    progressText.innerHTML = "0%";
    successTitle.style.display = "none";
    successItemsArea.style.display = "none";
    var recovery = document.getElementById("receiptPrintRecovery");
    if (recovery) recovery.classList.remove("show");
}
// =========================================
// 更新列印提示文字
// =========================================
function updatePrintMessage(percent) {
    if (percent < 30) {
        successTip.innerHTML =
            "👾 小怪獸正在準備您的票券...";
    }
    else if (percent < 70) {
        successTip.innerHTML =
            "🖨️ 正在列印票券...";
    }
    else if (percent < 100) {
        successTip.innerHTML =
            "✨ 即將完成...";
    }
}
// =========================================
// 完成列印
// =========================================
function finishPrintAnimation(order, physicalPrinted) {
    progressFill.style.width = "100%";
    progressFill.style.borderRadius = "40px";
    progressText.innerHTML = "100%";
    printStatus.innerHTML =
        physicalPrinted ? "✅ 收據已列印完成" : "✅ 訂單已完成";
    successTip.innerHTML =
        "🎉 歡迎來到小怪獸放電所，祝您玩得開心！";
    playSuccess();
    printStatus.classList.add("print-finish");
    successTitle.style.display = "block";
    successItemsArea.style.display = "block";
    if (physicalPrinted &&
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.onTicketAnimationFinished === "function") {
        window.MonsterCashBridge.onTicketAnimationFinished(order || currentPrintOrder);
    }
    // 0.5 秒後開始倒數
    setTimeout(function () {
        startReturnCountdown();
    }, 500);
}

function showReceiptPrintRecovery(error) {
    clearInterval(activeReceiptProgressTimer);
    activeReceiptProgressTimer = null;
    progressFill.style.width = "100%";
    progressFill.style.background = "#ef5350";
    progressText.innerHTML = "需要處理";
    printStatus.innerHTML = "⚠️ 收據未確認列印";
    printStatus.classList.add("print-warning");
    successTip.innerHTML = "現金與訂單資料已保留，為避免重複出紙，系統不會自行重印。";
    successTitle.style.display = "block";
    successItemsArea.style.display = "block";
    var recovery = document.getElementById("receiptPrintRecovery");
    var message = document.getElementById("receiptPrintRecoveryMessage");
    if (message) {
        message.textContent = (error && error.message)
            ? error.message
            : "請通知員工檢查紙張與印表機，再從訂單明細執行補印。";
    }
    if (recovery) recovery.classList.add("show");
    countdownNumber.innerHTML = "";
}

function openReceiptPrintRecovery() {
    playClick();
    if (window.MonsterAuth && MonsterAuth.getCurrentUser && MonsterAuth.getCurrentUser()) {
        if (typeof openSalesHistory === "function") openSalesHistory();
        return;
    }
    showPage("adminLoginPage");
    alert("請由店長或員工登入，進入售票紀錄後補印這筆訂單。");
}
// =========================================
// 列印完成倒數
// =========================================
function startReturnCountdown() {
    var sec = systemData.printDelay;
    clearInterval(countdownTimer);
    countdownNumber.innerHTML = sec;
    countdownTimer = setInterval(function () {
        sec--;
        if (sec > 0) {
            countdownNumber.innerHTML = sec;
            return;
        }
        clearInterval(countdownTimer);
        linePayBtn.disabled = false;
        cashBtn.disabled = false;
        if (typeof resetPaymentLock ===
            "function") {
            resetPaymentLock();
        }
        if (typeof resetCurrentMemberSelection === "function")
            resetCurrentMemberSelection();
        // 清空購物車
        cart = [];
        updateCartPanel();
        // 收起付款區
        paymentArea.style.display = "none";
        checkoutBtn.style.display = "block";
        if (isReprint) {
            isReprint = false;
            var index = salesHistory.findIndex(function (order) {
                return order.orderNo ===
                    currentPrintOrder.orderNo;
            });
            openOrderDetail(index);
        }
        else {
            showPage("homePage");
        }
    }, 1000);
}
// =========================================
// 啟動列印動畫
// =========================================
function startPrintAnimation() {
    resetPrintDisplay();
    var targetOrder = currentPrintOrder;
    var targetIsReprint = !!isReprint;
    var token = ++activeReceiptPrintToken;
    var percent = 0;
    var hasPhysicalPrinter = window.MonsterReceiptPrinter &&
        typeof MonsterReceiptPrinter.printOrder === "function" &&
        MonsterReceiptPrinter.hasPairing();

    activeReceiptProgressTimer = setInterval(function () {
        percent +=
            Math.floor(Math.random() * 4) + 3;
        if (percent > 82) percent = 82;
        progressFill.style.width =
            percent + "%";
        progressText.innerHTML =
            percent + "%";
        updatePrintMessage(percent);
    }, 220);

    if (!hasPhysicalPrinter) {
        if (targetOrder && targetOrder.printAuthorizationId) {
            showReceiptPrintRecovery(new Error("實體收據機尚未連線；現金訂單不會直接標記完成"));
            return Promise.resolve(false);
        }
        return new Promise(function (resolve) {
            setTimeout(function () {
                if (token !== activeReceiptPrintToken) return resolve(false);
                clearInterval(activeReceiptProgressTimer);
                activeReceiptProgressTimer = null;
                finishPrintAnimation(targetOrder, false);
                resolve(false);
            }, 1800);
        });
    }

    return MonsterReceiptPrinter.printOrder(targetOrder, { reprint: targetIsReprint })
        .then(function (result) {
            if (token !== activeReceiptPrintToken) return result;
            clearInterval(activeReceiptProgressTimer);
            activeReceiptProgressTimer = null;
            finishPrintAnimation(targetOrder, true);
            return result;
        })
        .catch(function (error) {
            if (token === activeReceiptPrintToken) showReceiptPrintRecovery(error);
            return { ok: false, error: error };
        });
}
