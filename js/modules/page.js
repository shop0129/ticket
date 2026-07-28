// V7.8.3.3 FIX14 | deterministic home navigation with hardware-payment safety
function hasCashBridgeTransaction() {
    return !!(
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.hasBlockingTransaction === "function" &&
        window.MonsterCashBridge.hasBlockingTransaction()
    );
}

function hasLinePayBridgeTransaction() {
    return !!(
        window.MonsterLinePayScanner &&
        typeof window.MonsterLinePayScanner.hasBlockingTransaction === "function" &&
        window.MonsterLinePayScanner.hasBlockingTransaction()
    );
}

function hasBlockingCheckoutTransaction() {
    if (hasCashBridgeTransaction()) return true;
    if (hasLinePayBridgeTransaction()) return true;
    return typeof paymentInProgress !== "undefined" && !!paymentInProgress;
}

function releaseWebOnlyPaymentLock() {
    if (
        !hasCashBridgeTransaction() &&
        !hasLinePayBridgeTransaction() &&
        typeof paymentInProgress !== "undefined" &&
        paymentInProgress &&
        typeof resetPaymentLock === "function"
    ) {
        resetPaymentLock();
    }
}

function forceHomePageIfSafe() {
    releaseWebOnlyPaymentLock();
    if (hasBlockingCheckoutTransaction()) return false;
    clearInterval(countdownTimer);
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });
    var homePage = document.getElementById("homePage");
    if (!homePage) return false;
    homePage.classList.add("active");
    resetIdleTimer();
    return true;
}

function showPage(pageId) {
    clearInterval(countdownTimer);
    if (pageId === "homePage") {
        // 上一筆失敗交易只留下網頁鎖定時，返回首頁必須能自動恢復。
        releaseWebOnlyPaymentLock();
    }
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
    .addEventListener("click", function (event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }
    playClick();
    if (
        hasCashBridgeTransaction() &&
        typeof window.MonsterCashBridge.requestCancelAndReturn === "function"
    ) {
        window.MonsterCashBridge.requestCancelAndReturn("homePage").then(function (canceled) {
            if (canceled) {
                setTimeout(forceHomePageIfSafe, 120);
            }
        });
        return;
    }
    setTimeout(function () {
        forceHomePageIfSafe();
    }, 80);
});

window.MonsterHomeGuard = {
    version: "fix14",
    forceHomeIfSafe: forceHomePageIfSafe,
    hasBlockingCheckout: hasBlockingCheckoutTransaction
};
