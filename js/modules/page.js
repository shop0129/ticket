// V7.8.3.3 FIX22 | Instant native Start + single version badge
// FIX22 opens the complete fallback catalog synchronously. Remote ticket
// images continue warming in the background and can never hold the native
// Home panel above an already-open ticket page.
// Preserved FIX21 contract: native ticket-back channel + Android home gate
// Preserved FIX20 contract: Android native home gate + background ticket warm-up
// Preserved FIX19 contract: WebView cache reset + boot recovery stays over home
// Preserved FIX18 contract: manual Start-only ticket entry + stable home routing
// Preserved FIX17 contract: background zero-cash recovery + ticket-image readiness gate
// Preserved FIX16 contract: home-first handshake with controller-startup retry safety
var activeKioskHomeRequest = null;
var activeTicketPageRequest = 0;
var trustedTicketPageRequest = 0;
var ticketEntryPermit = 0;
var homeStableSince = Date.now();
var nativeHomeReadyAt = 0;
var HOME_START_GUARD_MS = 1200;
var NATIVE_START_GUARD_MS = 600;
var KIOSK_ROUTE_TRACE_KEY = "monsterKioskRouteTraceV1";
var lastTicketBackRequestAt = 0;

function nativeKioskBridge() {
    return window.MonsterNativeKiosk || null;
}

function notifyNativeHome(reason) {
    var bridge = nativeKioskBridge();
    if (!bridge || typeof bridge.showHome !== "function") return;
    try {
        bridge.showHome(String(reason || "web-home"));
    } catch (ignore) {}
}

function notifyNativeTicketBack(reason) {
    var bridge = nativeKioskBridge();
    if (!bridge || typeof bridge.ticketBackRequested !== "function") return false;
    try {
        bridge.ticketBackRequested(String(reason || "ticket-back"));
        return true;
    } catch (ignore) {
        return false;
    }
}

function notifyNativeTicketReady(source) {
    var bridge = nativeKioskBridge();
    if (!bridge || typeof bridge.ticketPageReady !== "function") return;
    try {
        bridge.ticketPageReady(String(source || "web"));
    } catch (ignore) {}
}

function notifyNativeStartBlocked(reason) {
    var bridge = nativeKioskBridge();
    if (!bridge || typeof bridge.startBlocked !== "function") return;
    try {
        bridge.startBlocked(String(reason || "blocked"));
    } catch (ignore) {}
}

function recordKioskRoute(type, detail) {
    var trace;
    try {
        trace = JSON.parse(localStorage.getItem(KIOSK_ROUTE_TRACE_KEY) || "[]");
        if (!Array.isArray(trace)) trace = [];
        trace.push({
            at: Date.now(),
            type: String(type || ""),
            detail: String(detail || "")
        });
        if (trace.length > 40) trace = trace.slice(trace.length - 40);
        localStorage.setItem(KIOSK_ROUTE_TRACE_KEY, JSON.stringify(trace));
    } catch (ignore) {}
}

function activePageId() {
    var pages;
    var activePage;
    var index;
    if (typeof document.querySelector === "function") {
        activePage = document.querySelector(".page.active");
    } else {
        pages = document.querySelectorAll(".page");
        for (index = 0; index < pages.length; index += 1) {
            if (pages[index].classList.contains("active")) {
                activePage = pages[index];
                break;
            }
        }
    }
    return activePage ? activePage.id : "";
}

function isHomePageActive() {
    return activePageId() === "homePage";
}

function markHomeStable(reason) {
    if (!isHomePageActive()) return;
    homeStableSince = Date.now();
    activeTicketPageRequest += 1;
    trustedTicketPageRequest = 0;
    ticketEntryPermit = 0;
    recordKioskRoute("HOME_STABLE", reason || "unknown");
}

function markNativeHomeReady(source) {
    nativeHomeReadyAt = Date.now();
    recordKioskRoute("NATIVE_HOME_READY", source || "kiosk");
    return true;
}

function isTrustedManualStart(event) {
    var now = Date.now();
    if (!event || event.isTrusted !== true) {
        recordKioskRoute("START_REJECTED", "untrusted");
        return false;
    }
    if (!isHomePageActive()) {
        recordKioskRoute("START_REJECTED", "home-not-active");
        return false;
    }
    if (now - homeStableSince < HOME_START_GUARD_MS) {
        recordKioskRoute("START_REJECTED", "home-not-stable");
        return false;
    }
    if (nativeHomeReadyAt && now - nativeHomeReadyAt < NATIVE_START_GUARD_MS) {
        recordKioskRoute("START_REJECTED", "native-overlay-release");
        return false;
    }
    return true;
}

