// 小怪獸售票機 FIX58 - 售票機後台員工上下班打卡
// 與手機員工後台共用 Firebase Attendance callable functions。
(function (window, document) {
    "use strict";

    var busy = false;
    var active = false;
    var statusData = null;
    var minuteTimer = null;
    var lastActorId = "";

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function actor() {
        if (window.MonsterAuth && typeof window.MonsterAuth.getActor === "function") {
            return window.MonsterAuth.getActor("kiosk-admin");
        }
        if (window.MonsterRole && typeof window.MonsterRole.getCurrentUser === "function") {
            return window.MonsterRole.getCurrentUser() || {};
        }
        return {};
    }

    function service() {
        return window.MonsterFirebaseAttendance || null;
    }

    function taipeiDateKey(timestamp) {
        return new Date(Number(timestamp || Date.now()) + 8 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);
    }

    function monthStart() {
        return taipeiDateKey().slice(0, 8) + "01";
    }

    function formatDateTime(timestamp) {
        if (!timestamp) {
            return "—";
        }
        return new Date(Number(timestamp)).toLocaleString("zh-TW", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatTime(timestamp) {
        if (!timestamp) {
            return "—";
        }
        return new Date(Number(timestamp)).toLocaleTimeString("zh-TW", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDuration(minutes) {
        var total = Math.max(0, Math.floor(Number(minutes || 0)));
        var hours = Math.floor(total / 60);
        var rest = total % 60;
        if (!hours) {
            return rest + " 分";
        }
        return hours + " 小時 " + rest + " 分";
    }

    function setMessage(text, type) {
        var box = byId("kioskAttendanceMessage");
        if (!box) {
            return;
        }
        box.textContent = text || "";
        box.className = "kiosk-attendance-message" + (type ? " " + type : "");
    }

    function setBusy(value) {
        var inButton = byId("kioskAttendanceClockIn");
        var outButton = byId("kioskAttendanceClockOut");
        var refreshButton = byId("kioskAttendanceRefresh");
        busy = value === true;
        if (inButton) {
            inButton.disabled = busy;
        }
        if (outButton) {
            outButton.disabled = busy;
        }
        if (refreshButton) {
            refreshButton.disabled = busy;
        }
    }

    function renderActor() {
        var current = actor();
        var box = byId("kioskAttendanceActor");
        if (!box) {
            return;
        }
        box.textContent = current && current.name ?
            "目前登入：" + current.name + "（" + (current.account || "員工") + "）｜時間以雲端伺服器為準" :
            "請先使用員工帳號登入";
    }

    function renderStatus() {
        var card = byId("kioskAttendanceStatus");
        var title = byId("kioskAttendanceStatusTitle");
        var detail = byId("kioskAttendanceStatusDetail");
        var inButton = byId("kioskAttendanceClockIn");
        var outButton = byId("kioskAttendanceClockOut");
        var open = statusData && statusData.status === "open" && statusData.active;
        var elapsed;

        renderActor();
        if (!card || !title || !detail || !inButton || !outButton) {
            return;
        }

        if (open) {
            elapsed = Math.max(0, Math.floor((Date.now() - Number(statusData.active.clockIn || Date.now())) / 60000));
            card.className = "kiosk-attendance-status is-working";
            title.textContent = "上班中";
            detail.textContent = "上班時間：" + formatDateTime(statusData.active.clockIn) + "｜目前 " + formatDuration(elapsed);
            inButton.hidden = true;
            outButton.hidden = false;
        } else {
            card.className = "kiosk-attendance-status is-off";
            title.textContent = "尚未上班打卡";
            detail.textContent = "開始工作前請先按下「上班打卡」";
            inButton.hidden = false;
            outButton.hidden = true;
        }
        setBusy(busy);
    }

    function renderError(message) {
        var card = byId("kioskAttendanceStatus");
        var title = byId("kioskAttendanceStatusTitle");
        var detail = byId("kioskAttendanceStatusDetail");
        var inButton = byId("kioskAttendanceClockIn");
        var outButton = byId("kioskAttendanceClockOut");
        if (card) {
            card.className = "kiosk-attendance-status is-error";
        }
        if (title) {
            title.textContent = "雲端打卡尚未連線";
        }
        if (detail) {
            detail.textContent = message || "請確認網路後按更新";
        }
        if (inButton) {
            inButton.hidden = true;
        }
        if (outButton) {
            outButton.hidden = true;
        }
    }

    function renderMine(result) {
        var records = result && result.records || [];
        var summary = result && result.summary || {};
        var summaryBox = byId("kioskAttendanceSummary");
        var list = byId("kioskAttendanceRecords");
        var html = "";

        if (summaryBox) {
            summaryBox.textContent = "完成 " + Number(summary.completedShifts || 0) +
                " 次｜共 " + formatDuration(summary.totalMinutes || 0);
        }
        if (!list) {
            return;
        }
        if (!records.length) {
            list.innerHTML = '<div class="kiosk-attendance-empty">本月尚無打卡紀錄</div>';
            return;
        }
        records.slice(0, 6).forEach(function (record) {
            html += '<div class="kiosk-attendance-record-row"><div><strong>' +
                escapeHtml(record.dateKey || taipeiDateKey(record.clockIn)) + '</strong><span>上班 ' +
                escapeHtml(formatTime(record.clockIn)) + '｜下班 ' +
                escapeHtml(record.clockOut ? formatTime(record.clockOut) : "尚未打卡") +
                '</span></div><b class="' + (record.status === "open" ? "is-open" : "") + '">' +
                (record.status === "open" ? "上班中" : escapeHtml(formatDuration(record.durationMinutes))) +
                '</b></div>';
        });
        list.innerHTML = html;
    }

    function refresh() {
        var api = service();
        var current = actor();
        var statusPromise;
        var minePromise;

        if (!active || busy) {
            return Promise.resolve();
        }
        if (!current || !current.id || current.role === "device") {
            renderError("請先使用店長或員工帳號登入");
            return Promise.resolve();
        }
        if (!api || !api.available || !api.available()) {
            renderError("雲端員工工作階段尚未完成，請登出後重新登入");
            return Promise.resolve();
        }

        statusData = null;
        setBusy(true);
        setMessage("正在更新雲端打卡狀態…", "");
        statusPromise = api.getStatus().then(function (result) {
            statusData = result || { status: "off", active: null };
            renderStatus();
        });
        minePromise = api.listMine(monthStart(), taipeiDateKey()).then(renderMine);

        return Promise.all([statusPromise, minePromise]).then(function () {
            setMessage("已與手機店長後台同步", "success");
        }).catch(function (error) {
            var message = error && error.message || "讀取打卡資料失敗，請稍後再試";
            renderError(message);
            setMessage(message, "error");
        }).then(function () {
            setBusy(false);
            if (statusData !== null) {
                renderStatus();
            }
        });
    }

    function performClock(action) {
        var api = service();
        var isClockIn = action === "in";
        if (busy || !api || !api.available || !api.available()) {
            setMessage("雲端打卡尚未連線，請先按更新", "error");
            return;
        }
        if (!isClockIn && !window.confirm("確定要下班打卡嗎？")) {
            return;
        }

        setBusy(true);
        setMessage(isClockIn ? "正在進行上班打卡…" : "正在進行下班打卡…", "");
        (isClockIn ? api.clockIn() : api.clockOut()).then(function (result) {
            statusData = isClockIn ?
                { status: "open", active: result.record } :
                { status: "off", active: null };
            renderStatus();
            if (window.MonsterAuth && typeof window.MonsterAuth.audit === "function") {
                window.MonsterAuth.audit(isClockIn ? "attendance.clock_in" : "attendance.clock_out",
                    isClockIn ? "售票機後台上班打卡" : "售票機後台下班打卡",
                    { source: "kiosk-admin", targetType: "attendance", targetId: result && result.record && result.record.id || "" });
            }
            setMessage(isClockIn ? "上班打卡成功，手機店長後台已可查看" :
                "下班打卡成功，本次 " + formatDuration(result.record && result.record.durationMinutes), "success");
            return api.listMine(monthStart(), taipeiDateKey()).then(renderMine);
        }).catch(function (error) {
            var message = error && error.message || "打卡失敗，請稍後再試";
            setMessage(message, "error");
        }).then(function () {
            setBusy(false);
            renderStatus();
        });
    }

    function activate() {
        var current = actor();
        active = true;
        if (current && current.id !== lastActorId) {
            lastActorId = current.id;
            statusData = null;
        }
        renderActor();
        refresh();
        if (minuteTimer) {
            window.clearInterval(minuteTimer);
        }
        minuteTimer = window.setInterval(renderStatus, 60000);
    }

    function deactivate() {
        active = false;
        statusData = null;
        lastActorId = "";
        if (minuteTimer) {
            window.clearInterval(minuteTimer);
            minuteTimer = null;
        }
    }

    function adminPageVisible() {
        var page = byId("adminHomePage");
        return !!(page && page.classList.contains("active"));
    }

    function syncPageState() {
        if (adminPageVisible()) {
            activate();
        } else if (active) {
            deactivate();
        }
    }

    function init() {
        var page = byId("adminHomePage");
        var inButton = byId("kioskAttendanceClockIn");
        var outButton = byId("kioskAttendanceClockOut");
        var refreshButton = byId("kioskAttendanceRefresh");

        if (!page || !inButton || !outButton || !refreshButton) {
            return;
        }

        inButton.addEventListener("click", function () {
            performClock("in");
        });
        outButton.addEventListener("click", function () {
            performClock("out");
        });
        refreshButton.addEventListener("click", refresh);

        if (window.MutationObserver) {
            new window.MutationObserver(syncPageState).observe(page, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden && adminPageVisible()) {
                activate();
            }
        });
        syncPageState();
    }

    window.MonsterKioskAttendance = {
        version: "FIX58",
        activate: activate,
        deactivate: deactivate,
        refresh: refresh,
        getState: function () {
            return {
                active: active,
                busy: busy,
                status: statusData
            };
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}(window, document));
