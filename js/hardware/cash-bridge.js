// 小怪獸售票機 V7.8.3.3 Sprint 8
// GitHub Pages/PWA -> Android localhost cash controller bridge
// Android WebView 61 相容（ES5）
(function () {
    "use strict";

    var BASE_URL = "http://127.0.0.1:8765/v1";
    var PAIRING_KEY = "monsterCashBridgePairingKeyV1";
    var TRANSACTION_KEY = "monsterCashBridgeTransactionV1";
    var POLL_MS = 700;
    var pollTimer = null;
    var active = loadJson(TRANSACTION_KEY);

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
        return fetch(BASE_URL + path, request).then(function (response) {
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
        });
    }

    function ensureOverlay() {
        var overlay = document.getElementById("hardwareCashOverlay");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "hardwareCashOverlay";
        overlay.className = "hardware-cash-overlay";
        overlay.innerHTML = [
            '<div class="hardware-cash-card">',
            '  <div class="hardware-cash-monster">👾</div>',
            '  <h2 id="hardwareCashTitle">正在連接現金控制器</h2>',
            '  <div class="hardware-cash-amounts">',
            '    <div><span>應付</span><strong id="hardwareCashAmount">NT$0</strong></div>',
            '    <div><span>已付</span><strong id="hardwareCashPaid">NT$0</strong></div>',
            '    <div><span>尚差</span><strong id="hardwareCashRemaining">NT$0</strong></div>',
            '  </div>',
            '  <p id="hardwareCashMessage">請稍候…</p>',
            '  <small id="hardwareCashOrder"></small>',
            '  <button id="hardwareCashRetry" type="button" style="display:none;">重新連線</button>',
            '  <button id="hardwareCashManage" type="button" style="display:none;">店長人工處理</button>',
            '</div>'
        ].join("");
        document.body.appendChild(overlay);
        document.getElementById("hardwareCashRetry").addEventListener("click", function () {
            this.style.display = "none";
            if (active) pollPayment(active.order.orderNo);
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
        return overlay;
    }

    function setOverlay(data) {
        ensureOverlay().classList.add("show");
        document.getElementById("hardwareCashTitle").textContent = data.title || "現金付款中";
        document.getElementById("hardwareCashAmount").textContent = "NT$" + Number(data.amount || 0);
        document.getElementById("hardwareCashPaid").textContent = "NT$" + Number(data.paid || 0);
        document.getElementById("hardwareCashRemaining").textContent = "NT$" + Number(data.remaining || 0);
        document.getElementById("hardwareCashMessage").textContent = data.message || "請依控制器畫面投入現金";
        document.getElementById("hardwareCashOrder").textContent = data.orderNo ? ("訂單 " + data.orderNo) : "";
        document.getElementById("hardwareCashRetry").style.display = data.retry ? "inline-block" : "none";
        document.getElementById("hardwareCashManage").style.display = data.manage ? "inline-block" : "none";
    }

    function hideOverlay() {
        var overlay = document.getElementById("hardwareCashOverlay");
        if (overlay) overlay.classList.remove("show");
    }

    function stopPolling() {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = null;
    }

    function setLocked(locked) {
        if (window.MonsterPayment) window.MonsterPayment.setLocked(locked);
        else paymentInProgress = !!locked;
    }

    function statusCopy(status, payload) {
        if (status === "QUEUED") return "控制器已收到訂單；若畫面未自動切換，請開啟 Hardware Explorer。";
        if (status === "PAYMENT_PENDING") return payload.message || "請投入剛好的金額，本系統目前不找零。";
        if (status === "PAID_WAITING_DISPATCH") return "付款完成，正在建立唯一出票授權。";
        return payload.message || "正在確認付款狀態。";
    }

    function pollPayment(orderNo) {
        stopPolling();
        api("/payments/" + encodeURIComponent(orderNo)).then(function (payload) {
            if (!active || active.order.orderNo !== orderNo) return;
            active.lastControllerStatus = payload.status;
            active.lastPaidNtd = Number(payload.paidNtd || 0);
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
                    amount: payload.amountNtd,
                    paid: payload.paidNtd,
                    remaining: payload.remainingNtd,
                    orderNo: orderNo,
                    message: payload.message || "本筆未出票"
                });
                if (Number(payload.paidNtd || 0) === 0) {
                    setTimeout(function () {
                        active = null;
                        saveActive();
                        hideOverlay();
                        setLocked(false);
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
            setOverlay({
                title: payload.status === "PAYMENT_PENDING" ? "請投入現金" : "準備現金付款",
                amount: payload.amountNtd,
                paid: payload.paidNtd,
                remaining: payload.remainingNtd,
                orderNo: orderNo,
                message: statusCopy(payload.status, payload)
            });
            pollTimer = setTimeout(function () { pollPayment(orderNo); }, POLL_MS);
        }).catch(function (error) {
            if (error.code === "PAIRING_REQUIRED") {
                localStorage.removeItem(PAIRING_KEY);
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
            bridgeVersion: payload.bridgeVersion || "1.0-sprint8",
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
            saveActive();
            hideOverlay();
            setLocked(false);
        }, 500);
    }

    function startCashPayment() {
        if (active && active.state !== "COMPLETED") {
            setLocked(true);
            pollPayment(active.order.orderNo);
            return;
        }
        var context;
        try {
            context = window.MonsterPayment.buildContext();
        } catch (error) {
            alert("無法建立現金訂單：" + (error.message || error));
            return;
        }
        // 全額點數折抵時不啟動收鈔／收幣，直接走同一套防重複訂單流程。
        if (Number(context.amount || 0) === 0) {
            window.MonsterPayment.finalizePointOnly(context);
            return;
        }
        if (!requestPairingKey()) return;
        active = {
            version: 1,
            state: "REQUESTING",
            requestId: "WEB-" + context.orderNo,
            order: context,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        saveActive();
        setLocked(true);
        setOverlay({
            title: "正在啟動現金控制器",
            amount: context.amount,
            paid: 0,
            remaining: context.amount,
            orderNo: context.orderNo,
            message: "請稍候，控制器會自動開啟。"
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
            active = null;
            saveActive();
            return;
        }
        setLocked(true);
        if (active.state === "ISSUE_STARTED" || active.state === "ACK_PENDING") {
            var authorizationId = active.authorization && active.authorization.authorizationId;
            var saved = salesHistory.some(function (order) {
                return order && order.printAuthorizationId === authorizationId;
            });
            if (saved) {
                acknowledgeIssued();
                return;
            }
            active.state = "RECOVERY_REQUIRED";
            saveActive();
        }
        if (active.state === "CLAIMED" || active.state === "RECOVERY_REQUIRED") {
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
        pollPayment(active.order.orderNo);
    }

    window.MonsterCashBridge = {
        startCashPayment: startCashPayment,
        hasBlockingTransaction: function () {
            return !!(active && active.state !== "COMPLETED");
        },
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
                saveActive();
                hideOverlay();
                setLocked(false);
            }
        },
        _test: {
            getActive: function () { return active; },
            setActive: function (value) { active = value; saveActive(); }
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", recover);
    } else {
        setTimeout(recover, 0);
    }
})();
