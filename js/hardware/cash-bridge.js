// 小怪獸售票機 V7.8.3.3 FIX24
// FIX24 preserves accepted cash while allowing ticket browsing during a
// zero-cash boot cancellation. Starting a new cash payment remains blocked
// until Controller 113 has cleared the previous zero-cash session.
// GitHub Pages/PWA -> Android localhost cash controller bridge
// Android WebView 61 相容（ES5）
(function () {
    "use strict";

    var BASE_URL = "http://127.0.0.1:8765/v1";
    var PAIRING_KEY = "monsterCashBridgePairingKeyV1";
    var TRANSACTION_KEY = "monsterCashBridgeTransactionV1";
    var POLL_MS = 700;
    var API_TIMEOUT_MS = 5000;
    var STALE_ZERO_CASH_MS = 5 * 60 * 1000;
    var pollTimer = null;
    var active = loadJson(TRANSACTION_KEY);
    // FIX19：如果這筆交易是在開啟網頁前就已存在，恢復流程只顯示安全遮罩，
    // 不把首頁底層自動切到票種頁。交易與已投入現金仍完整保留。
    var bootSessionRecovery = !!active;
    // 只有「重新開機前留下、且尚未投入現金」的交易走背景首頁恢復。
    // 新交易仍維持原本的付款頁鎖定，已投入現金／列印授權也絕不放行。
    var bootHomeReleasePending = !!active && !hasAcceptedCashEvidence(active);
    var pendingPurchasePage = null;
    var pendingContext = null;
    var pendingStartToken = 0;
    var bootRecoveryResolved = !active;
    var bootRecoveryPromise = null;
    var bootRecoveryRetryTimer = null;
    var bootRecoveryRetryAttempt = 0;
    // Preserved regression marker: OVERLAY_FIX_VERSION = "fix16"
    var OVERLAY_FIX_VERSION = "fix24";
    var BOOT_CANCEL_POLL_MS = 500;
    var BOOT_CANCEL_MAX_POLLS = 20;
    var BOOT_PAIRING_POLL_MS = 350;
    var BOOT_RECOVERY_RETRY_DELAYS_MS = [1000, 2000, 3000, 5000, 5000];

    function loadJson(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function saveActive() {
        if (active) localStorage.setItem(TRANSACTION_KEY, JSON.stringify(active));
        else localStorage.removeItem(TRANSACTION_KEY);
    }

    function pairingKey() {
        return String(localStorage.getItem(PAIRING_KEY) || "").trim();
    }

    function requestPairingKey() {
        var current = pairingKey();
        if (/^\d{8}$/.test(current)) return current;
        var entered = prompt(
            "請輸入 Monster Hardware Explorer 畫面上的 8 位數配對碼。\n\n只需在這台點餐機輸入一次。",
            ""
        );
        if (entered === null) return "";
        entered = String(entered).replace(/\s/g, "");
        if (!/^\d{8}$/.test(entered)) {
            alert("配對碼必須是 8 位數字");
            return "";
        }
        localStorage.setItem(PAIRING_KEY, entered);
        return entered;
    }

    function isPairingReady() {
        return /^\d{8}$/.test(pairingKey());
    }

    function isTransientRecoveryError(error) {
        var code = String(error && error.code || "");
        return !code ||
            code === "CONTROLLER_TIMEOUT" ||
            code === "PAIRING_REQUIRED" ||
            code === "NETWORK_ERROR" ||
            code.indexOf("HTTP_5") === 0;
    }

    function api(path, options) {
        options = options || {};
        var key = pairingKey();
        var request = {
            method: options.method || "GET",
            cache: "no-store",
            headers: {
                "X-Monster-Bridge-Key": key,
                "Content-Type": "application/json"
            }
        };
        if (options.body !== undefined) request.body = JSON.stringify(options.body);
        return new Promise(function (resolve, reject) {
            var finished = false;
            var timer = setTimeout(function () {
                var timeout;
                if (finished) return;
                finished = true;
                timeout = new Error("控制器連線逾時，請確認 Controller 113 正在背景執行");
                timeout.code = "CONTROLLER_TIMEOUT";
                reject(timeout);
            }, API_TIMEOUT_MS);
            fetch(BASE_URL + path, request).then(function (response) {
                return response.text().then(function (text) {
                    var data;
                    try { data = text ? JSON.parse(text) : {}; }
                    catch (error) { data = { ok: false, message: "控制器回覆格式錯誤" }; }
                    if (!response.ok) {
                        var failure = new Error(data.message || ("控制器錯誤 HTTP " + response.status));
                        failure.code = data.code || "HTTP_" + response.status;
                        throw failure;
                    }
                    return data;
                });
            }).then(function (data) {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                resolve(data);
            }).catch(function (error) {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    function ensureCriticalOverlayStyle() {
        var style = document.getElementById("hardwareCashCriticalStyle");
        if (style) return;
        style = document.createElement("style");
        style.id = "hardwareCashCriticalStyle";
        style.type = "text/css";
        style.textContent = [
            ".hardware-cash-overlay{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;z-index:2147483000!important;display:none;align-items:center!important;justify-content:center!important;padding:28px!important;box-sizing:border-box!important;background:rgba(16,24,40,.90)!important;font-family:Arial,'Noto Sans TC',sans-serif!important;}",
            ".hardware-cash-overlay.show{display:flex!important;}",
            ".hardware-cash-card{width:94vw!important;max-width:720px!important;max-height:92vh!important;overflow:auto!important;box-sizing:border-box!important;padding:30px!important;border-radius:28px!important;background:#fff!important;box-shadow:0 24px 80px rgba(0,0,0,.38)!important;text-align:center!important;}",
            ".hardware-cash-monster{font-size:58px!important;line-height:1!important;}",
            ".hardware-cash-card h2{margin:12px 0 20px!important;font-size:34px!important;color:#263238!important;}",
            ".hardware-cash-amounts{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:12px!important;}",
            ".hardware-cash-amounts div{padding:16px 8px!important;border-radius:18px!important;background:#f4f7fa!important;}",
            ".hardware-cash-amounts span,.hardware-cash-meta span{display:block!important;color:#667085!important;font-size:17px!important;}",
            ".hardware-cash-amounts strong{display:block!important;margin-top:5px!important;color:#e65100!important;font-size:31px!important;}",
            ".hardware-cash-meta{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:10px!important;margin-top:12px!important;}",
            ".hardware-cash-meta div{padding:11px 7px!important;border:2px solid #e8edf3!important;border-radius:14px!important;background:#fff!important;}",
            ".hardware-cash-meta strong{display:block!important;margin-top:4px!important;color:#263238!important;font-size:23px!important;}",
            "#hardwareCashBreakdown{margin:12px 0 0!important;padding:10px 12px!important;border-radius:12px!important;background:#fff7e6!important;color:#8a4b00!important;font-size:17px!important;font-weight:700!important;line-height:1.45!important;}",
            "#hardwareCashMessage{margin:18px 0 8px!important;color:#344054!important;font-size:20px!important;line-height:1.5!important;}",
            "#hardwareCashOrder{display:block!important;color:#667085!important;font-size:14px!important;}",
            "#hardwareCashRetry,#hardwareCashCancel,#hardwareCashManage{margin:16px 5px 0!important;padding:12px 24px!important;border:0!important;border-radius:14px!important;color:#fff!important;font-size:19px!important;font-weight:700!important;}",
            "#hardwareCashRetry{background:#ff9800!important;}#hardwareCashCancel{background:#607d8b!important;}#hardwareCashManage{background:#b3261e!important;}",
            "@media(max-width:620px){.hardware-cash-overlay{padding:12px!important}.hardware-cash-card{padding:20px 12px!important}.hardware-cash-card h2{font-size:27px!important}.hardware-cash-amounts,.hardware-cash-meta{gap:6px!important}.hardware-cash-amounts strong{font-size:23px!important}.hardware-cash-meta strong{font-size:19px!important}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function ticketCountFromContext(context) {
        return (context && context.items || []).reduce(function (total, item) {
            return total + Math.max(1, Math.round(Number(item && (item.qty || item.quantity) || 1)));
        }, 0);
    }

    function formatCashBreakdown(counts) {
        var entries = [];
        Object.keys(counts || {}).sort(function (a, b) {
            return Number(b) - Number(a);
        }).forEach(function (value) {
            var count = Math.max(0, Math.round(Number(counts[value] || 0)));
            var denomination = Math.max(0, Math.round(Number(value || 0)));
            if (!count || !denomination) return;
            entries.push(denomination + "元 × " + count + (denomination >= 100 ? "張" : "枚"));
        });
        return entries.length ? ("投入明細：" + entries.join("、")) : "尚未投入現金";
    }

    function ensureOverlay() {
        var overlay = document.getElementById("hardwareCashOverlay");
        ensureCriticalOverlayStyle();
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "hardwareCashOverlay";
            overlay.className = "hardware-cash-overlay";
            document.body.appendChild(overlay);
        }
        if (overlay.getAttribute("data-overlay-version") !== OVERLAY_FIX_VERSION) {
            overlay.setAttribute("data-overlay-version", OVERLAY_FIX_VERSION);
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.setAttribute("aria-live", "polite");
            overlay.innerHTML = [
            '<div class="hardware-cash-card">',
            '  <div class="hardware-cash-monster">👾</div>',
            '  <h2 id="hardwareCashTitle">正在連接現金控制器</h2>',
            '  <div class="hardware-cash-amounts">',
            '    <div><span>應付</span><strong id="hardwareCashAmount">NT$0</strong></div>',
            '    <div><span>已投入</span><strong id="hardwareCashPaid">NT$0</strong></div>',
            '    <div><span>尚差</span><strong id="hardwareCashRemaining">NT$0</strong></div>',
            '  </div>',
            '  <div class="hardware-cash-meta">',
            '    <div><span>票券數量</span><strong id="hardwareCashTicketCount">0 張</strong></div>',
            '    <div><span>紙鈔數量</span><strong id="hardwareCashBillCount">0 張</strong></div>',
            '    <div><span>硬幣數量</span><strong id="hardwareCashCoinCount">0 枚</strong></div>',
            '  </div>',
            '  <div id="hardwareCashBreakdown">尚未投入現金</div>',
            '  <p id="hardwareCashMessage">請稍候…</p>',
            '  <small id="hardwareCashOrder"></small>',
            '  <button id="hardwareCashRetry" type="button" style="display:none;">重新連線</button>',
            '  <button id="hardwareCashCancel" type="button" style="display:none;">取消付款並返回</button>',
            '  <button id="hardwareCashManage" type="button" style="display:none;">店長人工處理</button>',
            '</div>'
            ].join("");
            document.getElementById("hardwareCashRetry").addEventListener("click", function () {
                this.style.display = "none";
                if (active) pollPayment(active.order.orderNo);
            });
            document.getElementById("hardwareCashCancel").addEventListener("click", function () {
                requestCancelAndReturn();
            });
            document.getElementById("hardwareCashManage").addEventListener("click", function () {
                hideOverlay();
                if (window.MonsterCashOperations && MonsterCashOperations.open) {
                    MonsterCashOperations.open();
                } else if (typeof showPage === "function") {
                    showPage("adminLoginPage");
                    alert("請由店長登入後開啟『現金對帳』");
                }
            });
        }
        return overlay;
    }

    function purchasePage() {
        var requested = active && active.order
            ? active.order.purchasePage
            : pendingPurchasePage;
        return requested === "detailPage"
            ? "detailPage"
            : "ticketPage";
    }

    function keepPurchasePageVisible() {
        if (bootSessionRecovery && active) {
            return;
        }
        if (
            bootHomeReleasePending &&
            active &&
            !hasAcceptedCashEvidence(active)
        ) {
            return;
        }
        // FIX18：首頁已顯示時，零投入的背景恢復不得把客人推進票種頁。
        // 真正由票種頁開始的新付款，以及已有投入現金的恢復流程不受影響。
        if (
            active &&
            !pendingContext &&
            !hasAcceptedCashEvidence(active) &&
            window.MonsterKioskRouting &&
            typeof window.MonsterKioskRouting.isHome === "function" &&
            window.MonsterKioskRouting.isHome()
        ) {
            return;
        }
        var target = purchasePage();
        var current = document.querySelector(".page.active");
        if (
            typeof showPage === "function" &&
            (!current || current.id !== target)
        ) {
            showPage(target);
        }
    }

    function setOverlay(data) {
        var context = active && active.order ? active.order : pendingContext;
        var counts = data.counts || (active && active.lastCounts) || {};
        var billCount = data.billCount;
        var coinCount = data.coinCount;
        var overlay;
        if (billCount === undefined || billCount === null) {
            billCount = active && active.lastBillCount || 0;
        }
        if (coinCount === undefined || coinCount === null) {
            coinCount = active && active.lastCoinCount || 0;
        }
        if (!data.preservePage) keepPurchasePageVisible();
        overlay = ensureOverlay();
        overlay.classList.add("show");
        // FIX11：即使外部 CSS 尚在舊 PWA 快取，也強制顯示現金付款資訊。
        overlay.style.display = "flex";
        document.getElementById("hardwareCashTitle").textContent = data.title || "現金付款中";
        document.getElementById("hardwareCashAmount").textContent = "NT$" + Number(data.amount || 0);
        document.getElementById("hardwareCashPaid").textContent = "NT$" + Number(data.paid || 0);
        document.getElementById("hardwareCashRemaining").textContent = "NT$" + Number(data.remaining || 0);
        document.getElementById("hardwareCashTicketCount").textContent =
            ticketCountFromContext(context) + " 張";
        document.getElementById("hardwareCashBillCount").textContent =
            Math.max(0, Number(billCount || 0)) + " 張";
        document.getElementById("hardwareCashCoinCount").textContent =
            Math.max(0, Number(coinCount || 0)) + " 枚";
        document.getElementById("hardwareCashBreakdown").textContent =
            formatCashBreakdown(counts);
        document.getElementById("hardwareCashMessage").textContent = data.message || "請依控制器畫面投入現金";
        document.getElementById("hardwareCashOrder").textContent = data.orderNo ? ("訂單 " + data.orderNo) : "";
        document.getElementById("hardwareCashRetry").style.display = data.retry ? "inline-block" : "none";
        document.getElementById("hardwareCashCancel").style.display = data.cancelAllowed ? "inline-block" : "none";
        document.getElementById("hardwareCashCancel").disabled = !!data.cancelPending;
        document.getElementById("hardwareCashManage").style.display = data.manage ? "inline-block" : "none";
    }

    function hideOverlay() {
        var overlay = document.getElementById("hardwareCashOverlay");
        if (overlay) {
            overlay.classList.remove("show");
            overlay.style.display = "none";
        }
    }

    function stopPolling() {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = null;
    }

    function setLocked(locked) {
        if (window.MonsterPayment) window.MonsterPayment.setLocked(locked);
        else paymentInProgress = !!locked;
    }

    function hasAcceptedCashEvidence(transaction) {
        return !!(
            transaction &&
            (
                Number(transaction.lastPaidNtd || 0) > 0 ||
                transaction.authorization ||
                transaction.state === "CLAIMED" ||
                transaction.state === "ISSUE_STARTED" ||
                transaction.state === "ACK_PENDING" ||
                transaction.state === "RECOVERY_REQUIRED" ||
                transaction.state === "RECONCILIATION_REQUIRED"
            )
        );
    }

    function isStaleZeroCashTransaction(transaction) {
        var timestamp;
        if (!transaction || hasAcceptedCashEvidence(transaction)) return false;
        timestamp = Number(
            transaction.updatedAt ||
            transaction.createdAt ||
            transaction.order && transaction.order.createdAt ||
            0
        );
        return timestamp > 0 && Date.now() - timestamp >= STALE_ZERO_CASH_MS;
    }

    function isTerminalControllerStatus(status) {
        return status === "CANCELED" || status === "TICKET_ISSUED";
    }

    function isZeroCashCancelableStatus(payload) {
        return !!(
            payload &&
            Number(payload.paidNtd || 0) === 0 &&
            (
                payload.status === "QUEUED" ||
                payload.status === "PAYMENT_PENDING" ||
                payload.status === "CANCEL_REQUESTED"
            )
        );
    }

    function updateActiveFromController(payload) {
        if (!active || !payload) return;
        active.lastControllerStatus = payload.status;
        active.lastPaidNtd = Number(payload.paidNtd || 0);
        active.lastCoinCount = Number(payload.coinCount || 0);
        active.lastBillCount = Number(payload.billCount || 0);
        active.lastCounts = payload.counts || {};
        active.updatedAt = Date.now();
        if (Number(active.lastPaidNtd || 0) > 0) {
            bootHomeReleasePending = false;
        }
        saveActive();
    }

    function clearStoredTransaction(returnPage, context) {
        var checkout = context || active && active.order || pendingContext;
        stopPolling();
        if (bootRecoveryRetryTimer) clearTimeout(bootRecoveryRetryTimer);
        bootRecoveryRetryTimer = null;
        bootRecoveryRetryAttempt = 0;
        pendingStartToken += 1;
        active = null;
        pendingContext = null;
        pendingPurchasePage = null;
        bootSessionRecovery = false;
        bootHomeReleasePending = false;
        bootRecoveryResolved = true;
        saveActive();
        hideOverlay();
        setLocked(false);
        if (!returnPage) return;
        if (
            window.MonsterPayment &&
            typeof window.MonsterPayment.restoreFailedCashCheckout === "function"
        ) {
            window.MonsterPayment.restoreFailedCashCheckout(checkout, returnPage);
        } else if (typeof showPage === "function") {
            showPage(returnPage);
        }
    }

    function showBootRecoveryWaiting(error) {
        var checkout = active && active.order;
        var paid = Number(active && active.lastPaidNtd || 0);
        bootRecoveryResolved = false;
        if (bootHomeReleasePending && !hasAcceptedCashEvidence(active)) {
            // FIX17：零元殘留交易只在背景對帳，不再顯示付款遮罩或切到票種頁。
            hideOverlay();
            setLocked(false);
            return;
        }
        setLocked(true);
        setOverlay({
            title: "正在啟動現金控制器",
            amount: checkout && checkout.amount,
            paid: paid,
            remaining: checkout ? Math.max(0, checkout.amount - paid) : 0,
            orderNo: checkout && checkout.orderNo,
            message: (error && error.code === "PAIRING_REQUIRED")
                ? "正在套用點餐機安全配對設定，完成後會自動恢復首頁。"
                : "Controller 113 正在背景啟動，系統會自動重試，不需要重新開機。",
            retry: false,
            manage: false,
            cancelAllowed: false
        });
    }

    function scheduleBootRecoveryRetry(error) {
        var delayIndex;
        var delayMs;
        showBootRecoveryWaiting(error);
        if (bootRecoveryRetryTimer) return;
        delayIndex = Math.min(
            bootRecoveryRetryAttempt,
            BOOT_RECOVERY_RETRY_DELAYS_MS.length - 1
        );
        delayMs = BOOT_RECOVERY_RETRY_DELAYS_MS[delayIndex];
        bootRecoveryRetryAttempt += 1;
        bootRecoveryRetryTimer = setTimeout(function () {
            bootRecoveryRetryTimer = null;
            recoverWhenBridgeReady();
        }, delayMs);
    }

    function waitForBootCancel(orderNo, checkout, pollCount) {
        return new Promise(function (resolve) {
            setTimeout(resolve, BOOT_CANCEL_POLL_MS);
        }).then(function () {
            return api("/payments/" + encodeURIComponent(orderNo));
        }).then(function (payload) {
            updateActiveFromController(payload);
            if (isTerminalControllerStatus(payload.status)) {
                clearStoredTransaction("homePage", checkout);
                return "cleared";
            }
            // Controller 113 會在競態中以實際收款狀態為準；一旦已有投入就停止自動取消。
            if (!isZeroCashCancelableStatus(payload)) {
                bootRecoveryResolved = true;
                return "live";
            }
            if (pollCount >= BOOT_CANCEL_MAX_POLLS) {
                bootRecoveryResolved = true;
                return "live";
            }
            return waitForBootCancel(orderNo, checkout, pollCount + 1);
        }).catch(function (error) {
            if (error.code === "ORDER_NOT_FOUND") {
                clearStoredTransaction("homePage", checkout);
                return "cleared";
            }
            if (!hasAcceptedCashEvidence(active) && isTransientRecoveryError(error)) {
                scheduleBootRecoveryRetry(error);
                return "retry";
            }
            bootRecoveryResolved = true;
            return "live";
        });
    }

    function cancelStoredZeroCashAtBoot(payload) {
        var checkout = active && active.order;
        var orderNo = checkout && checkout.orderNo;
        var cancelRequest;
        if (!active || !orderNo || !isZeroCashCancelableStatus(payload)) {
            bootRecoveryResolved = true;
            return Promise.resolve("live");
        }
        active.cancelReturnPage = "homePage";
        active.state = "CANCEL_REQUESTED";
        active.updatedAt = Date.now();
        saveActive();
        if (payload.status === "CANCEL_REQUESTED") {
            cancelRequest = Promise.resolve({ ok: true, status: "CANCEL_REQUESTED" });
        } else {
            cancelRequest = api("/payments/" + encodeURIComponent(orderNo) + "/cancel", {
                method: "POST",
                body: {
                    requestId: (
                        "BOOT-CANCEL-" + String(active.requestId || orderNo)
                    ).slice(0, 160),
                    reason: "點餐機重新開啟，取消尚未投入現金的舊付款"
                }
            });
        }
        return cancelRequest.then(function () {
            return waitForBootCancel(orderNo, checkout, 0);
        }).catch(function (error) {
            if (error.code === "ORDER_NOT_FOUND") {
                clearStoredTransaction("homePage", checkout);
                return "cleared";
            }
            if (!hasAcceptedCashEvidence(active) && isTransientRecoveryError(error)) {
                scheduleBootRecoveryRetry(error);
                return "retry";
            }
            // CASH_ALREADY_ACCEPTED 等拒絕必須保留交易，由原本恢復流程接手。
            bootRecoveryResolved = true;
            return "live";
        });
    }

    function showRecoveryBlocked(error) {
        var checkout = active && active.order;
        var paid = Number(active && active.lastPaidNtd || 0);
        var preserveHome = bootHomeReleasePending && !hasAcceptedCashEvidence(active);
        bootRecoveryResolved = true;
        setLocked(!preserveHome);
        setOverlay({
            title: hasAcceptedCashEvidence(active)
                ? "需要員工確認上一筆交易"
                : "正在確認上一筆付款",
            amount: checkout && checkout.amount,
            paid: paid,
            remaining: checkout ? Math.max(0, checkout.amount - paid) : 0,
            orderNo: checkout && checkout.orderNo,
            message: (error && error.message || "無法確認上一筆付款狀態") +
                "。系統已保留交易，避免重複收款。",
            retry: true,
            manage: hasAcceptedCashEvidence(active),
            cancelAllowed: !hasAcceptedCashEvidence(active),
            preservePage: preserveHome
        });
    }

    function verifyStoredTransaction() {
        var checking;
        var orderNo;
        if (!active || active.state === "COMPLETED") {
            clearStoredTransaction();
            return Promise.resolve("cleared");
        }
        if (bootRecoveryPromise) return bootRecoveryPromise;
        orderNo = active.order && active.order.orderNo;
        if (!orderNo) {
            if (!hasAcceptedCashEvidence(active)) {
                clearStoredTransaction();
                return Promise.resolve("cleared");
            }
            bootRecoveryResolved = true;
            showRecoveryBlocked(new Error("上一筆交易資料不完整"));
            return Promise.resolve("blocked");
        }
        checking = active;
        bootRecoveryPromise = api(
            "/payments/" + encodeURIComponent(orderNo)
        ).then(function (payload) {
            if (active !== checking) return active ? "changed" : "cleared";
            if (bootRecoveryRetryTimer) clearTimeout(bootRecoveryRetryTimer);
            bootRecoveryRetryTimer = null;
            bootRecoveryRetryAttempt = 0;
            updateActiveFromController(payload);
            if (isTerminalControllerStatus(payload.status)) {
                clearStoredTransaction();
                return "cleared";
            }
            bootRecoveryResolved = true;
            if (payload.status === "PRINT_AUTHORIZED") {
                handleAuthorization(payload);
                return "handled";
            }
            if (isZeroCashCancelableStatus(payload)) {
                return cancelStoredZeroCashAtBoot(payload);
            }
            return "live";
        }).catch(function (error) {
            if (active !== checking) return active ? "changed" : "cleared";
            if (
                !hasAcceptedCashEvidence(active) &&
                (
                    error.code === "ORDER_NOT_FOUND" ||
                    isStaleZeroCashTransaction(active)
                )
            ) {
                clearStoredTransaction();
                return "cleared";
            }
            if (!hasAcceptedCashEvidence(active) && isTransientRecoveryError(error)) {
                scheduleBootRecoveryRetry(error);
                return "retry";
            }
            showRecoveryBlocked(error);
            return "blocked";
        }).then(function (result) {
            bootRecoveryPromise = null;
            return result;
        }, function (error) {
            bootRecoveryPromise = null;
            throw error;
        });
        return bootRecoveryPromise;
    }

    function normalizeReturnPage(returnPage, context) {
        if (
            returnPage === "homePage" ||
            returnPage === "ticketPage" ||
            returnPage === "detailPage"
        ) {
            return returnPage;
        }
        return context && context.purchasePage === "detailPage"
            ? "detailPage"
            : "ticketPage";
    }

    function restoreCheckout(context, returnPage) {
        var target = normalizeReturnPage(returnPage, context);
        pendingContext = null;
        pendingPurchasePage = null;
        hideOverlay();
        setLocked(false);
        if (
            window.MonsterPayment &&
            typeof window.MonsterPayment.restoreFailedCashCheckout === "function"
        ) {
            window.MonsterPayment.restoreFailedCashCheckout(context, target);
        } else if (typeof showPage === "function") {
            showPage(target);
        }
    }

    function cancelPreflight(returnPage) {
        var checkout = pendingContext;
        pendingStartToken += 1;
        restoreCheckout(checkout, returnPage);
        return Promise.resolve(true);
    }

    function requestCancelAndReturn(returnPage) {
        var checkout;
        if (!active) {
            if (!pendingContext) return Promise.resolve(false);
            if (!confirm("確定取消這次現金付款並返回嗎？")) return Promise.resolve(false);
            return cancelPreflight(returnPage);
        }
        checkout = active.order;
        if (Number(active.lastPaidNtd || 0) > 0) {
            alert("已投入現金，為避免帳款不一致，不能直接返回。請完成付款或通知員工處理。");
            return Promise.resolve(false);
        }
        if (
            active.state === "CLAIMED" ||
            active.state === "ISSUE_STARTED" ||
            active.state === "ACK_PENDING" ||
            active.state === "RECOVERY_REQUIRED"
        ) {
            alert("付款或出票處理已開始，目前不能返回。");
            return Promise.resolve(false);
        }
        if (!confirm("確定取消這次現金付款並返回嗎？")) return Promise.resolve(false);
        stopPolling();
        active.cancelReturnPage = normalizeReturnPage(returnPage, active.order);
        setOverlay({
            title: "正在取消付款",
            amount: active.order.amount,
            paid: 0,
            remaining: active.order.amount,
            orderNo: active.order.orderNo,
            message: "正在通知控制器停止收鈔與收幣，完成前請勿投入現金。",
            cancelAllowed: true,
            cancelPending: true
        });
        active.state = "CANCEL_REQUESTED";
        active.updatedAt = Date.now();
        saveActive();
        return api("/payments/" + encodeURIComponent(active.order.orderNo) + "/cancel", {
            method: "POST",
            body: {
                requestId: "CANCEL-" + active.requestId,
                reason: "售票頁使用者取消付款"
            }
        }).then(function () {
            pollPayment(active.order.orderNo);
            return true;
        }).catch(function (error) {
            if (
                error.code === "ORDER_NOT_FOUND" &&
                active &&
                Number(active.lastPaidNtd || 0) === 0
            ) {
                clearStoredTransaction(
                    normalizeReturnPage(returnPage, checkout),
                    checkout
                );
                return true;
            }
            setOverlay({
                title: "取消付款尚未完成",
                amount: active && active.order.amount,
                paid: active && active.lastPaidNtd,
                remaining: active
                    ? Math.max(0, active.order.amount - Number(active.lastPaidNtd || 0))
                    : 0,
                orderNo: active && active.order.orderNo,
                message: error.message || "控制器未確認取消，請勿投入現金並通知員工。",
                retry: true
            });
            if (active && active.order && active.order.orderNo) {
                pollTimer = setTimeout(function () {
                    pollPayment(active.order.orderNo);
                }, 700);
            }
            return false;
        });
    }

    function statusCopy(status, payload) {
        if (status === "QUEUED") return "控制器已收到訂單；若畫面未自動切換，請開啟 Hardware Explorer。";
        if (status === "PAYMENT_PENDING") return payload.message || "請依畫面目前開放的面額投入現金。";
        if (status === "CHANGE_PENDING") return "已收足，正在準備自動找零；找零完成前不會列印收據。";
        if (status === "CHANGE_DISPENSING") return payload.message || "正在自動找零；完成前不會列印收據。";
        if (status === "PAID_WAITING_DISPATCH") return "付款完成，正在建立唯一出票授權。";
        return payload.message || "正在確認付款狀態。";
    }

    function pollPayment(orderNo) {
        stopPolling();
        api("/payments/" + encodeURIComponent(orderNo)).then(function (payload) {
            if (!active || active.order.orderNo !== orderNo) return;
            active.lastControllerStatus = payload.status;
            active.lastPaidNtd = Number(payload.paidNtd || 0);
            active.lastCoinCount = Number(payload.coinCount || 0);
            active.lastBillCount = Number(payload.billCount || 0);
            active.lastCounts = payload.counts || {};
            active.updatedAt = Date.now();
            saveActive();
            if (payload.status === "PRINT_AUTHORIZED") {
                handleAuthorization(payload);
                return;
            }
            if (payload.status === "TICKET_ISSUED") {
                finishLocalTransaction();
                return;
            }
            if (payload.status === "CANCELED") {
                stopPolling();
                if (Number(payload.paidNtd || 0) > 0 && /人工處理完成/.test(String(payload.message || ""))) {
                    setOverlay({
                        title: "人工處理已完成",
                        amount: payload.amountNtd,
                        paid: payload.paidNtd,
                        remaining: payload.remainingNtd,
                        orderNo: orderNo,
                        message: payload.message || "本筆已關閉，不會出票。"
                    });
                    setTimeout(function () {
                        active = null;
                        saveActive();
                        hideOverlay();
                        setLocked(false);
                        if (window.MonsterCashOperations) MonsterCashOperations.refresh();
                    }, 1800);
                    return;
                }
                setOverlay({
                    title: "付款已取消",
                    amount: Number(payload.amountNtd || active.order.amount || 0),
                    paid: payload.paidNtd,
                    remaining: Number(payload.remainingNtd || active.order.amount || 0),
                    orderNo: orderNo,
                    message: payload.message || "本筆未出票"
                });
                if (Number(payload.paidNtd || 0) === 0) {
                    setTimeout(function () {
                        var checkout = active && active.order;
                        var returnPage = active && active.cancelReturnPage;
                        active = null;
                        pendingPurchasePage = null;
                        saveActive();
                        hideOverlay();
                        setLocked(false);
                        if (
                            window.MonsterPayment &&
                            typeof window.MonsterPayment.restoreFailedCashCheckout === "function"
                        ) {
                            window.MonsterPayment.restoreFailedCashCheckout(
                                checkout,
                                normalizeReturnPage(returnPage, checkout)
                            );
                        }
                    }, 1800);
                }
                return;
            }
            if (payload.status === "RECONCILIATION_REQUIRED") {
                stopPolling();
                active.state = "RECONCILIATION_REQUIRED";
                active.lastPaidNtd = Number(payload.paidNtd || 0);
                active.updatedAt = Date.now();
                saveActive();
                setOverlay({
                    title: "需要員工人工處理",
                    amount: payload.amountNtd,
                    paid: payload.paidNtd,
                    remaining: payload.remainingNtd,
                    orderNo: orderNo,
                    message: payload.message || "已收現金但交易未完成，系統已禁止出票。",
                    manage: true
                });
                if (window.MonsterCashOperations) MonsterCashOperations.refresh();
                return;
            }
            var cancelAllowed =
                Number(payload.paidNtd || 0) === 0 &&
                (
                    payload.status === "QUEUED" ||
                    payload.status === "PAYMENT_PENDING"
                );
            setOverlay({
                title: payload.status === "CANCEL_REQUESTED"
                    ? "正在取消付款"
                    : payload.status === "PAYMENT_PENDING"
                    ? "請投入現金"
                    : (payload.status === "CHANGE_PENDING" || payload.status === "CHANGE_DISPENSING")
                        ? "正在自動找零"
                        : "準備現金付款",
                amount: payload.amountNtd,
                paid: payload.paidNtd,
                remaining: payload.remainingNtd,
                orderNo: orderNo,
                message: statusCopy(payload.status, payload),
                coinCount: payload.coinCount,
                billCount: payload.billCount,
                counts: payload.counts,
                cancelAllowed: cancelAllowed,
                cancelPending: payload.status === "CANCEL_REQUESTED"
            });
            pollTimer = setTimeout(function () { pollPayment(orderNo); }, POLL_MS);
        }).catch(function (error) {
            if (error.code === "PAIRING_REQUIRED") {
                localStorage.removeItem(PAIRING_KEY);
            }
            if (
                error.code === "ORDER_NOT_FOUND" &&
                active &&
                Number(active.lastPaidNtd || 0) === 0
            ) {
                clearStoredTransaction(purchasePage(), active.order);
                return;
            }
            setOverlay({
                title: "暫時無法連接控制器",
                amount: active && active.order.amount,
                paid: active && active.lastPaidNtd,
                remaining: active ? Math.max(0, active.order.amount - Number(active.lastPaidNtd || 0)) : 0,
                orderNo: active && active.order.orderNo,
                message: error.message + "。若尚未投入現金，可重新連線；若已投入，請勿建立新訂單。",
                retry: true
            });
        });
    }

    function handleAuthorization(payload) {
        stopPolling();
        var authorizationId = String(payload.authorizationId || "");
        if (!authorizationId || !active) return;
        active.state = "CLAIMED";
        active.authorization = {
            authorizationId: authorizationId,
            paymentId: payload.paymentId || "",
            paidAt: payload.paidAt || Date.now(),
            bridgeVersion: payload.bridgeVersion || "1.0-sprint8-fix1",
            paidNtd: Number(payload.paidNtd || 0),
            coinCount: Number(payload.coinCount || 0),
            billCount: Number(payload.billCount || 0),
            counts: payload.counts || {}
        };
        active.updatedAt = Date.now();
        saveActive();
        try {
            var order = window.MonsterPayment.finalizeAuthorizedCash(active, active.authorization);
            active.state = "ISSUE_STARTED";
            active.savedOrderNo = order.orderNo;
            saveActive();
            hideOverlay();
        } catch (error) {
            active.state = "RECOVERY_REQUIRED";
            active.error = error.message || String(error);
            saveActive();
            setOverlay({
                title: "付款完成，需要員工處理",
                amount: payload.amountNtd,
                paid: payload.paidNtd,
                remaining: 0,
                orderNo: active.order.orderNo,
                message: "現金已收，但售票紀錄保存失敗。請勿再次付款或重複出票。"
            });
        }
    }

    function acknowledgeIssued(order) {
        if (!active || !active.authorization) return Promise.resolve(false);
        var orderNo = active.order.orderNo;
        var authorizationId = active.authorization.authorizationId;
        active.state = "ACK_PENDING";
        saveActive();
        return api("/payments/" + encodeURIComponent(orderNo) + "/issued", {
            method: "POST",
            body: { authorizationId: authorizationId }
        }).then(function () {
            var matching = salesHistory.find(function (item) {
                return item && item.printAuthorizationId === authorizationId;
            });
            if (matching) {
                matching.hardwareCashStatus = "ticket_issued";
                matching.hardwareIssuedAt = Date.now();
                matching.updatedAt = Date.now();
                saveSalesHistory();
            }
            finishLocalTransaction();
            if (window.MonsterCashOperations) MonsterCashOperations.refresh();
            return true;
        }).catch(function () {
            active.state = "ACK_PENDING";
            saveActive();
            setTimeout(function () { acknowledgeIssued(order); }, 2000);
            return false;
        });
    }

    function finishLocalTransaction() {
        stopPolling();
        if (active) {
            active.state = "COMPLETED";
            active.completedAt = Date.now();
            saveActive();
        }
        setTimeout(function () {
            active = null;
            bootSessionRecovery = false;
            bootHomeReleasePending = false;
            saveActive();
            hideOverlay();
            setLocked(false);
        }, 500);
    }

    function startCashPayment(printerReady, preparedContext) {
        if (pendingContext && !active) {
            // 購物車按鈕可能同時有舊版與新版事件；同一個收據機預檢只能執行一次。
            resumeActivePayment();
            return;
        }
        if (active && active.state !== "COMPLETED") {
            setOverlay({
                title: "正在確認上一筆付款",
                amount: active.order && active.order.amount,
                paid: active.lastPaidNtd,
                remaining: active.order
                    ? Math.max(0, active.order.amount - Number(active.lastPaidNtd || 0))
                    : 0,
                orderNo: active.order && active.order.orderNo,
                message: "正在向 Controller 113 對帳，請稍候。",
                cancelAllowed: Number(active.lastPaidNtd || 0) === 0
            });
            verifyStoredTransaction().then(function (result) {
                if (result === "cleared") {
                    startCashPayment(printerReady, preparedContext);
                } else if (result === "live") {
                    resumeActivePayment();
                }
            });
            return;
        }
        if (active && active.state === "COMPLETED") {
            clearStoredTransaction();
        }
        bootSessionRecovery = false;
        var context = preparedContext;
        if (!context) {
            try {
                context = window.MonsterPayment.buildContext();
            } catch (error) {
                alert("無法建立現金訂單：" + (error.message || error));
                return;
            }
        }
        pendingPurchasePage = context.purchasePage === "detailPage"
            ? "detailPage"
            : "ticketPage";
        // 全額點數折抵時不啟動收鈔／收幣，直接走同一套防重複訂單流程。
        if (Number(context.amount || 0) === 0) {
            window.MonsterPayment.finalizePointOnly(context);
            return;
        }
        if (!requestPairingKey()) return;
        if (!printerReady) {
            if (!window.MonsterReceiptPrinter || typeof MonsterReceiptPrinter.getStatus !== "function") {
                alert("實體收據列印模組尚未載入，已停止現金付款");
                return;
            }
            var preflightToken = ++pendingStartToken;
            pendingContext = context;
            setLocked(true);
            setOverlay({
                title: "正在檢查收據機",
                amount: context.amount,
                paid: 0,
                remaining: context.amount,
                orderNo: context.orderNo,
                message: "確認 ttyS4／9600 可使用後才會開放投入現金。",
                cancelAllowed: true
            });
            MonsterReceiptPrinter.getStatus().then(function () {
                if (preflightToken !== pendingStartToken || pendingContext !== context) return;
                pendingContext = null;
                startCashPayment(true, context);
            }).catch(function (error) {
                if (preflightToken !== pendingStartToken || pendingContext !== context) return;
                pendingContext = null;
                setLocked(false);
                setOverlay({
                    title: "收據機尚未就緒",
                    amount: context.amount,
                    paid: 0,
                    remaining: context.amount,
                    orderNo: context.orderNo,
                    message: (error.message || "無法開啟收據機") + "。本次尚未開始收款，請先通知員工。",
                    retry: false
                });
                setTimeout(hideOverlay, 4500);
            });
            return;
        }
        pendingContext = null;
        bootHomeReleasePending = false;
        active = {
            version: 1,
            state: "REQUESTING",
            requestId: "WEB-" + context.orderNo,
            order: context,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        bootRecoveryResolved = true;
        pendingPurchasePage = null;
        saveActive();
        setLocked(true);
        setOverlay({
            title: "正在啟動現金控制器",
            amount: context.amount,
            paid: 0,
            remaining: context.amount,
            orderNo: context.orderNo,
            message: "請稍候，控制器會自動開啟。",
            cancelAllowed: true
        });
        api("/payments", {
            method: "POST",
            body: {
                requestId: active.requestId,
                orderId: context.orderNo,
                amountNtd: context.amount
            }
        }).then(function () {
            active.state = "QUEUED";
            active.updatedAt = Date.now();
            saveActive();
            pollPayment(context.orderNo);
        }).catch(function (error) {
            if (error.code === "PAIRING_REQUIRED") localStorage.removeItem(PAIRING_KEY);
            active = null;
            bootSessionRecovery = false;
            bootHomeReleasePending = false;
            pendingPurchasePage = null;
            saveActive();
            setLocked(false);
            setOverlay({
                title: "無法開始現金付款",
                amount: context.amount,
                paid: 0,
                remaining: context.amount,
                orderNo: context.orderNo,
                message: error.message + "。請先開啟 Hardware Explorer 並確認配對碼。",
                retry: false
            });
            setTimeout(hideOverlay, 3500);
        });
    }

    function recover() {
        if (!active || active.state === "COMPLETED") {
            clearStoredTransaction();
            return;
        }
        // FIX16：等待 Kiosk 注入配對碼與 Controller 113 就緒，不把短暫啟動競態誤判為死鎖。
        // 開機先留在首頁；零投入舊付款會先請 Controller 113 安全取消。
        // Controller 端會再次檢查實際投入金額，若已有現金就拒絕取消並恢復原交易。
        verifyStoredTransaction().then(function (result) {
            var authorizationId;
            var savedOrder;
            if (result === "retry") {
                scheduleBootRecoveryRetry();
                return;
            }
            if (result !== "live" || !active) return;
            if (bootHomeReleasePending && !hasAcceptedCashEvidence(active)) {
                // Controller 尚未完成零元取消時留在首頁並持續背景重試。
                bootRecoveryResolved = false;
                scheduleBootRecoveryRetry({ code: "HOME_RELEASE_PENDING" });
                return;
            }
            if (active.state === "ISSUE_STARTED" || active.state === "ACK_PENDING") {
                authorizationId = active.authorization && active.authorization.authorizationId;
                savedOrder = salesHistory.find(function (order) {
                    return order && order.printAuthorizationId === authorizationId;
                });
                if (savedOrder && savedOrder.receiptPrintStatus === "printed") {
                    acknowledgeIssued();
                    return;
                }
                active.state = "RECOVERY_REQUIRED";
                saveActive();
            }
            if (active.state === "CLAIMED" || active.state === "RECOVERY_REQUIRED") {
                setLocked(true);
                setOverlay({
                    title: "需要員工確認",
                    amount: active.order.amount,
                    paid: active.order.amount,
                    remaining: 0,
                    orderNo: active.order.orderNo,
                    message: "偵測到付款完成後曾中斷。為避免重複出票，請由員工核對售票紀錄與控制器。"
                });
                return;
            }
            resumeActivePayment();
        });
    }

    function recoverWhenBridgeReady() {
        if (!active || active.state === "COMPLETED") {
            recover();
            return;
        }
        if (!isPairingReady()) {
            showBootRecoveryWaiting({ code: "PAIRING_REQUIRED" });
            if (!bootRecoveryRetryTimer) {
                bootRecoveryRetryTimer = setTimeout(function () {
                    bootRecoveryRetryTimer = null;
                    recoverWhenBridgeReady();
                }, BOOT_PAIRING_POLL_MS);
            }
            return;
        }
        recover();
    }

    function showHomeAfterSafeRelease() {
        hideOverlay();
        setLocked(false);
        if (
            window.MonsterHomeGuard &&
            typeof window.MonsterHomeGuard.forceHomeIfSafe === "function"
        ) {
            return !!window.MonsterHomeGuard.forceHomeIfSafe();
        }
        if (typeof showPage === "function") {
            showPage("homePage");
            return true;
        }
        return false;
    }

    // Kiosk 115 與票種頁返回鍵共用的安全首頁交握：
    // 沒有投入現金可向 Controller 113 對帳後取消；已有投入則保留交易與明細。
    function requestHomeIfSafe(options) {
        var released;
        options = options || {};
        if (pendingContext && !active) {
            pendingStartToken += 1;
            pendingContext = null;
            pendingPurchasePage = null;
            return Promise.resolve(showHomeAfterSafeRelease());
        }
        if (!active || active.state === "COMPLETED") {
            clearStoredTransaction();
            return Promise.resolve(showHomeAfterSafeRelease());
        }
        if (hasAcceptedCashEvidence(active)) {
            bootHomeReleasePending = false;
            bootRecoveryResolved = true;
            resumeActivePayment();
            return Promise.resolve(false);
        }
        // FIX17：尚未投入現金時先回首頁，Controller 取消與對帳留在背景執行。
        // 開始購票鍵會由 isStartBlocked() 暫時擋住，避免舊付款未取消前建立新單。
        bootHomeReleasePending = true;
        bootRecoveryResolved = false;
        hideOverlay();
        setLocked(false);
        released = showHomeAfterSafeRelease();
        verifyStoredTransaction().then(function (result) {
            if (!active || result === "cleared") return;
            if (result === "retry") {
                scheduleBootRecoveryRetry();
                return;
            }
            if (hasAcceptedCashEvidence(active)) {
                bootHomeReleasePending = false;
                bootRecoveryResolved = true;
                resumeActivePayment();
                return;
            }
            if (result === "live") {
                bootRecoveryResolved = false;
                scheduleBootRecoveryRetry({ code: "HOME_RELEASE_PENDING" });
            }
        }, function (error) {
            showRecoveryBlocked(error);
        });
        return Promise.resolve(!!released);
    }

    function resumeActivePayment() {
        var context = active && active.order ? active.order : pendingContext;
        var amount;
        var paid;
        var state;
        if (!context) {
            setLocked(false);
            return false;
        }
        if (
            bootHomeReleasePending &&
            active &&
            !hasAcceptedCashEvidence(active)
        ) {
            hideOverlay();
            setLocked(false);
            return false;
        }
        amount = Math.max(0, Number(context.amount || 0));
        paid = Math.max(0, Number(active && active.lastPaidNtd || 0));
        state = active && active.state || "PREFLIGHT";
        setLocked(true);
        setOverlay({
            title: state === "PREFLIGHT" ? "正在檢查收據機" : "正在恢復現金付款",
            amount: amount,
            paid: paid,
            remaining: Math.max(0, amount - paid),
            orderNo: context.orderNo,
            message: "正在連接 Controller 113；畫面會自動更新投入金額與數量。",
            coinCount: active && active.lastCoinCount,
            billCount: active && active.lastBillCount,
            counts: active && active.lastCounts,
            cancelAllowed: paid === 0
        });
        if (
            hasAcceptedCashEvidence(active) &&
            window.MonsterNativeKiosk &&
            typeof window.MonsterNativeKiosk.activePaymentReady === "function"
        ) {
            try {
                window.MonsterNativeKiosk.activePaymentReady(state);
            } catch (ignore) {}
        }
        if (active && active.order && active.order.orderNo) {
            pollPayment(active.order.orderNo);
        }
        return true;
    }

    window.MonsterCashBridge = {
        startCashPayment: startCashPayment,
        hasAcceptedPayment: function () {
            return hasAcceptedCashEvidence(active);
        },
        blocksTicketBrowsing: function () {
            // A transaction recovered from boot with no accepted cash may keep
            // cancelling in background while the customer browses ticket cards.
            // The actual cash-payment entry point still verifies and blocks it.
            if (pendingContext) return true;
            if (!active || active.state === "COMPLETED") return false;
            if (hasAcceptedCashEvidence(active)) return true;
            return !bootHomeReleasePending;
        },
        hasBlockingTransaction: function () {
            return !!pendingContext || !!(
                bootRecoveryResolved &&
                active &&
                active.state !== "COMPLETED" &&
                (
                    !bootHomeReleasePending ||
                    hasAcceptedCashEvidence(active)
                )
            );
        },
        isStartBlocked: function () {
            return !!pendingContext || !!(
                active &&
                active.state !== "COMPLETED"
            ) || !bootRecoveryResolved;
        },
        shouldKeepHomeDuringBootRecovery: function () {
            return !!(
                bootSessionRecovery &&
                active &&
                active.state !== "COMPLETED"
            );
        },
        getPurchasePage: purchasePage,
        requestCancelAndReturn: requestCancelAndReturn,
        requestHomeIfSafe: requestHomeIfSafe,
        resumeActivePayment: resumeActivePayment,
        onTicketAnimationFinished: function (order) {
            if (!active || !active.authorization || !order) return;
            if (order.printAuthorizationId !== active.authorization.authorizationId) return;
            acknowledgeIssued(order);
        },
        clearPairing: function () {
            localStorage.removeItem(PAIRING_KEY);
        },
        hasPairing: function () {
            return /^\d{8}$/.test(pairingKey());
        },
        getOperationalStatus: function () {
            return api("/status");
        },
        getTodayReconciliation: function () {
            return api("/reconciliation/today");
        },
        resolveReconciliation: function (orderNo, resolution, note) {
            return api("/payments/" + encodeURIComponent(orderNo) + "/reconcile", {
                method: "POST",
                body: { resolution: resolution, note: note }
            });
        },
        purgeTestData: function (orderIds) {
            return api("/maintenance/purge-test-data", {
                method: "POST",
                body: {
                    orderIds: orderIds || [],
                    confirmation: "CLEAR_TEST_ONLY"
                }
            });
        },
        releaseAfterReconciliation: function (orderNo) {
            if (active && active.order && active.order.orderNo === orderNo) {
                active = null;
                bootSessionRecovery = false;
                bootRecoveryResolved = true;
                saveActive();
                hideOverlay();
                setLocked(false);
            }
        },
        _test: {
            getActive: function () { return active; },
            setActive: function (value) {
                active = value;
                bootSessionRecovery = false;
                bootHomeReleasePending = false;
                bootRecoveryResolved = true;
                saveActive();
            },
            verifyStoredTransaction: verifyStoredTransaction,
            isZeroCashCancelableStatus: isZeroCashCancelableStatus,
            cancelStoredZeroCashAtBoot: cancelStoredZeroCashAtBoot,
            isRecoveryResolved: function () { return bootRecoveryResolved; },
            showOverlay: setOverlay,
            hideOverlay: hideOverlay,
            formatCashBreakdown: formatCashBreakdown
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", recoverWhenBridgeReady);
    } else {
        setTimeout(recoverWhenBridgeReady, 0);
    }
})();
