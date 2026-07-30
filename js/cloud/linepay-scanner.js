// 小怪獸售票機 V7.8.3.3 Sprint 10
// LINE Pay Offline API v4：USB HID 掃描客人 My Code
// Android WebView 61 相容（ES5）
(function () {
    "use strict";

    var REGION = "asia-east1";
    var ACTIVE_KEY = "monsterLinePayScannerTransactionV1";
    var MAX_BUFFER = 512;
    var POLL_MS = 1800;
    var active = loadJson(ACTIVE_KEY);
    var scanBuffer = "";
    var lastKeyAt = 0;
    var submitTimer = null;
    var pollTimer = null;
    var functionsInstance = null;

    function loadJson(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function saveActive() {
        if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
        else localStorage.removeItem(ACTIVE_KEY);
    }

    function hasSubmittedPaymentEvidence(transaction) {
        var state;
        if (!transaction) return false;
        state = String(transaction.state || "");
        if (
            state === "WAITING_SCAN" ||
            state === "SETUP_REQUIRED" ||
            state === "FAILED" ||
            state === "REFUNDED"
        ) {
            return false;
        }
        if (transaction.authorization || transaction.submittedAt) return true;
        return state === "SUBMITTING" ||
            state === "CHECKING" ||
            state === "AUTHORIZED" ||
            state === "ORDER_SAVED" ||
            state === "RECOVERY_REQUIRED" ||
            state === "MANUAL_REVIEW";
    }

    function canDiscardWithoutPaymentRisk(transaction) {
        if (!transaction) return true;
        return !hasSubmittedPaymentEvidence(transaction);
    }

    function setLocked(locked) {
        if (window.MonsterPayment) window.MonsterPayment.setLocked(locked);
        else window.paymentInProgress = !!locked;
    }

    function ensureOverlay() {
        var overlay = document.getElementById("linePayScanOverlay");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "linePayScanOverlay";
        overlay.className = "linepay-scan-overlay";
        overlay.setAttribute("data-state", "waiting");
        overlay.innerHTML = [
            '<div id="linePayScanCard" class="linepay-scan-card" tabindex="-1">',
            '  <div class="linepay-scan-logo">LINE Pay</div>',
            '  <h2 id="linePayScanTitle">請出示付款碼</h2>',
            '  <div id="linePayScanAmount" class="linepay-scan-amount">NT$0</div>',
            '  <p id="linePayScanMessage" class="linepay-scan-message">請開啟 LINE Pay 的「付款碼」，讓點餐機掃描器讀取。</p>',
            '  <div class="linepay-scan-progress"><span id="linePayScanProgress"></span></div>',
            '  <div id="linePayScanCount" class="linepay-scan-count">等待掃描（0／18）</div>',
            '  <small id="linePayScanOrder" class="linepay-scan-order"></small>',
            '  <div class="linepay-scan-actions">',
            '    <button id="linePayScanCancel" type="button">取消付款</button>',
            '    <button id="linePayScanAction" type="button">關閉</button>',
            '  </div>',
            '</div>'
        ].join("");
        document.body.appendChild(overlay);
        document.getElementById("linePayScanCancel").addEventListener("click", cancelBeforeScan);
        document.getElementById("linePayScanAction").addEventListener("click", handleAction);
        return overlay;
    }

    function setOverlay(options) {
        options = options || {};
        var overlay = ensureOverlay();
        overlay.classList.add("show");
        overlay.setAttribute("data-state", options.state || "waiting");
        document.getElementById("linePayScanTitle").textContent =
            options.title || "請出示付款碼";
        document.getElementById("linePayScanAmount").textContent =
            "NT$" + Number(active && active.order && active.order.amount || 0);
        document.getElementById("linePayScanMessage").textContent =
            options.message || "請開啟 LINE Pay 的「付款碼」，讓點餐機掃描器讀取。";
        document.getElementById("linePayScanOrder").textContent =
            active && active.order ? ("訂單 " + active.order.orderNo) : "";
        document.getElementById("linePayScanCancel").style.display =
            options.cancel === false ? "none" : "inline-block";
        var action = document.getElementById("linePayScanAction");
        action.style.display = options.action ? "inline-block" : "none";
        action.textContent = options.action || "關閉";
        updateScanProgress();
        setTimeout(function () {
            var card = document.getElementById("linePayScanCard");
            if (card) card.focus();
        }, 0);
    }

    function hideOverlay() {
        var overlay = document.getElementById("linePayScanOverlay");
        if (overlay) overlay.classList.remove("show");
    }

    function clearUnfundedTransaction(reason) {
        if (!canDiscardWithoutPaymentRisk(active)) return false;
        stopTimers();
        active = null;
        saveActive();
        resetBuffer();
        hideOverlay();
        setLocked(false);
        try {
            localStorage.setItem(
                "monsterLinePayLastSafeReleaseV1",
                JSON.stringify({ at: Date.now(), reason: String(reason || "safe-release") })
            );
        } catch (ignore) {}
        return true;
    }

    function updateScanProgress(message) {
        var count = Math.min(18, extractOneTimeKey(scanBuffer) ? 18 : digitCount(scanBuffer));
        var progress = document.getElementById("linePayScanProgress");
        var label = document.getElementById("linePayScanCount");
        if (progress) progress.style.width = Math.round(count / 18 * 100) + "%";
        if (label) label.textContent = message || ("等待掃描（" + count + "／18）");
    }

    function digitCount(value) {
        return (String(value || "").match(/[0-9]/g) || []).length;
    }

    function extractOneTimeKey(value) {
        var source = String(value || "").trim();
        if (/^[0-9]{18}$/.test(source)) return source;
        var query = source.match(/[?&]oneTimeKey=([0-9]{18})(?:&|$)/i);
        if (query) return query[1];
        var matches = source.match(/(?:^|[^0-9])([0-9]{18})(?:[^0-9]|$)/g) || [];
        if (matches.length !== 1) return "";
        var digits = matches[0].replace(/[^0-9]/g, "");
        return digits.length === 18 ? digits : "";
    }

    function stopTimers() {
        if (submitTimer) clearTimeout(submitTimer);
        if (pollTimer) clearTimeout(pollTimer);
        submitTimer = null;
        pollTimer = null;
    }

    function resetBuffer(message) {
        if (submitTimer) clearTimeout(submitTimer);
        submitTimer = null;
        scanBuffer = "";
        lastKeyAt = 0;
        updateScanProgress(message);
    }

    function callable(name, data) {
        return waitForCloud().then(function () {
            if (!window.firebase || !firebase.functions) {
                throw new Error("Firebase Functions SDK 尚未載入");
            }
            if (!functionsInstance) functionsInstance = firebase.app().functions(REGION);
            return functionsInstance.httpsCallable(name)(data || {});
        }).then(function (result) {
            return result && result.data ? result.data : {};
        });
    }

    function waitForCloud() {
        return new Promise(function (resolve, reject) {
            if (window.MonsterCloud && MonsterCloud.uid && window.firebase && firebase.functions) {
                resolve();
                return;
            }
            var finished = false;
            var timeout = setTimeout(function () {
                if (finished) return;
                finished = true;
                reject(new Error("Firebase 登入逾時，請檢查網路"));
            }, 15000);
            if (window.MonsterCloud && typeof MonsterCloud.onReady === "function") {
                MonsterCloud.onReady(function () {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    resolve();
                });
                return;
            }
            var timer = setInterval(function () {
                if (window.MonsterCloud && MonsterCloud.uid) {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    clearInterval(timer);
                    resolve();
                }
            }, 250);
        });
    }

    function requestPayload(oneTimeKey) {
        var context = active.order;
        return {
            orderNo: context.orderNo,
            expectedAmount: Number(context.amount || 0),
            expectedOriginalAmount: Number(context.originalAmount || 0),
            pointUse: context.pointUse || { points: 0, discount: 0 },
            memberId: context.memberInfo && context.memberInfo.memberId || "",
            items: (context.items || []).map(function (item) {
                return {
                    id: String(item.id || ""),
                    quantity: Number(item.quantity || item.qty || 1)
                };
            }),
            oneTimeKey: oneTimeKey
        };
    }

    function submitScannedCode(oneTimeKey) {
        if (!active || active.state !== "WAITING_SCAN") return;
        scanBuffer = "";
        active.state = "SUBMITTING";
        active.submittedAt = Date.now();
        active.updatedAt = Date.now();
        saveActive();
        setOverlay({
            state: "processing",
            title: "正在處理 LINE Pay",
            message: "付款結果確認前請勿再次掃碼，也不要關閉點餐機。",
            cancel: false
        });
        callable("payWithLinePayMyCode", requestPayload(oneTimeKey)).then(handlePaymentResult)
            .catch(handleCallableError);
        oneTimeKey = "";
    }

    function handlePaymentResult(result) {
        if (!active) return;
        if (result.status === "PAID" && result.authorization) {
            active.state = "AUTHORIZED";
            active.authorization = result.authorization;
            active.updatedAt = Date.now();
            saveActive();
            finalizeAuthorized();
            return;
        }
        if (result.status === "PROCESSING") {
            active.state = "CHECKING";
            active.updatedAt = Date.now();
            saveActive();
            setOverlay({
                state: "processing",
                title: "正在確認付款結果",
                message: result.message || "請在手機完成 LINE Pay 驗證；請勿再次掃碼。",
                cancel: false
            });
            pollTimer = setTimeout(checkPayment, POLL_MS);
            return;
        }
        if (result.status === "MANUAL_REVIEW") {
            active.state = "MANUAL_REVIEW";
            active.updatedAt = Date.now();
            saveActive();
            setOverlay({
                state: "error",
                title: "請立即洽工作人員",
                message: result.message || "付款金額核對異常，系統已禁止出票。",
                cancel: false
            });
            return;
        }
        if (result.status === "REFUNDED") {
            terminalFailure(result.message || "款項已退回，請洽工作人員", true);
            return;
        }
        terminalFailure(result.message || "LINE Pay 付款未完成", false);
    }

    function checkPayment() {
        if (!active || active.state !== "CHECKING") return;
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = null;
        callable("checkLinePayOfflinePayment", {
            orderNo: active.order.orderNo
        }).then(handlePaymentResult).catch(function (error) {
            if (!active || active.state !== "CHECKING") return;
            var code = String(error && error.code || "");
            if (code.indexOf("not-found") >= 0) {
                active.state = "WAITING_SCAN";
                active.updatedAt = Date.now();
                saveActive();
                resetBuffer("請重新掃描（上一筆未送達 LINE Pay）");
                setOverlay({
                    state: "waiting",
                    title: "請重新掃描付款碼",
                    message: "上一筆請款沒有送達 LINE Pay，未發生扣款。",
                    cancel: true
                });
                return;
            }
            setOverlay({
                state: "processing",
                title: "網路暫時中斷",
                message: "系統仍在查詢付款結果；請勿再次掃碼或改用其他付款方式。",
                cancel: false
            });
            pollTimer = setTimeout(checkPayment, 3000);
        });
    }

    function errorReason(error) {
        return error && error.details && error.details.reason || "";
    }

    function handleCallableError(error) {
        if (!active) return;
        if (errorReason(error) === "KIOSK_NOT_AUTHORIZED") {
            active.state = "SETUP_REQUIRED";
            active.updatedAt = Date.now();
            saveActive();
            setOverlay({
                state: "error",
                title: "此點餐機尚未啟用",
                message: "請由店長輸入 LINE Pay 裝置啟用碼。",
                cancel: true,
                action: "啟用裝置"
            });
            return;
        }
        if (errorReason(error) === "INVALID_ONE_TIME_KEY" ||
            String(error && error.code || "").indexOf("invalid-argument") >= 0) {
            active.state = "WAITING_SCAN";
            active.updatedAt = Date.now();
            saveActive();
            resetBuffer("付款碼格式錯誤，請重新產生後再掃一次");
            setOverlay({
                state: "waiting",
                title: "付款碼無法辨識",
                message: "請確認手機顯示的是 LINE Pay 付款碼，再重新掃描。",
                cancel: true
            });
            return;
        }
        active.state = "CHECKING";
        active.updatedAt = Date.now();
        saveActive();
        setOverlay({
            state: "processing",
            title: "正在確認付款結果",
            message: "連線中斷後必須先查明結果；請勿再次掃碼。",
            cancel: false
        });
        pollTimer = setTimeout(checkPayment, 1200);
    }

    function terminalFailure(message, staffOnly) {
        stopTimers();
        if (active) {
            active.state = staffOnly ? "REFUNDED" : "FAILED";
            active.updatedAt = Date.now();
            saveActive();
        }
        setOverlay({
            state: "error",
            title: staffOnly ? "請洽工作人員" : "付款未完成",
            message: message,
            cancel: false,
            action: staffOnly ? "由工作人員關閉" : "改用其他方式"
        });
    }

    function finalizeAuthorized() {
        if (!active || !active.authorization) return;
        setOverlay({
            state: "processing",
            title: "付款成功",
            message: "正在建立訂單並列印收據，請稍候。",
            cancel: false
        });
        try {
            var order = window.MonsterPayment.finalizeAuthorizedLinePay(
                active.order,
                active.authorization
            );
            active.state = "ORDER_SAVED";
            active.savedOrderNo = order.orderNo;
            active.updatedAt = Date.now();
            saveActive();
            setTimeout(function () {
                active = null;
                saveActive();
                hideOverlay();
            }, 500);
        } catch (error) {
            active.state = "RECOVERY_REQUIRED";
            active.error = error.message || String(error);
            active.updatedAt = Date.now();
            saveActive();
            setOverlay({
                state: "error",
                title: "已付款，請由工作人員處理",
                message: "LINE Pay 已扣款，但本機訂單保存失敗。請勿再次付款或重複出票。",
                cancel: false
            });
        }
    }

    function registerKiosk() {
        var code = prompt("請輸入店長保管的 LINE Pay 裝置啟用碼：", "");
        if (code === null) return;
        code = String(code).trim();
        if (code.length < 8) {
            alert("啟用碼至少需要8個字元");
            return;
        }
        setOverlay({
            state: "processing",
            title: "正在啟用裝置",
            message: "請稍候。",
            cancel: false
        });
        callable("registerLinePayKiosk", {
            setupCode: code,
            label: "小怪獸售票機"
        }).then(function () {
            if (!active) return;
            active.state = "WAITING_SCAN";
            active.updatedAt = Date.now();
            saveActive();
            resetBuffer();
            setOverlay({
                state: "waiting",
                title: "請出示付款碼",
                message: "裝置已啟用，請重新掃描客人的 LINE Pay 付款碼。",
                cancel: true
            });
        }).catch(function (error) {
            setOverlay({
                state: "error",
                title: "裝置啟用失敗",
                message: error && error.message || "請確認啟用碼後重試。",
                cancel: true,
                action: "重新輸入"
            });
        });
        code = "";
    }

    function cancelBeforeScan() {
        if (!active) {
            hideOverlay();
            setLocked(false);
            return;
        }
        if (
            active.state !== "WAITING_SCAN" &&
            active.state !== "SETUP_REQUIRED" &&
            active.state !== "FAILED"
        ) {
            return;
        }
        stopTimers();
        active = null;
        saveActive();
        resetBuffer();
        hideOverlay();
        setLocked(false);
    }

    function handleAction() {
        if (!active) return;
        if (active.state === "SETUP_REQUIRED") {
            registerKiosk();
            return;
        }
        if (active.state === "FAILED") {
            active = null;
            saveActive();
            hideOverlay();
            setLocked(false);
            return;
        }
        if (active.state === "REFUNDED") {
            active = null;
            saveActive();
            hideOverlay();
            setLocked(false);
        }
    }

    function printableKey(event) {
        var key = event.key;
        if (key && key.length === 1) return key;
        var code = event.which || event.keyCode || 0;
        if (code >= 48 && code <= 90) return String.fromCharCode(code);
        if (code >= 96 && code <= 105) return String(code - 96);
        var symbols = { 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 219: "[", 220: "\\", 221: "]", 222: "'" };
        return symbols[code] || "";
    }

    function isEditableTarget(target) {
        var tag;
        if (!target) return false;
        tag = String(target.tagName || "").toUpperCase();
        return tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target.isContentEditable === true;
    }

    function scannerOverlayVisible() {
        var overlay = document.getElementById("linePayScanOverlay");
        return !!(
            overlay &&
            overlay.classList &&
            typeof overlay.classList.contains === "function" &&
            overlay.classList.contains("show")
        );
    }

    function shouldCaptureScannerKey(event) {
        if (!active || active.state !== "WAITING_SCAN") return false;
        if (!scannerOverlayVisible()) return false;
        if (isEditableTarget(event && event.target)) return false;
        return true;
    }

    function handleScannerKey(event) {
        if (!shouldCaptureScannerKey(event)) return;
        var code = event.which || event.keyCode || 0;
        if (code === 13 || event.key === "Enter") {
            event.preventDefault();
            var submitted = extractOneTimeKey(scanBuffer);
            if (submitted) submitScannedCode(submitted);
            else resetBuffer("不是有效的18位 LINE Pay 付款碼，請重新掃描");
            return;
        }
        var value = printableKey(event);
        if (!value) return;
        var stamp = Date.now();
        if (lastKeyAt && stamp - lastKeyAt > 700) scanBuffer = "";
        lastKeyAt = stamp;
        scanBuffer += value;
        if (scanBuffer.length > MAX_BUFFER) {
            resetBuffer("掃描內容過長，請確認是 LINE Pay 付款碼");
            return;
        }
        event.preventDefault();
        updateScanProgress();
        var key = extractOneTimeKey(scanBuffer);
        if (key && /^[0-9]{18}$/.test(scanBuffer)) {
            if (submitTimer) clearTimeout(submitTimer);
            submitTimer = setTimeout(function () {
                var latest = extractOneTimeKey(scanBuffer);
                if (latest) submitScannedCode(latest);
            }, 180);
        }
    }

    function start(context) {
        if (active && canDiscardWithoutPaymentRisk(active)) {
            clearUnfundedTransaction("new-linepay-start");
        }
        if (active && active.state !== "FAILED" && active.state !== "REFUNDED") {
            setLocked(true);
            recover();
            return;
        }
        active = {
            version: 1,
            state: "WAITING_SCAN",
            order: context,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        saveActive();
        resetBuffer();
        setLocked(true);
        setOverlay({
            state: "waiting",
            title: "請出示 LINE Pay 付款碼",
            message: "請客人開啟 LINE Pay 的「付款碼」，對準點餐機掃描器。",
            cancel: true
        });
    }

    function recover() {
        if (!active) return;
        // Waiting-for-scan/setup/failed records contain no submitted payment.
        // They must never survive a reload and block Start, Back, or password
        // digits. Only a submitted/checking/paid transaction is restored.
        if (canDiscardWithoutPaymentRisk(active)) {
            clearUnfundedTransaction("startup-unfunded-release");
            return;
        }
        setLocked(true);
        if (active.state === "WAITING_SCAN" || active.state === "SETUP_REQUIRED") {
            setOverlay({
                state: active.state === "WAITING_SCAN" ? "waiting" : "error",
                title: active.state === "WAITING_SCAN" ? "請出示 LINE Pay 付款碼" : "此點餐機尚未啟用",
                message: active.state === "WAITING_SCAN"
                    ? "請客人開啟 LINE Pay 的「付款碼」，對準點餐機掃描器。"
                    : "請由店長輸入 LINE Pay 裝置啟用碼。",
                cancel: true,
                action: active.state === "SETUP_REQUIRED" ? "啟用裝置" : ""
            });
            return;
        }
        if (active.state === "AUTHORIZED") {
            finalizeAuthorized();
            return;
        }
        if (active.state === "ORDER_SAVED") {
            active = null;
            saveActive();
            hideOverlay();
            return;
        }
        if (active.state === "RECOVERY_REQUIRED" || active.state === "MANUAL_REVIEW") {
            setOverlay({
                state: "error",
                title: "已付款，請由工作人員處理",
                message: "系統偵測到付款後中斷。請先核對後台交易，禁止再次付款或重複出票。",
                cancel: false
            });
            return;
        }
        if (active.state === "FAILED" || active.state === "REFUNDED") {
            terminalFailure(
                active.state === "REFUNDED" ? "款項已退回，請洽工作人員" : "付款未完成",
                active.state === "REFUNDED"
            );
            return;
        }
        active.state = "CHECKING";
        saveActive();
        setOverlay({
            state: "processing",
            title: "正在恢復付款狀態",
            message: "請勿再次掃碼；系統正在向 LINE Pay 查詢結果。",
            cancel: false
        });
        checkPayment();
    }

    window.addEventListener("keydown", handleScannerKey, true);

    window.MonsterLinePayScanner = {
        start: start,
        hasBlockingTransaction: function () {
            return hasSubmittedPaymentEvidence(active);
        },
        hasSubmittedPayment: function () {
            return hasSubmittedPaymentEvidence(active);
        },
        clearUnfundedTransaction: function (reason) {
            return clearUnfundedTransaction(reason || "external-safe-release");
        },
        health: function () {
            return callable("linePayHealth", {});
        },
        clearRegistration: function () {
            functionsInstance = null;
        },
        _test: {
            extractOneTimeKey: extractOneTimeKey,
            getActive: function () { return active; },
            setActive: function (value) { active = value; saveActive(); },
            shouldCaptureScannerKey: shouldCaptureScannerKey,
            hasSubmittedPaymentEvidence: hasSubmittedPaymentEvidence,
            clearUnfundedTransaction: clearUnfundedTransaction
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", recover);
    } else {
        setTimeout(recover, 0);
    }
})();
