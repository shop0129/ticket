// V7.8.3.3 FIX10 | keep active payments visible and allow safe zero-paid cancellation
function hasBlockingCheckoutTransaction() {
    if (
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.hasBlockingTransaction === "function" &&
        window.MonsterCashBridge.hasBlockingTransaction()
    ) {
        return true;
    }
    if (
        window.MonsterLinePayScanner &&
        typeof window.MonsterLinePayScanner.hasBlockingTransaction === "function" &&
        window.MonsterLinePayScanner.hasBlockingTransaction()
    ) {
        return true;
    }
    return typeof paymentInProgress !== "undefined" && !!paymentInProgress;
}

function showPage(pageId) {
    clearInterval(countdownTimer);
    // 收款、找零或列印授權尚未結束時，不允許閒置計時器把畫面送回首頁。
    if (pageId === "homePage" && hasBlockingCheckoutTransaction()) {
        if (
            window.MonsterCashBridge &&
            typeof window.MonsterCashBridge.getPurchasePage === "function"
        ) {
            pageId = window.MonsterCashBridge.getPurchasePage();
        } else {
            pageId = "ticketPage";
        }
    }
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });
    document
        .getElementById(pageId)
        .classList.add("active");
    resetIdleTimer();
}
function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
        if (hasBlockingCheckoutTransaction()) {
            resetIdleTimer();
            return;
        }
        // 如果不是首頁就回首頁
        if (!document.getElementById("homePage").classList.contains("active")) {
            showPage("homePage");
        }
    }, systemData.homeTimeout * 1000);
}
document.addEventListener("click", resetIdleTimer);
document.addEventListener("touchstart", resetIdleTimer);
document
    .getElementById("startBtn")
    .addEventListener("click", function () {
    playClick();
    setTimeout(function () {
        showPage("ticketPage");
    }, 100);
});
document
    .getElementById("backBtn")
    .addEventListener("click", function () {
    playClick();
    if (
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.hasBlockingTransaction === "function" &&
        window.MonsterCashBridge.hasBlockingTransaction() &&
        typeof window.MonsterCashBridge.requestCancelAndReturn === "function"
    ) {
        window.MonsterCashBridge.requestCancelAndReturn();
        return;
    }
    setTimeout(function () {
        showPage("homePage");
    }, 80);
});
