// 小怪獸售票機 V7.8.3.3 Sprint 8
// 店長限定：預覽、二次驗證並同步清除指定測試訂單。
(function () {
    "use strict";

    var CONFIRM_TEXT = "清除測試資料";
    var KNOWN_TEST_IDS = ["M202607220021", "M202607220022"];
    var previewState = null;
    var busy = false;

    function clone(value) {
        return JSON.parse(JSON.stringify(value === undefined ? null : value));
    }

    function safeText(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function normalizeIds(value) {
        var seen = {};
        var result = [];
        String(value || "").split(/[\s,，]+/).forEach(function (id) {
            id = String(id || "").trim();
            if (!id || seen[id]) return;
            seen[id] = true;
            result.push(id);
        });
        return result.slice(0, 20);
    }

    function byOrderId(list, id) {
        var match = null;
        (Array.isArray(list) ? list : []).some(function (order) {
            if (String(order && order.orderNo || "") === id) {
                match = order;
                return true;
            }
            return false;
        });
        return match;
    }

    function cashRecordFor(records, id) {
        var match = null;
        Object.keys(records || {}).some(function (key) {
            var record = records[key];
            if (record && record.deleted) return false;
            if (String(record && record.orderId || "") === id) {
                match = record;
                return true;
            }
            return false;
        });
        return match;
    }

    function buildPreview(ids) {
        var records = window.MonsterCashOperations ? MonsterCashOperations.getRecords() : {};
        var rows = ids.map(function (id) {
            var order = byOrderId(window.salesHistory, id);
            var cash = cashRecordFor(records, id);
            var reasons = [];
            if (order && (order.memberId || Number(order.usedPoints || 0) > 0 || Number(order.pointDiscount || 0) > 0)) {
                reasons.push("包含會員／點數異動，請先用正常作廢流程處理");
            }
            if (cash && cash.status === "RECONCILIATION_REQUIRED" && !cash.resolution) {
                reasons.push("現金仍待人工處理，請先退款或人工入帳");
            }
            if (cash && ["PAYMENT_PENDING", "PAID_WAITING_DISPATCH", "PRINT_AUTHORIZED"].indexOf(cash.status) >= 0) {
                reasons.push("交易仍在進行中");
            }
            return {
                id: id,
                order: clone(order),
                cash: clone(cash),
                found: Boolean(order || cash),
                blocked: reasons.length > 0,
                reasons: reasons
            };
        });
        var foundRows = rows.filter(function (row) { return row.found; });
        return {
            createdAt: Date.now(),
            rows: rows,
            foundRows: foundRows,
            ids: foundRows.map(function (row) { return row.id; }),
            blocked: foundRows.some(function (row) { return row.blocked; }),
            fingerprint: JSON.stringify(foundRows.map(function (row) {
                return [
                    row.id,
                    row.order && row.order.updatedAt || 0,
                    row.order && row.order.status || "",
                    row.cash && row.cash.revision || 0,
                    row.cash && row.cash.status || "",
                    row.cash && row.cash.resolution || ""
                ];
            }))
        };
    }

    function money(value) {
        return "NT$" + Number(value || 0).toLocaleString("zh-TW");
    }

    function renderPreview(preview) {
        var box = document.getElementById("testCleanupPreview");
        var execute = document.getElementById("testCleanupExecute");
        if (!box) return;
        if (!preview.rows.length) {
            box.innerHTML = '<div class="test-cleanup-empty">請先輸入測試訂單編號</div>';
            if (execute) execute.disabled = true;
            return;
        }
        box.innerHTML = preview.rows.map(function (row) {
            if (!row.found) {
                return '<div class="test-cleanup-row missing"><strong>' + safeText(row.id) + '</strong><span>找不到，不會執行任何刪除</span></div>';
            }
            var amount = row.order
                ? Number(row.order.paidAmount != null ? row.order.paidAmount : row.order.amount || 0)
                : Number(row.cash && row.cash.paidNtd || 0);
            var sources = [];
            if (row.order) sources.push("售票／票券紀錄");
            if (row.cash) sources.push("現金對帳");
            return '<div class="test-cleanup-row ' + (row.blocked ? "blocked" : "ready") + '">' +
                '<div><strong>' + safeText(row.id) + '</strong><b>' + money(amount) + '</b></div>' +
                '<span>' + safeText(sources.join("＋")) + '</span>' +
                (row.blocked ? '<small>⛔ ' + safeText(row.reasons.join("；")) + '</small>' : '<small>✅ 可安全清除</small>') +
                '</div>';
        }).join("");
        if (!preview.foundRows.length) {
            box.innerHTML += '<div class="test-cleanup-empty">沒有找到可清除的測試資料</div>';
        }
        if (execute) execute.disabled = preview.blocked || !preview.foundRows.length;
    }

    function preview() {
        if (!window.MonsterPermission || !MonsterPermission.requirePermission("data.clear_test", "只有店長可以清除測試資料")) return;
        var input = document.getElementById("testCleanupIds");
        previewState = buildPreview(normalizeIds(input && input.value));
        renderPreview(previewState);
        var status = document.getElementById("testCleanupStatus");
        if (status) {
            status.textContent = previewState.blocked
                ? "有資料尚不能清除，請依紅色提示先完成處理。"
                : "預覽完成：將清除 " + previewState.foundRows.length + " 筆測試資料。";
        }
    }

    function emptyStats() {
        return { tickets: 0, income: 0, tokens: 0, greenToy: 0, redToy: 0, parent: 0 };
    }

    function orderTime(order) {
        var value = Number(order && order.createdAt || 0);
        if (value) return new Date(value);
        var parsed = Date.parse(String(order && order.date || ""));
        return isNaN(parsed) ? null : new Date(parsed);
    }

    function addOrder(stats, order) {
        (Array.isArray(order && order.items) ? order.items : []).forEach(function (item) {
            stats.tickets += 1;
            stats.income += Number(item && item.price || 0);
            stats.tokens += Number(item && item.token || 0);
            if (item && item.toy === "green") stats.greenToy += 1;
            if (item && item.toy === "red") stats.redToy += 1;
            if (item && item.id === "parent") stats.parent += 1;
        });
    }

    function recalculateLocalStats() {
        var now = new Date();
        var todayKey = [now.getFullYear(), now.getMonth(), now.getDate()].join("-");
        var monthKey = [now.getFullYear(), now.getMonth()].join("-");
        var today = emptyStats();
        var month = emptyStats();
        var total = emptyStats();
        (Array.isArray(window.salesHistory) ? window.salesHistory : []).forEach(function (order) {
            var time;
            var orderToday;
            var orderMonth;
            if (!order || order.deleted || order.status === "cancel") return;
            time = orderTime(order);
            addOrder(total, order);
            if (!time) return;
            orderToday = [time.getFullYear(), time.getMonth(), time.getDate()].join("-");
            orderMonth = [time.getFullYear(), time.getMonth()].join("-");
            if (orderMonth === monthKey) addOrder(month, order);
            if (orderToday === todayKey) addOrder(today, order);
        });
        window.todayStats = todayStats = today;
        window.monthStats = monthStats = month;
        window.totalStats = totalStats = total;
        if (typeof saveTodayStats === "function") saveTodayStats();
        return { today: today, month: month, total: total };
    }

    function clearLocalOrderPointers(ids) {
        var lookup = {};
        ids.forEach(function (id) { lookup[id] = true; });
        ["lastOrder", "currentOrder", "selectedOrder"].forEach(function (key) {
            try {
                var raw = localStorage.getItem(key);
                var value = raw ? JSON.parse(raw) : null;
                if (value && lookup[String(value.orderNo || value.orderId || "")]) localStorage.removeItem(key);
            } catch (ignore) {}
        });
        if (window.currentPrintOrder && lookup[String(currentPrintOrder.orderNo || "")]) {
            window.currentPrintOrder = currentPrintOrder = null;
        }
    }

    function setBusy(value, message) {
        busy = value;
        var execute = document.getElementById("testCleanupExecute");
        var status = document.getElementById("testCleanupStatus");
        if (execute) execute.disabled = value || !previewState || previewState.blocked || !previewState.foundRows.length;
        if (status && message) status.textContent = message;
    }

    function execute() {
        var password = document.getElementById("testCleanupPassword");
        var phrase = document.getElementById("testCleanupPhrase");
        var current;
        var ids;
        var actor;
        if (busy) return;
        if (!window.MonsterPermission || !MonsterPermission.requirePermission("data.clear_test", "只有店長可以清除測試資料")) return;
        if (!previewState || !previewState.foundRows.length) return alert("請先預覽測試資料");
        current = buildPreview(previewState.ids);
        if (current.fingerprint !== previewState.fingerprint) {
            previewState = current;
            renderPreview(previewState);
            return alert("資料狀態已變更，請重新確認預覽");
        }
        if (current.blocked) return alert("尚有不能清除的交易，請依提示先完成處理");
        if (!window.MonsterRole || !MonsterRole.verifyCurrentAdminPassword(password && password.value)) {
            return alert("店長密碼錯誤");
        }
        if (String(phrase && phrase.value || "").trim() !== CONFIRM_TEXT) {
            return alert("請完整輸入「" + CONFIRM_TEXT + "」");
        }
        if (!window.MonsterCashBridge || !MonsterCashBridge.hasPairing()) {
            return alert("請在已配對現金控制器的點餐機執行");
        }
        if (MonsterCashBridge.hasBlockingTransaction()) {
            return alert("目前仍有現金交易，完成或人工結案後才能清除測試資料");
        }
        ids = current.ids.slice();
        if (!confirm("最後確認：清除 " + ids.length + " 筆測試訂單？\n\n" + ids.join("\n") + "\n\n此操作只刪除列出的測試資料，不會清除票價、會員或正式訂單。")) return;
        actor = MonsterRole.getCurrentUser() || { name: "店長" };
        setBusy(true, "正在同步清除 Android 帳本、雲端訂單與對帳資料…");

        MonsterCashBridge.purgeTestData(ids).then(function () {
            return MonsterCashOperations.purgeRecords(ids);
        }).then(function () {
            if (!window.MonsterOrderCloud || !MonsterOrderCloud.purgeTestOrders) throw new Error("訂單雲端清除模組尚未載入");
            return MonsterOrderCloud.purgeTestOrders(ids, { actorName: actor.name || actor.account || "店長" });
        }).then(function () {
            clearLocalOrderPointers(ids);
            recalculateLocalStats();
            if (window.MonsterAuth) {
                MonsterAuth.audit("data.clear_test", "清除測試資料：" + ids.join("、"), {
                    source: "admin", targetType: "test-orders", targetId: ids.join(",")
                });
            }
            if (password) password.value = "";
            if (phrase) phrase.value = "";
            previewState = buildPreview(ids);
            renderPreview(previewState);
            setBusy(false, "✅ 已清除 " + ids.length + " 筆測試資料，今日／本月／累積統計已重算。操作紀錄已保留。");
            if (window.MonsterCashOperations) MonsterCashOperations.refresh();
        }).catch(function (error) {
            if (window.MonsterAuth) {
                MonsterAuth.audit("data.clear_test_failed", "清除測試資料未完成：" + (error.message || error), {
                    source: "admin", targetType: "test-orders", targetId: ids.join(",")
                });
            }
            setBusy(false, "❌ 清除未完成：" + (error.message || error) + "。請勿新增訂單，重新預覽後再執行一次。");
            alert("清除測試資料未完成：" + (error.message || error));
        });
    }

    function initialize() {
        var ids = document.getElementById("testCleanupIds");
        if (ids && !ids.value) ids.value = KNOWN_TEST_IDS.join("\n");
        renderPreview({ rows: [], foundRows: [], ids: [], blocked: false });
    }

    window.MonsterTestDataCleanup = {
        preview: preview,
        execute: execute,
        recalculateLocalStats: recalculateLocalStats,
        knownTestIds: KNOWN_TEST_IDS.slice(),
        _test: { buildPreview: buildPreview, normalizeIds: normalizeIds }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else setTimeout(initialize, 0);
}());
