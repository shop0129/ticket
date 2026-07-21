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
    countdownNumber.innerHTML = "";
    printStatus.classList.remove("print-finish");
    progressFill.style.width = "0%";
    progressFill.style.borderRadius = "";
    progressFill.style.background =
        "linear-gradient(90deg,#FFD54F,#FF9800)";
    progressText.innerHTML = "0%";
    successTitle.style.display = "none";
    successItemsArea.style.display = "none";
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
function finishPrintAnimation() {
    progressFill.style.width = "100%";
    progressFill.style.borderRadius = "40px";
    progressText.innerHTML = "100%";
    printStatus.innerHTML =
        "✅ 票券已列印完成";
    successTip.innerHTML =
        "🎉 歡迎來到小怪獸放電所，祝您玩得開心！";
    playSuccess();
    printStatus.classList.add("print-finish");
    successTitle.style.display = "block";
    successItemsArea.style.display = "block";
    if (window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.onTicketAnimationFinished === "function") {
        window.MonsterCashBridge.onTicketAnimationFinished(currentPrintOrder);
    }
    // 0.5 秒後開始倒數
    setTimeout(function () {
        startReturnCountdown();
    }, 500);
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
    var percent = 0;
    var timer = setInterval(function () {
        percent +=
            Math.floor(Math.random() * 5) + 5;
        if (percent > 100) {
            percent = 100;
        }
        progressFill.style.width =
            percent + "%";
        progressText.innerHTML =
            percent + "%";
        updatePrintMessage(percent);
        if (percent >= 100) {
            clearInterval(timer);
            finishPrintAnimation();
        }
    }, 220);
}
