// 小怪獸售票機 V7.8.3.3 Sprint 11A
// Controller 96 MDB coin inventory / safe refill / change simulation
// Android WebView 61 相容（ES5）
(function () {
    "use strict";

    var BASE_URL = "http://127.0.0.1:8765/v1";
    var PAIRING_KEY = "monsterCashBridgePairingKeyV1";
    var pollTimer = null;
    var latestStatus = null;

    function pairingKey() {
        return String(localStorage.getItem(PAIRING_KEY) || "").replace(/\s/g, "");
    }

    function requestPairingKey() {
        var current = pairingKey();
        var entered;
        if (/^\d{8}$/.test(current)) return current;
        entered = prompt("請輸入 Controller 畫面上的8位數配對碼。", "");
        if (entered === null) return "";
        entered = String(entered).replace(/\s/g, "");
        if (!/^\d{8}$/.test(entered)) {
            alert("配對碼必須是8位數字");
            return "";
        }
        localStorage.setItem(PAIRING_KEY, entered);
        return entered;
    }

    function api(path, options) {
        var settings = options || {};
        var key = pairingKey() || requestPairingKey();
        var request;
        if (!key) return Promise.reject(new Error("尚未輸入控制器配對碼"));
        request = {
            method: settings.method || "GET",
            cache: "no-store",
            headers: {
                "X-Monster-Bridge-Key": key,
                "Content-Type": "application/json"
            }
        };
        if (settings.body !== undefined) request.body = JSON.stringify(settings.body);
        return fetch(BASE_URL + path, request).then(function (response) {
            return response.text().then(function (text) {
                var data;
                try { data = text ? JSON.parse(text) : {}; }
                catch (error) { data = { ok: false, message: "控制器回覆格式錯誤" }; }
                if (!response.ok) {
                    if (data.code === "PAIRING_REQUIRED") localStorage.removeItem(PAIRING_KEY);
                    throw new Error(data.message || ("控制器錯誤 HTTP " + response.status));
                }
                return data;
            });
        });
    }

    function actor() {
        var current = window.MonsterAuth && MonsterAuth.getActor
            ? MonsterAuth.getActor("manager")
            : null;
        return {
            operatorId: String((current && (current.id || current.uid)) || "manager"),
            operatorName: String((current && current.name) || "店長")
        };
    }

    function requireManager() {
        return !window.MonsterPermission ||
            MonsterPermission.requirePermission("coin.manage", "❌ 只有店長可以管理MDB零錢庫存");
    }

    function setStatus(message, type) {
        var box = document.getElementById("coinManagerStatus");
        if (!box) return;
        box.className = "coin-manager-status" + (type ? (" " + type) : "");
        box.textContent = message;
    }

    function formatTime(value) {
        if (!value) return "尚未更新";
        return new Date(Number(value)).toLocaleString("zh-TW");
    }

    function formatCounts(counts) {
        var keys = Object.keys(counts || {}).sort(function (a, b) { return Number(b) - Number(a); });
        if (!keys.length) return "無";
        return keys.map(function (key) {
            return "NT$" + key + " × " + Number(counts[key] || 0);
        }).join("、");
    }

    function renderStatus(data) {
        var inventory = data.inventory;
        var grid = document.getElementById("coinInventoryGrid");
        var meta = document.getElementById("coinInventoryMeta");
        var total = document.getElementById("coinInventoryTotal");
        var refill = document.getElementById("coinRefillLive");
        var startButton = document.getElementById("coinRefillStartButton");
        var stopButton = document.getElementById("coinRefillStopButton");
        var refreshButton = document.getElementById("coinRefreshButton");
        var note = data.note100 || {};
        var entries;
        var html = "";
        var i;

        latestStatus = data;
        if (!data.controllerOnline) {
            setStatus("Controller 96 未連線或狀態逾時；補幣操作已停用。", "error");
        } else if (data.maintenance && data.maintenance.error) {
            setStatus(data.maintenance.message + "：" + data.maintenance.error, "error");
        } else if (data.pendingRequest) {
            setStatus("操作已送出，等待MDB控制器處理：" + data.pendingRequest.type, "");
        } else {
            setStatus((data.maintenance && data.maintenance.message) || "Controller 96 已連線", "success");
        }

        entries = inventory && inventory.entries ? inventory.entries.slice() : [];
        entries.sort(function (a, b) { return Number(a.denominationNtd) - Number(b.denominationNtd); });
        if (!entries.length) {
            html = '<div class="coin-inventory-card low"><div class="coin-inventory-value">尚無資料</div>' +
                '<div class="coin-inventory-sub">請按「重新讀取MDB」</div></div>';
        } else {
            for (i = 0; i < entries.length; i += 1) {
                html += '<div class="coin-inventory-card' +
                    (entries[i].lowStock ? " low" : "") +
                    (entries[i].full ? " full" : "") + '">' +
                    '<div class="coin-inventory-value">NT$' + Number(entries[i].denominationNtd) + '</div>' +
                    '<div class="coin-inventory-count">' + Number(entries[i].count) + ' 枚</div>' +
                    '<div class="coin-inventory-sub">小計 NT$' + Number(entries[i].amountNtd) +
                    '｜警戒 ' + Number(entries[i].threshold) + ' 枚' +
                    (entries[i].full ? "｜已滿" : "") + '</div></div>';
            }
        }
        grid.innerHTML = html;
        meta.textContent = inventory
            ? ((inventory.stale ? "⚠ 資料可能已過期｜" : "") + "MDB更新：" + formatTime(inventory.updatedAt))
            : "尚未讀取 Tube Info";
        total.textContent = "硬幣總額：NT$" + Number((inventory && inventory.totalNtd) || 0);

        [1, 5, 10, 50].forEach(function (value) {
            var input = document.getElementById("coinThreshold" + value);
            if (input && document.activeElement !== input) {
                input.value = Number((data.thresholds && data.thresholds[String(value)]) || 0);
            }
        });

        if (document.activeElement !== document.getElementById("note100Count")) {
            document.getElementById("note100Count").value = Number(note.count || 0);
        }
        if (document.activeElement !== document.getElementById("note100Reserve")) {
            document.getElementById("note100Reserve").value = Number(note.reserveCount || 0);
        }
        document.getElementById("note100Meta").textContent =
            "最後登記：" + formatTime(note.updatedAt) +
            (note.operatorName ? ("｜" + note.operatorName) : "") +
            "｜此數量尚未由TOP XC100自動確認";

        if (data.activeRefill) {
            refill.className = "coin-refill-live active";
            refill.textContent = "補幣中｜操作人員：" + data.activeRefill.operatorName +
                "｜已收 NT$" + Number(data.activeRefill.totalNtd || 0) +
                "｜儲幣筒 " + Number(data.activeRefill.tubeCount || 0) +
                "｜溢幣箱 " + Number(data.activeRefill.overflowCount || 0) +
                "｜" + formatCounts(data.activeRefill.counts);
        } else {
            refill.className = "coin-refill-live";
            refill.textContent = "目前沒有補幣工作";
        }

        startButton.disabled = !data.controllerOnline || !!data.pendingRequest || !!data.activeRefill;
        stopButton.disabled = !data.controllerOnline || !!data.pendingRequest || !data.activeRefill;
        refreshButton.disabled = !data.controllerOnline || !!data.pendingRequest || !!data.activeRefill;
    }

    function renderRefills(data) {
        var box = document.getElementById("coinRefillHistory");
        var rows = data.records || [];
        var html = "";
        var i;
        if (!rows.length) {
            box.textContent = "尚無補幣紀錄";
            return;
        }
        for (i = 0; i < rows.length && i < 30; i += 1) {
            html += '<div class="coin-refill-row">' +
                '<strong>' + formatTime(rows[i].startedAt) + '</strong>' +
                '<span>' + String(rows[i].operatorName || "未知") + '</span>' +
                '<span>' + formatCounts(rows[i].counts) + '</span>' +
                '<span>NT$' + Number(rows[i].totalNtd || 0) +
                '｜筒' + Number(rows[i].tubeCount || 0) +
                '／溢' + Number(rows[i].overflowCount || 0) + '</span></div>';
        }
        box.innerHTML = html;
    }

    function loadStatus(showError) {
        return api("/coins/status").then(function (data) {
            renderStatus(data);
            return api("/coins/refills");
        }).then(function (data) {
            renderRefills(data);
            return data;
        }).catch(function (error) {
            if (showError !== false) setStatus(error.message || String(error), "error");
            throw error;
        });
    }

    function queueAction(path, confirmation, auditAction, auditDetail) {
        var who = actor();
        return api(path, {
            method: "POST",
            body: {
                requestId: "WEB-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
                confirmation: confirmation,
                operatorId: who.operatorId,
                operatorName: who.operatorName
            }
        }).then(function (data) {
            if (window.MonsterAuth && MonsterAuth.audit) MonsterAuth.audit(auditAction, auditDetail, { source: "manager" });
            setStatus(data.message || "操作已送出", "success");
            setTimeout(function () { loadStatus(false); }, 500);
            return data;
        }).catch(function (error) {
            setStatus(error.message || String(error), "error");
            throw error;
        });
    }

    function schedulePoll() {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = setTimeout(function () {
            var page = document.getElementById("coinManagerPage");
            if (!page || !page.classList.contains("active")) return;
            loadStatus(false).catch(function () { return null; }).then(schedulePoll);
        }, 1000);
    }

    window.openCoinManager = function () {
        if (!requireManager()) return;
        if (!requestPairingKey()) return;
        showPage("coinManagerPage");
        setStatus("正在連接 Controller 96…", "");
        loadStatus(true).catch(function () { return null; }).then(schedulePoll);
    };

    window.closeCoinManager = function () {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = null;
        showPage("adminHomePage");
    };

    window.refreshCoinInventory = function () {
        if (!requireManager()) return;
        queueAction(
            "/coins/inventory/refresh",
            "REFRESH_MDB_TUBE_INFO",
            "coin.inventory_refresh",
            "重新讀取 MDB Tube 庫存"
        ).catch(function () { return null; });
    };

    window.startCoinRefill = function () {
        if (!requireManager()) return;
        if (!confirm("確定開始60秒安全補幣？\n補幣期間禁止現金購票，停止後會重新讀取MDB庫存。")) return;
        queueAction(
            "/coins/refills/start",
            "START_MDB_REFILL_60S",
            "coin.refill_start",
            "開始60秒MDB安全補幣"
        ).catch(function () { return null; });
    };

    window.stopCoinRefill = function () {
        if (!requireManager()) return;
        if (!confirm("確定立即停止補幣？")) return;
        queueAction(
            "/coins/refills/stop",
            "STOP_MDB_REFILL",
            "coin.refill_stop",
            "立即停止MDB補幣"
        ).catch(function () { return null; });
    };

    window.saveCoinThresholds = function () {
        var who;
        var values = {};
        if (!requireManager()) return;
        [1, 5, 10, 50].forEach(function (value) {
            values[String(value)] = Number(document.getElementById("coinThreshold" + value).value);
        });
        if (Object.keys(values).some(function (key) {
            return !isFinite(values[key]) || values[key] < 0 || values[key] > 250 || Math.floor(values[key]) !== values[key];
        })) {
            alert("硬幣安全庫存必須是0～250的整數");
            return;
        }
        who = actor();
        api("/coins/thresholds", {
            method: "POST",
            body: {
                confirmation: "UPDATE_COIN_THRESHOLDS",
                operatorId: who.operatorId,
                operatorName: who.operatorName,
                thresholds: values
            }
        }).then(function (data) {
            if (window.MonsterAuth && MonsterAuth.audit) {
                MonsterAuth.audit("coin.threshold_update", "更新硬幣安全庫存：" + JSON.stringify(values), { source: "manager" });
            }
            setStatus(data.message, "success");
            loadStatus(false);
        }).catch(function (error) { setStatus(error.message, "error"); });
    };

    window.saveNote100Inventory = function () {
        var who;
        var count = Number(document.getElementById("note100Count").value);
        var reserve = Number(document.getElementById("note100Reserve").value);
        if (!requireManager()) return;
        if (!isFinite(count) || !isFinite(reserve) || count < 0 || count > 500 ||
            reserve < 0 || reserve > 500 || Math.floor(count) !== count || Math.floor(reserve) !== reserve) {
            alert("百元鈔庫存與安全張數必須是0～500的整數");
            return;
        }
        who = actor();
        api("/change/note-inventory", {
            method: "POST",
            body: {
                confirmation: "SET_NOTE_100_INVENTORY",
                operatorId: who.operatorId,
                operatorName: who.operatorName,
                count: count,
                reserveCount: reserve
            }
        }).then(function (data) {
            if (window.MonsterAuth && MonsterAuth.audit) {
                MonsterAuth.audit("note.inventory_update", "百元鈔庫存" + count + "張／安全" + reserve + "張", { source: "manager" });
            }
            setStatus(data.message, "success");
            loadStatus(false);
        }).catch(function (error) { setStatus(error.message, "error"); });
    };

    window.simulateChange = function () {
        var amount = Number(document.getElementById("changeSimulationAmount").value);
        var box = document.getElementById("changeSimulationResult");
        if (!requireManager()) return;
        if (!isFinite(amount) || amount < 0 || amount > 9999 || Math.floor(amount) !== amount) {
            alert("找零金額必須是0～9999的整數");
            return;
        }
        api("/change/simulate", {
            method: "POST",
            body: { amountNtd: amount }
        }).then(function (data) {
            var plan = data.status === "SAFE" ? data.safePlan : data.allStockPlan;
            var css = data.status === "SAFE" ? "safe" : (data.status === "LOW_STOCK_ONLY" ? "warning" : "impossible");
            box.className = "change-simulation-result " + css;
            box.innerHTML = "<strong>" + data.message + "</strong><br>" +
                (plan.success
                    ? ("建議組合：" + formatCounts(plan.counts) + "｜共 " + Number(plan.pieceCount) + " 張／枚")
                    : ("仍差 NT$" + Number(plan.remainingNtd) + "，禁止接受需要找零的付款")) +
                "<br><small>本次只計算，實際出鈔／出幣為0。</small>";
            if (window.MonsterAuth && MonsterAuth.audit) {
                MonsterAuth.audit("change.simulate", "模擬找零 NT$" + amount + "：" + data.status, { source: "manager" });
            }
        }).catch(function (error) {
            box.className = "change-simulation-result impossible";
            box.textContent = error.message || String(error);
        });
    };
}());
