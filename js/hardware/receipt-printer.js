// 小怪獸售票機 V7.8.3.3 FIX47
// 55mm 實體收據列印橋接（/dev/ttyS4 · 9600 · GB18030）
// Android WebView 61 相容（ES5）
(function () {
    "use strict";

    var BASE_URL = "http://127.0.0.1:8765/v1";
    var PAIRING_KEY = "monsterCashBridgePairingKeyV1";
    var API_TIMEOUT_MS = 7000;

    function pairingKey() {
        return String(localStorage.getItem(PAIRING_KEY) || "").trim();
    }

    function api(path, options) {
        options = options || {};
        var request = {
            method: options.method || "GET",
            cache: "no-store",
            headers: {
                "X-Monster-Bridge-Key": pairingKey(),
                "Content-Type": "application/json"
            }
        };
        if (options.body !== undefined) request.body = JSON.stringify(options.body);
        return new Promise(function (resolve, reject) {
            var completed = false;
            var timer = setTimeout(function () {
                var timeoutError;
                if (completed) return;
                completed = true;
                timeoutError = new Error("收據機控制器連線逾時，請確認 Controller 正在執行");
                timeoutError.code = "CONTROLLER_TIMEOUT";
                reject(timeoutError);
            }, API_TIMEOUT_MS);
            fetch(BASE_URL + path, request).then(function (response) {
            return response.text().then(function (text) {
                var data;
                try { data = text ? JSON.parse(text) : {}; }
                catch (error) { data = { ok: false, message: "印表機回覆格式錯誤" }; }
                if (!response.ok) {
                    var failure = new Error(data.message || ("印表機錯誤 HTTP " + response.status));
                    failure.code = data.code || "HTTP_" + response.status;
                    failure.receipt = data;
                    throw failure;
                }
                return data;
            });
            }).then(function (data) {
                if (completed) return;
                completed = true;
                clearTimeout(timer);
                resolve(data);
            }).catch(function (error) {
                if (completed) return;
                completed = true;
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    function savePairingKey(value) {
        value = String(value || "").replace(/\s/g, "");
        if (!/^\d{8}$/.test(value)) return false;
        localStorage.setItem(PAIRING_KEY, value);
        return true;
    }

    function clearPairingKey() {
        localStorage.removeItem(PAIRING_KEY);
    }

    function promptPairingKey() {
        var entered = prompt(
            "收到待列印的預存入場收據。\n\n請輸入 Controller 畫面上的 8 位數配對碼。",
            ""
        );
        if (entered === null) {
            var cancelled = new Error("尚未輸入 8 位數配對碼");
            cancelled.code = "PAIRING_CANCELLED";
            return Promise.reject(cancelled);
        }
        if (!savePairingKey(entered)) {
            var invalid = new Error("配對碼必須是 8 位數字");
            invalid.code = "PAIRING_REQUIRED";
            return Promise.reject(invalid);
        }
        return api("/printer/status").catch(function (error) {
            if (error && (error.code === "PAIRING_REQUIRED" || error.code === "HTTP_401" || error.code === "HTTP_403")) {
                clearPairingKey();
                error.message = "配對碼不正確，請查看 Controller 畫面後重新輸入";
            }
            throw error;
        });
    }

    function ensureReady(allowPrompt) {
        if (!/^\d{8}$/.test(pairingKey())) {
            if (allowPrompt === false) {
                var missing = new Error("尚未輸入 8 位數配對碼");
                missing.code = "PAIRING_REQUIRED";
                return Promise.reject(missing);
            }
            return promptPairingKey();
        }
        return api("/printer/status").catch(function (error) {
            if (error && (error.code === "PAIRING_REQUIRED" || error.code === "HTTP_401" || error.code === "HTTP_403")) {
                clearPairingKey();
                if (allowPrompt !== false) return promptPairingKey();
            }
            throw error;
        });
    }

    function safeNumber(value) {
        value = Math.round(Number(value || 0));
        return isFinite(value) && value >= 0 ? value : 0;
    }

    function itemQuantity(item) {
        return Math.max(1, Math.round(Number(item && (item.qty || item.quantity) || 1)));
    }

    function groupItems(order) {
        var grouped = {};
        (order.items || []).forEach(function (item) {
            if (!item) return;
            var quantity = itemQuantity(item);
            var price = safeNumber(item.price);
            var key = String(item.id || item.title || "item") + "|" + price;
            if (!grouped[key]) {
                grouped[key] = {
                    title: String(item.title || item.id || "未命名票券"),
                    quantity: 0,
                    unitPriceNtd: price,
                    totalPriceNtd: 0
                };
            }
            grouped[key].quantity += quantity;
            grouped[key].totalPriceNtd += price * quantity;
        });
        return Object.keys(grouped).map(function (key) { return grouped[key]; });
    }

    function rewardQuantity(item) {
        return itemQuantity(item);
    }

    function buildRewards(order) {
        var result = {};
        function add(label, quantity, unit) {
            if (!quantity) return;
            var key = label + "|" + unit;
            if (!result[key]) result[key] = { label: label, quantity: 0, unit: unit };
            result[key].quantity += quantity;
        }
        (order.items || []).forEach(function (item) {
            if (!item) return;
            var quantity = rewardQuantity(item);
            var reward = String(item.reward || "");
            var token = window.MonsterTicketDataSync
                ? Number(MonsterTicketDataSync.tokenOf(item) || 0)
                : Number(item.token || 0);
            if (reward.indexOf("band") >= 0) add("入場手環", quantity, "個");
            if (token > 0) add("遊戲代幣", token * quantity, "枚");
            if (item.toy === "green") add("綠標玩具", quantity, "個");
            if (item.toy === "red") add("紅標玩具", quantity, "個");
            if (item.id === "powerbank") add("行動電源", quantity, "個");
        });
        return Object.keys(result).map(function (key) { return result[key]; });
    }

    function originalJobId(order) {
        var authorizationId = String(order.printAuthorizationId || "").replace(/[^A-Za-z0-9._:-]/g, "");
        if (authorizationId) return "AUTH:" + authorizationId;
        return "ORDER:" + String(order.orderNo || "").replace(/[^A-Za-z0-9._:-]/g, "_");
    }

    function reprintJobId(order) {
        var orderNo = String(order.orderNo || "").replace(/[^A-Za-z0-9._:-]/g, "_");
        return "REPRINT:" + orderNo + ":" + Date.now() + ":" + Math.floor(Math.random() * 1000000);
    }

    function buildRequest(order, options) {
        options = options || {};
        var reprint = !!options.reprint;
        var amount = safeNumber(order.paidAmount != null ? order.paidAmount : order.amount);
        var paid = safeNumber(order.hardwarePaidNtd != null ? order.hardwarePaidNtd : amount);
        var dateTime = [order.date || "", order.time || ""].join(" ").trim();
        if (!dateTime) dateTime = new Date(Number(order.createdAt || Date.now())).toLocaleString("zh-TW");
        return {
            jobId: reprint ? reprintJobId(order) : (order.receiptPrintJobId || originalJobId(order)),
            orderNo: String(order.orderNo || order.cloudId || "NO-ORDER"),
            mode: reprint ? "REPRINT" : "ORIGINAL",
            payment: String(order.payment || "未記錄"),
            dateTime: dateTime,
            operatorName: String(order.operatorName || "Kiosk 售票機"),
            originalAmountNtd: safeNumber(order.originalAmount != null ? order.originalAmount : amount),
            pointDiscountNtd: safeNumber(order.pointDiscount),
            amountNtd: amount,
            paidNtd: paid,
            changeNtd: safeNumber(order.changeAmount != null ? order.changeAmount : Math.max(0, paid - amount)),
            items: groupItems(order),
            rewards: buildRewards(order),
            qrPayload: String(order.qrPayload || ""),
            requestedAt: Date.now()
        };
    }

    function persistOrder(order) {
        order.updatedAt = Date.now();
        if (typeof saveSalesHistory === "function") saveSalesHistory();
    }

    function printOrder(order, options) {
        options = options || {};
        if (!order || !order.orderNo) {
            return Promise.reject(new Error("沒有可列印的訂單"));
        }
        if (!/^\d{8}$/.test(pairingKey())) {
            var pairingError = new Error("這台裝置尚未連接實體收據機");
            pairingError.code = "PAIRING_REQUIRED";
            return Promise.reject(pairingError);
        }
        var request = buildRequest(order, options);
        if (!request.items.length) {
            return Promise.reject(new Error("訂單沒有可列印的購買項目"));
        }
        if (!options.reprint) order.receiptPrintJobId = request.jobId;
        order.receiptPrintStatus = "printing";
        order.receiptPrintLastError = "";
        order.receiptPrintRequestedAt = Date.now();
        persistOrder(order);

        return api("/receipts", { method: "POST", body: request }).then(function (result) {
            order.receiptPrintStatus = "printed";
            order.receiptPrintJobId = request.jobId;
            order.receiptPrintedAt = Number(result.finishedAt || Date.now());
            order.receiptPrintBytes = Number(result.bytesWritten || 0);
            order.receiptPrintLastError = "";
            if (options.reprint) {
                order.receiptReprintCount = Number(order.receiptReprintCount || 0) + 1;
                order.receiptLastReprintedAt = Date.now();
            }
            persistOrder(order);
            if (window.MonsterAuth) {
                MonsterAuth.audit(
                    options.reprint ? "order.receipt_reprint" : "order.receipt_print",
                    (options.reprint ? "補印" : "列印") + "實體收據：" + order.orderNo,
                    { source: options.reprint ? "staff" : "kiosk", targetType: "order", targetId: order.orderNo }
                );
            }
            return result;
        }).catch(function (error) {
            var receipt = error.receipt || {};
            order.receiptPrintStatus = String(receipt.state || "failed").toLowerCase();
            order.receiptPrintLastError = error.message || String(error);
            order.receiptPrintFailedAt = Date.now();
            persistOrder(order);
            throw error;
        });
    }

    window.MonsterReceiptPrinter = {
        version: "1.2-fix47-cloud-receipt-recovery",
        hasPairing: function () { return /^\d{8}$/.test(pairingKey()); },
        getStatus: function () { return api("/printer/status"); },
        ensureReady: ensureReady,
        clearPairing: clearPairingKey,
        printOrder: printOrder,
        buildRequest: buildRequest
    };
}());
