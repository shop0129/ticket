// 小怪獸售票機 V7.8.3.3 Sprint 7
// 現金營運保護、每日對帳、異常同步與匯出（Android WebView 61 相容）
(function () {
    "use strict";

    var STORAGE_KEY = "monsterCashOperationsV1";
    var CLOUD_PATH = "monsterTicket/v1/cashOperations";
    var POLL_MS = 10000;
    var cloudRef = null;
    var uploading = false;
    var refreshPromise = null;
    var state = loadState();

    function clone(value) {
        return JSON.parse(JSON.stringify(value === undefined ? null : value));
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return {
                records: parsed.records || {},
                hardware: parsed.hardware || null,
                businessDate: parsed.businessDate || "",
                updatedAt: Number(parsed.updatedAt || 0)
            };
        } catch (error) {
            return { records: {}, hardware: null, businessDate: "", updatedAt: 0 };
        }
    }

    function saveState() {
        state.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderAll();
    }

    function safeKey(value) {
        return String(value || "").replace(/[.#$\[\]\/]/g, "_");
    }

    function recordStamp(record) {
        return Number(record && (
            record.resolvedAt || record.issuedAt || record.finishedAt ||
            record.paidAt || record.createdAt || record.revision
        ) || 0);
    }

    function mergeRecords(records) {
        (records || []).forEach(function (record) {
            if (!record || !record.orderId) return;
            var key = safeKey(record.orderId);
            var previous = state.records[key];
            if (!previous || recordStamp(record) >= recordStamp(previous) || Number(record.revision || 0) >= Number(previous.revision || 0)) {
                state.records[key] = clone(record);
            }
        });
    }

    function mergeController(statusPayload, reconciliationPayload) {
        if (statusPayload) {
            state.hardware = {
                controllerOnline: statusPayload.controllerOnline === true,
                bridgeVersion: statusPayload.bridgeVersion || "",
                checkedAt: Number(statusPayload.checkedAt || Date.now()),
                hardware: clone(statusPayload.hardware || null),
                currentPayment: clone(statusPayload.currentPayment || null),
                updatedAt: Date.now()
            };
        }
        if (reconciliationPayload) {
            state.businessDate = reconciliationPayload.businessDate || state.businessDate;
            mergeRecords(reconciliationPayload.records || []);
        }
        saveState();
        uploadCloud();
    }

    function refresh() {
        if (refreshPromise) return refreshPromise;
        if (!window.MonsterCashBridge || !MonsterCashBridge.hasPairing()) {
            renderAll();
            return Promise.resolve(false);
        }
        refreshPromise = Promise.all([
            MonsterCashBridge.getOperationalStatus(),
            MonsterCashBridge.getTodayReconciliation()
        ]).then(function (results) {
            mergeController(results[0], results[1]);
            return true;
        }).catch(function (error) {
            state.hardware = state.hardware || {};
            state.hardware.controllerOnline = false;
            state.hardware.error = error.message || String(error);
            state.hardware.updatedAt = Date.now();
            saveState();
            return false;
        }).then(function (result) {
            refreshPromise = null;
            return result;
        });
        return refreshPromise;
    }

    function uploadCloud() {
        if (!cloudRef || uploading) return;
        uploading = true;
        var recordUpdates = {};
        Object.keys(state.records).forEach(function (key) {
            recordUpdates[key] = clone(state.records[key]);
        });
        var jobs = [];
        if (Object.keys(recordUpdates).length) jobs.push(cloudRef.child("records").update(recordUpdates));
        if (state.hardware) jobs.push(cloudRef.child("hardware/kiosk_main").set(clone(state.hardware)));
        Promise.all(jobs).catch(function (error) {
            console.warn("[CashOperations] 雲端同步失敗", error);
        }).then(function () { uploading = false; });
    }

    function connectCloud(cloud) {
        if (cloudRef || !cloud || !cloud.database) return;
        cloudRef = cloud.database.ref(CLOUD_PATH);
        cloudRef.on("value", function (snapshot) {
            var value = snapshot.val() || {};
            var cloudRecords = value.records || {};
            mergeRecords(Object.keys(cloudRecords).map(function (key) { return cloudRecords[key]; }));
            var hardwareMap = value.hardware || {};
            Object.keys(hardwareMap).forEach(function (key) {
                var candidate = hardwareMap[key];
                if (!state.hardware || Number(candidate && candidate.updatedAt || 0) >= Number(state.hardware.updatedAt || 0)) {
                    state.hardware = clone(candidate);
                }
            });
            saveState();
        }, function (error) {
            console.warn("[CashOperations] 無法讀取雲端對帳", error);
        });
        uploadCloud();
    }

    function todayBounds() {
        var start = new Date();
        start.setHours(0, 0, 0, 0);
        return { start: start.getTime(), end: start.getTime() + 86400000 };
    }

    function todayRecords() {
        var bounds = todayBounds();
        return Object.keys(state.records).map(function (key) { return state.records[key]; }).filter(function (record) {
            var timestamp = Number(record && record.createdAt || 0);
            return timestamp >= bounds.start && timestamp < bounds.end;
        }).sort(function (a, b) { return recordStamp(b) - recordStamp(a); });
    }

    function isCashOrder(order) {
        return String(order && order.payment || "").indexOf("現金") >= 0;
    }

    function webCashSalesToday() {
        var bounds = todayBounds();
        return (Array.isArray(window.salesHistory) ? window.salesHistory : []).filter(function (order) {
            var createdAt = Number(order && order.createdAt || 0);
            return order && order.status !== "cancel" && isCashOrder(order) && createdAt >= bounds.start && createdAt < bounds.end;
        }).reduce(function (sum, order) {
            return sum + Number(order.paidAmount != null ? order.paidAmount : order.amount || 0);
        }, 0);
    }

    function calculate() {
        var records = todayRecords();
        var summary = {
            records: records,
            gross: 0,
            issued: 0,
            refunded: 0,
            manualRecorded: 0,
            unresolved: 0,
            unresolvedAmount: 0,
            coinCount: 0,
            billCount: 0,
            counts: {}
        };
        records.forEach(function (record) {
            var paid = Number(record.paidNtd || 0);
            summary.gross += paid;
            summary.coinCount += Number(record.coinCount || 0);
            summary.billCount += Number(record.billCount || 0);
            if (record.status === "TICKET_ISSUED") summary.issued += paid;
            if (record.resolution === "REFUNDED") summary.refunded += paid;
            if (record.resolution === "MANUAL_RECORDED") summary.manualRecorded += paid;
            if (record.status === "RECONCILIATION_REQUIRED" && !record.resolution) {
                summary.unresolved += 1;
                summary.unresolvedAmount += paid;
            }
            Object.keys(record.counts || {}).forEach(function (value) {
                summary.counts[value] = Number(summary.counts[value] || 0) + Number(record.counts[value] || 0);
            });
        });
        summary.expectedDrawer = summary.gross - summary.refunded;
        summary.webCashSales = Array.isArray(window.salesHistory) ? webCashSalesToday() : summary.issued;
        summary.difference = summary.expectedDrawer - summary.webCashSales;
        return summary;
    }

    function money(value) {
        return "NT$" + Number(value || 0).toLocaleString("zh-TW");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function breakdownText(counts) {
        var values = Object.keys(counts || {}).sort(function (a, b) { return Number(a) - Number(b); });
        if (!values.length) return "尚無面額資料";
        return values.map(function (value) { return value + "元 × " + Number(counts[value] || 0); }).join("、");
    }

    function hardwareView() {
        var wrapper = state.hardware;
        var detail = wrapper && wrapper.hardware;
        var online = Boolean(wrapper && wrapper.controllerOnline && detail && detail.mdbConnected && detail.safetyReady);
        var stale = !wrapper || Date.now() - Number(wrapper.updatedAt || 0) > 30000;
        if (stale) online = false;
        return {
            online: online,
            label: online ? "正常可收款" : (detail && detail.message) || (wrapper && wrapper.error) || "尚未取得控制器狀態",
            code: detail && detail.alertCode || (online ? "READY" : "OFFLINE"),
            updatedAt: wrapper && wrapper.updatedAt || 0
        };
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function renderDashboard() {
        var summary = calculate();
        var hardware = hardwareView();
        setText("dashboardCashHardware", hardware.online ? "● 正常" : "● 注意");
        setText("dashboardCashHardwareDetail", hardware.label);
        setText("dashboardPhysicalCash", money(summary.expectedDrawer));
        setText("dashboardCashDifference", (summary.difference > 0 ? "+" : "") + money(summary.difference));
        setText("dashboardCashExceptions", summary.unresolved + " 筆 / " + money(summary.unresolvedAmount));
        var strip = document.getElementById("dashboardCashOperationsStrip");
        if (strip) strip.classList.toggle("has-alert", !hardware.online || summary.unresolved > 0 || summary.difference !== 0);
    }

    function statusLabel(record) {
        if (record.resolution === "REFUNDED") return "已退款";
        if (record.resolution === "MANUAL_RECORDED") return "已人工入帳";
        if (record.status === "TICKET_ISSUED") return "已收款／已出票";
        if (record.status === "RECONCILIATION_REQUIRED") return "待人工處理";
        if (record.status === "CANCELED") return "已關閉";
        return record.status || "處理中";
    }

    function renderPage() {
        var list = document.getElementById("cashReconciliationList");
        if (!list) return;
        var summary = calculate();
        var hardware = hardwareView();
        setText("cashOpsDate", new Date().toLocaleDateString("zh-TW") + " 每日現金對帳");
        setText("cashOpsHardware", hardware.online ? "正常可收款" : "需要注意");
        setText("cashOpsHardwareDetail", hardware.label);
        setText("cashOpsWebSales", money(summary.webCashSales));
        setText("cashOpsGross", money(summary.gross));
        setText("cashOpsExpectedDrawer", money(summary.expectedDrawer));
        setText("cashOpsDifference", (summary.difference > 0 ? "+" : "") + money(summary.difference));
        setText("cashOpsUnresolved", summary.unresolved + " 筆 / " + money(summary.unresolvedAmount));
        setText("cashOpsBreakdown", breakdownText(summary.counts));
        setText("cashOpsDeviceCounts", "紙鈔 " + summary.billCount + " 張・硬幣 " + summary.coinCount + " 枚・已退款 " + money(summary.refunded));
        if (!summary.records.length) {
            list.innerHTML = '<div class="cash-ops-empty">今天尚無硬體現金紀錄</div>';
            return;
        }
        var canResolveHere = Boolean(window.MonsterRole && MonsterRole.isAdmin() && window.MonsterCashBridge && MonsterCashBridge.hasPairing());
        list.innerHTML = summary.records.map(function (record) {
            var unresolved = record.status === "RECONCILIATION_REQUIRED" && !record.resolution;
            var actions = unresolved ? (canResolveHere
                ? '<div class="cash-ops-actions"><button onclick="MonsterCashOperations.resolve(\'' + escapeHtml(record.orderId) + '\',\'REFUNDED\')">已退款</button><button onclick="MonsterCashOperations.resolve(\'' + escapeHtml(record.orderId) + '\',\'MANUAL_RECORDED\')">人工入帳</button></div>'
                : '<div class="cash-ops-local-note">請在點餐機由店長登入後處理</div>') : "";
            return '<div class="cash-ops-record ' + (unresolved ? "unresolved" : "") + '">' +
                '<div><strong>' + escapeHtml(record.orderId) + '</strong><span>' + escapeHtml(statusLabel(record)) + '</span></div>' +
                '<div class="cash-ops-record-money"><b>應付 ' + money(record.amountNtd) + '</b><b>實收 ' + money(record.paidNtd) + '</b></div>' +
                '<p>' + escapeHtml(breakdownText(record.counts || {})) + '</p>' +
                '<small>' + escapeHtml(record.message || "") + (record.resolutionNote ? "・備註：" + escapeHtml(record.resolutionNote) : "") + '</small>' + actions +
                '</div>';
        }).join("");
    }

    function renderAll() {
        renderDashboard();
        renderPage();
    }

    function open() {
        if (!window.MonsterRole || !MonsterRole.isAdmin()) {
            if (typeof showPage === "function") showPage("adminLoginPage");
            alert("請先使用店長帳號登入，再開啟現金對帳");
            return;
        }
        if (typeof showPage === "function") showPage("cashReconciliationPage");
        renderAll();
        refresh();
    }

    function resolve(orderNo, resolution) {
        if (!window.MonsterRole || !MonsterRole.isAdmin()) {
            alert("只有店長可以完成人工現金處理");
            return;
        }
        if (!window.MonsterCashBridge || !MonsterCashBridge.hasPairing()) {
            alert("只能在已配對現金控制器的點餐機上結案");
            return;
        }
        var action = resolution === "REFUNDED" ? "退款" : "人工入帳";
        var note = prompt("請輸入「" + action + "」處理備註（至少2個字）", "店長已核對現金");
        if (note === null) return;
        note = String(note).trim();
        if (note.length < 2) {
            alert("請輸入至少2個字的處理備註");
            return;
        }
        if (!confirm("確定將訂單 " + orderNo + " 標記為「" + action + "」？\n\n此操作不會自動出幣、出鈔或出票。")) return;
        MonsterCashBridge.resolveReconciliation(orderNo, resolution, note).then(function (record) {
            mergeRecords([record]);
            saveState();
            uploadCloud();
            MonsterCashBridge.releaseAfterReconciliation(orderNo);
            if (window.MonsterAuth) {
                MonsterAuth.audit("cash.reconcile", "現金人工處理：" + orderNo + "／" + action, {
                    source: "admin", targetType: "cash-order", targetId: orderNo
                });
            }
            alert("現金人工處理已完成，訂單仍禁止出票");
            refresh();
        }).catch(function (error) {
            alert("無法完成現金處理：" + (error.message || error));
        });
    }

    function csvCell(value) {
        return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
    }

    function download(name, type, content) {
        var blob = new Blob([content], { type: type });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function exportCsv() {
        if (!window.MonsterRole || !MonsterRole.isAdmin()) return alert("只有店長可以匯出對帳");
        var rows = [["訂單編號", "狀態", "應付", "實收", "紙鈔張數", "硬幣枚數", "面額明細", "處理結果", "處理備註", "建立時間"]];
        todayRecords().forEach(function (record) {
            rows.push([
                record.orderId, statusLabel(record), record.amountNtd, record.paidNtd,
                record.billCount || 0, record.coinCount || 0, breakdownText(record.counts || {}),
                record.resolution || "", record.resolutionNote || "",
                new Date(Number(record.createdAt || 0)).toLocaleString("zh-TW")
            ]);
        });
        var csv = "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n");
        download("monster_cash_reconciliation_" + new Date().toISOString().slice(0, 10) + ".csv", "text/csv;charset=utf-8", csv);
    }

    function exportJson() {
        if (!window.MonsterRole || !MonsterRole.isAdmin()) return alert("只有店長可以匯出對帳");
        var payload = {
            version: "V7.8.3.3-Sprint7",
            exportedAt: new Date().toISOString(),
            summary: calculate(),
            hardware: clone(state.hardware)
        };
        download("monster_cash_reconciliation_" + new Date().toISOString().slice(0, 10) + ".json", "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
    }

    window.MonsterCashOperations = {
        open: open,
        refresh: refresh,
        render: renderAll,
        resolve: resolve,
        exportCsv: exportCsv,
        exportJson: exportJson,
        getSummary: calculate,
        _test: {
            setState: function (value) { state = clone(value); saveState(); },
            getState: function () { return clone(state); },
            mergeRecords: mergeRecords
        }
    };

    function initialize() {
        renderAll();
        if (window.MonsterCloud && MonsterCloud.onReady) {
            MonsterCloud.onReady(connectCloud);
        } else if (window.firebase && firebase.auth && firebase.database) {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) connectCloud({ database: firebase.database() });
            });
        }
        refresh();
        setInterval(refresh, POLL_MS);
        window.addEventListener("focus", refresh);
        document.addEventListener("monster:orders-updated", renderAll);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else setTimeout(initialize, 0);
}());