function permitTicketPageForManualStart(requestId) {
    if (
        requestId !== activeTicketPageRequest ||
        requestId !== trustedTicketPageRequest ||
        !isHomePageActive()
    ) {
        return false;
    }
    ticketEntryPermit = requestId;
    return true;
}

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

function isCheckoutStartBlocked() {
    if (hasLinePayBridgeTransaction()) return true;
    if (
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.isStartBlocked === "function" &&
        window.MonsterCashBridge.isStartBlocked()
    ) {
        return true;
    }
    return typeof paymentInProgress !== "undefined" && !!paymentInProgress;
}

function shouldKeepHomeDuringBootRecovery() {
    return !!(
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.shouldKeepHomeDuringBootRecovery === "function" &&
        window.MonsterCashBridge.shouldKeepHomeDuringBootRecovery()
    );
}

function waitForTicketCatalogReady() {
    if (
        window.MonsterTicketCatalog &&
        typeof window.MonsterTicketCatalog.whenReady === "function"
    ) {
        return window.MonsterTicketCatalog.whenReady();
    }
    return Promise.resolve(true);
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
    var previousPage = activePageId();
    releaseWebOnlyPaymentLock();
    if (hasBlockingCheckoutTransaction()) return false;
    clearInterval(countdownTimer);
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });
    var homePage = document.getElementById("homePage");
    if (!homePage) return false;
    homePage.classList.add("active");
    if (previousPage !== "homePage") {
        markHomeStable("force-home");
    }
    resetIdleTimer();
    notifyNativeHome("force-home");
    return true;
}

function requestKioskHome(reason) {
    if (hasLinePayBridgeTransaction()) {
        return Promise.resolve(false);
    }
    if (activeKioskHomeRequest) return activeKioskHomeRequest;
    if (
        window.MonsterCashBridge &&
        typeof window.MonsterCashBridge.requestHomeIfSafe === "function"
    ) {
        activeKioskHomeRequest = window.MonsterCashBridge
            .requestHomeIfSafe({ source: reason || "kiosk" })
            .then(function (released) {
                if (released) forceHomePageIfSafe();
                activeKioskHomeRequest = null;
                return !!released;
            }, function () {
                activeKioskHomeRequest = null;
                return false;
            });
        return activeKioskHomeRequest;
    }
    return Promise.resolve(forceHomePageIfSafe());
}

function showPage(pageId) {
    var previousPage = activePageId();
    clearInterval(countdownTimer);
    if (pageId === "homePage") {
        // 上一筆失敗交易只留下網頁鎖定時，返回首頁必須能自動恢復。
        releaseWebOnlyPaymentLock();
    }
    // 收款、找零或列印授權尚未結束時，不允許閒置計時器把畫面送回首頁。
    if (
        pageId === "homePage" &&
        hasBlockingCheckoutTransaction() &&
        !shouldKeepHomeDuringBootRecovery()
    ) {
        if (
            window.MonsterCashBridge &&
            typeof window.MonsterCashBridge.getPurchasePage === "function"
        ) {
            pageId = window.MonsterCashBridge.getPurchasePage();
        } else {
            pageId = "ticketPage";
        }
    }
    // FIX18：首頁進入票種頁只能由本頁剛收到的真人「開始購票」點擊授權。
    // Controller 恢復、舊計時器、合成 click 與遮罩穿透事件都不能替客人開始購票。
    if (
        pageId === "ticketPage" &&
        previousPage === "homePage" &&
        !hasBlockingCheckoutTransaction()
    ) {
        if (!ticketEntryPermit || ticketEntryPermit !== trustedTicketPageRequest) {
            recordKioskRoute("TICKET_ENTRY_BLOCKED", "missing-manual-permit");
            resetIdleTimer();
            return false;
        }
        ticketEntryPermit = 0;
        trustedTicketPageRequest = 0;
        recordKioskRoute("TICKET_ENTRY_ALLOWED", "manual-start");
    }
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });
    document
        .getElementById(pageId)
        .classList.add("active");
    if (pageId === "homePage" && previousPage !== "homePage") {
        markHomeStable("show-page");
    }
    resetIdleTimer();
    if (pageId === "homePage") notifyNativeHome("show-page");
    return true;
}

