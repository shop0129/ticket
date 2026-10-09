// 小怪獸售票機 FIX32 - 員工上下班打卡與店長工時報表
(function () {
    "use strict";

    var activeRole = "";
    var busy = false;
    var statusData = null;
    var minuteTimer = null;

    function byId(id) { return document.getElementById(id); }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function taipeiDateKey(timestamp) {
        return new Date(Number(timestamp || Date.now()) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    function monthStart() {
        return taipeiDateKey().slice(0, 8) + "01";
    }

    function formatDateTime(timestamp) {
        if (!timestamp) { return "—"; }
        return new Date(Number(timestamp)).toLocaleString("zh-TW", { hour12: false });
    }

    function formatDuration(minutes) {
        var total = Math.max(0, Number(minutes || 0));
        var hours = Math.floor(total / 60);
        var rest = total % 60;
        if (!hours) { return rest + " 分"; }
        return hours + " 小時 " + rest + " 分";
    }

    function setMessage(text, type) {
        var box = byId("attendanceMessage");
        if (!box) { return; }
        box.textContent = text || "";
        box.className = "attendance-message " + (type || "");
    }

    function api() { return window.MonsterFirebaseAttendance || null; }

    function renderStatus() {
        var open = statusData && statusData.status === "open" && statusData.active;
        var title = byId("attendanceStatusTitle");
        var detail = byId("attendanceStatusDetail");
        var inButton = byId("attendanceClockInButton");
        var outButton = byId("attendanceClockOutButton");
        var card = byId("attendanceStatusCard");
        var elapsed;
        if (!title || !detail || !inButton || !outButton || !card) { return; }
        if (open) {
            elapsed = Math.max(0, Math.floor((Date.now() - Number(statusData.active.clockIn || Date.now())) / 60000));
            card.className = "attendance-status-card is-working";
            title.textContent = "上班中";
            detail.textContent = "上班時間：" + formatDateTime(statusData.active.clockIn) + "｜目前 " + formatDuration(elapsed);
            inButton.style.display = "none";
            outButton.style.display = "inline-flex";
        } else {
            card.className = "attendance-status-card is-off";
            title.textContent = "尚未上班打卡";
            detail.textContent = "請在開始工作時按下上班打卡";
            inButton.style.display = "inline-flex";
            outButton.style.display = "none";
        }
        inButton.disabled = busy;
        outButton.disabled = busy;
    }

    function renderMine(result) {
        var list = byId("attendanceMyList");
        var total = byId("attendanceMyTotal");
        var records = result && result.records || [];
        var html = "";
        if (total) {
            total.textContent = "本月已完成 " + Number(result && result.summary && result.summary.completedShifts || 0) +
                " 次，共 " + formatDuration(result && result.summary && result.summary.totalMinutes || 0);
        }
        if (!list) { return; }
        if (!records.length) {
            list.innerHTML = '<div class="attendance-empty">本月尚無打卡紀錄</div>';
            return;
        }
        records.slice(0, 12).forEach(function (record) {
            html += '<div class="attendance-record-row"><div><strong>' + escapeHtml(record.dateKey) + '</strong>' +
                '<span>上班 ' + escapeHtml(formatDateTime(record.clockIn)) + '</span>' +
                '<span>下班 ' + escapeHtml(record.clockOut ? formatDateTime(record.clockOut) : "尚未打卡") + '</span></div>' +
                '<b class="' + (record.status === "open" ? "is-open" : "") + '">' +
                (record.status === "open" ? "上班中" : escapeHtml(formatDuration(record.durationMinutes))) + '</b></div>';
        });
        list.innerHTML = html;
    }

    function refreshMine() {
        if (!api() || !api().available()) { return Promise.resolve(); }
        return api().listMine(monthStart(), taipeiDateKey()).then(renderMine).catch(function (error) {
            setMessage(error && error.message || "讀取打卡紀錄失敗", "error");
        });
    }

    function refreshStatus() {
        if (!api() || !api().available()) {
            setMessage("雲端打卡功能尚未連線", "error");
            return Promise.resolve();
        }
        return api().getStatus().then(function (result) {
            statusData = result || { status: "off" };
            renderStatus();
        }).catch(function (error) {
            setMessage(error && error.message || "讀取打卡狀態失敗", "error");
        });
    }

    function performClock(action) {
        var service = api();
        var isIn = action === "in";
        if (busy || !service) { return; }
        if (!isIn && !confirm("確定要下班打卡嗎？")) { return; }
        busy = true;
        renderStatus();
        setMessage(isIn ? "正在進行上班打卡…" : "正在進行下班打卡…", "loading");
        (isIn ? service.clockIn() : service.clockOut()).then(function (result) {
            statusData = isIn ? { status: "open", active: result.record } : { status: "off", active: null };
            setMessage(isIn ? "上班打卡成功" : "下班打卡成功，本次 " + formatDuration(result.record.durationMinutes), "success");
            renderStatus();
            return refreshMine();
        }).then(function () {
            if (activeRole === "admin") { return loadAdminReport(); }
        }).catch(function (error) {
            setMessage(error && error.message || "打卡失敗，請稍後再試", "error");
        }).then(function () {
            busy = false;
            renderStatus();
        });
    }

    function renderAdminReport(result) {
        var summaryBox = byId("attendanceAdminSummary");
        var list = byId("attendanceAdminList");
        var summary = result && result.summary || {};
        var records = result && result.records || [];
        var html = "";
        if (summaryBox) {
            summaryBox.innerHTML = '<div><span>完成班次</span><strong>' + Number(summary.completedShifts || 0) + '</strong></div>' +
                '<div><span>總工時</span><strong>' + escapeHtml(formatDuration(summary.totalMinutes)) + '</strong></div>' +
                '<div><span>上班中</span><strong>' + Number(summary.openShifts || 0) + '</strong></div>';
        }
        if (!list) { return; }
        if (!records.length) {
            list.innerHTML = '<div class="attendance-empty">這個日期區間沒有打卡紀錄</div>';
            return;
        }
        html += '<div class="attendance-table-wrap"><table class="attendance-table"><thead><tr><th>員工</th><th>日期</th><th>上班</th><th>下班</th><th>時數</th></tr></thead><tbody>';
        records.forEach(function (record) {
            html += '<tr><td><strong>' + escapeHtml(record.name) + '</strong><small>' + escapeHtml(record.account) + '</small></td>' +
                '<td>' + escapeHtml(record.dateKey) + '</td><td>' + escapeHtml(formatDateTime(record.clockIn)) + '</td>' +
                '<td>' + escapeHtml(record.clockOut ? formatDateTime(record.clockOut) : "上班中") + '</td>' +
                '<td><b>' + (record.status === "open" ? "—" : escapeHtml(formatDuration(record.durationMinutes))) + '</b></td></tr>';
        });
        html += '</tbody></table></div><div class="attendance-employee-totals">';
        (summary.employees || []).forEach(function (employee) {
            html += '<div><span>' + escapeHtml(employee.name) + '（' + escapeHtml(employee.account) + '）</span><strong>' +
                escapeHtml(formatDuration(employee.totalMinutes)) + '</strong><small>完成 ' + Number(employee.completedShifts || 0) +
                ' 次' + (employee.openShifts ? '・上班中 ' + Number(employee.openShifts) + ' 次' : '') + '</small></div>';
        });
        html += '</div>';
        list.innerHTML = html;
    }

    function loadAdminReport() {
        var from = byId("attendanceDateFrom");
        var to = byId("attendanceDateTo");
        var button = byId("attendanceReportButton");
        if (activeRole !== "admin" || !from || !to || !api()) { return Promise.resolve(); }
        if (!from.value || !to.value || from.value > to.value) {
            alert("請選擇正確的日期區間");
            return Promise.resolve();
        }
        button.disabled = true;
        button.textContent = "讀取中…";
        return api().adminReport(from.value, to.value).then(renderAdminReport).catch(function (error) {
            alert(error && error.message || "工時報表讀取失敗");
        }).then(function () {
            button.disabled = false;
            button.textContent = "查詢工時";
        });
    }

    function activate(role) {
        activeRole = role || "staff";
        setMessage("", "");
        refreshStatus();
        refreshMine();
        if (activeRole === "admin") { loadAdminReport(); }
        if (minuteTimer) { clearInterval(minuteTimer); }
        minuteTimer = setInterval(renderStatus, 60000);
    }

    function deactivate() {
        activeRole = "";
        statusData = null;
        if (minuteTimer) { clearInterval(minuteTimer); minuteTimer = null; }
    }

    function init() {
        var from = byId("attendanceDateFrom");
        var to = byId("attendanceDateTo");
        if (from) { from.value = monthStart(); }
        if (to) { to.value = taipeiDateKey(); }
        if (byId("attendanceClockInButton")) { byId("attendanceClockInButton").addEventListener("click", function () { performClock("in"); }); }
        if (byId("attendanceClockOutButton")) { byId("attendanceClockOutButton").addEventListener("click", function () { performClock("out"); }); }
        if (byId("attendanceRefreshButton")) { byId("attendanceRefreshButton").addEventListener("click", function () { refreshStatus(); refreshMine(); }); }
        if (byId("attendanceReportButton")) { byId("attendanceReportButton").addEventListener("click", loadAdminReport); }
    }

    window.MonsterAttendanceUI = { version: "FIX32", activate: activate, deactivate: deactivate, loadAdminReport: loadAdminReport };
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
}());