function openTicketsFromNative(source) {
    var requestId;
    var startButton = document.getElementById("startBtn");
    var home;
    if (!isHomePageActive()) {
        releaseWebOnlyPaymentLock();
        if (hasBlockingCheckoutTransaction()) {
            recordKioskRoute("NATIVE_START_BLOCKED", "checkout");
            notifyNativeStartBlocked("checkout");
            return "BLOCKED";
        }
        document.querySelectorAll(".page").forEach(function (page) {
            page.classList.remove("active");
        });
        home = document.getElementById("homePage");
        if (!home) {
            recordKioskRoute("NATIVE_START_BLOCKED", "home-unavailable");
            notifyNativeStartBlocked("home-unavailable");
            return "BLOCKED";
        }
        home.classList.add("active");
        markHomeStable("native-entry-reset");
    }
    if (isCheckoutStartBlocked()) {
        recordKioskRoute("NATIVE_START_BLOCKED", "checkout");
        notifyNativeStartBlocked("checkout");
        return "BLOCKED";
    }
    requestId = ++activeTicketPageRequest;
    trustedTicketPageRequest = requestId;
    recordKioskRoute("NATIVE_START_ACCEPTED", source || "kiosk122");
    if (startButton) {
        startButton.style.pointerEvents = "none";
        startButton.setAttribute("aria-busy", "true");
        startButton.setAttribute("data-ticket-request", String(requestId));
    }
    if (!permitTicketPageForManualStart(requestId)) {
        notifyNativeStartBlocked("permit");
        return "BLOCKED";
    }
    if (!showPage("ticketPage")) {
        notifyNativeStartBlocked("route");
        return "BLOCKED";
    }
    // Notify Android before any asynchronous image/Firebase work. This makes
    // the native panel disappear during the same accepted touch transaction.
    notifyNativeTicketReady(source || "kiosk122");
    recordKioskRoute("NATIVE_TICKET_VISIBLE", source || "kiosk122");
    if (startButton) {
        startButton.style.pointerEvents = "";
        startButton.removeAttribute("aria-busy");
        startButton.removeAttribute("data-ticket-request");
    }
    // The catalog already contains a full local fallback image for every card.
    // Keep warming custom images without delaying navigation.
    waitForTicketCatalogReady().catch(function () {
        recordKioskRoute("CATALOG_WARM_FAILED", source || "kiosk122");
    });
    return "TICKET_READY";
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
    .addEventListener("click", function (event) {
    var requestId;
    var startButton = document.getElementById("startBtn");
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }
    if (!isTrustedManualStart(event)) return;
    if (isCheckoutStartBlocked()) {
        alert("系統正在確認上一筆交易，請稍候幾秒後再按「開始購票」。");
        return;
    }
    requestId = ++activeTicketPageRequest;
    trustedTicketPageRequest = requestId;
    playClick();
    recordKioskRoute("START_ACCEPTED", "waiting-catalog");
    if (startButton) {
        startButton.style.pointerEvents = "none";
        startButton.setAttribute("aria-busy", "true");
        startButton.setAttribute("data-ticket-request", String(requestId));
    }
    waitForTicketCatalogReady().then(function () {
        if (requestId !== activeTicketPageRequest) return;
        if (isCheckoutStartBlocked()) return;
        if (!permitTicketPageForManualStart(requestId)) return;
        showPage("ticketPage");
    }).catch(function () {
        if (requestId !== activeTicketPageRequest) return;
        if (
            !isCheckoutStartBlocked() &&
            permitTicketPageForManualStart(requestId)
        ) {
            showPage("ticketPage");
        }
    }).then(function () {
        if (
            !startButton ||
            startButton.getAttribute("data-ticket-request") !== String(requestId)
        ) {
            return;
        }
        startButton.style.pointerEvents = "";
        startButton.removeAttribute("aria-busy");
        startButton.removeAttribute("data-ticket-request");
    });
});
function handleTicketBack(event) {
    var now = Date.now();
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }
    if (event && typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
    }
    // Android 8.1 WebView can emit touchend and click for one tap. Keep one
    // request while still accepting either event if the other is swallowed.
    if (now - lastTicketBackRequestAt < 450) return;
    lastTicketBackRequestAt = now;
    playClick();
    recordKioskRoute("TICKET_BACK", event && event.type ? event.type : "unknown");
    // Kiosk 122 shows the native Home immediately. The web transaction release
    // continues below, so a zero-cash stale transaction cannot make Back look dead.
    notifyNativeTicketBack("ticket-page");
    requestKioskHome("ticket-back");
}

var ticketBackButton = document.getElementById("backBtn");
ticketBackButton.addEventListener("touchend", handleTicketBack, true);
ticketBackButton.addEventListener("click", handleTicketBack, true);

window.MonsterHomeGuard = {
    version: "fix22",
    forceHomeIfSafe: forceHomePageIfSafe,
    hasBlockingCheckout: hasBlockingCheckoutTransaction
};

window.MonsterKioskRouting = {
    version: "fix22",
    requestHome: requestKioskHome,
    markNativeHomeReady: markNativeHomeReady,
    openTicketsFromNative: openTicketsFromNative,
    isHome: function () {
        var home = document.getElementById("homePage");
        return !!(home && home.classList.contains("active"));
    },
    getTrace: function () {
        try {
            return JSON.parse(localStorage.getItem(KIOSK_ROUTE_TRACE_KEY) || "[]");
        } catch (ignore) {
            return [];
        }
    }
};
