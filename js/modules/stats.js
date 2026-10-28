// 小怪獸售票機 V7.8.3.3 FIX62
// 營運中心統一讀取 Dashboard 雲端摘要，本機統計只作離線備援。
//==========================
// 營運中心
//==========================
function openTodayStats() {
    showPage("todayStatsPage");
    setStatsTabActive("today");
    renderStats(todayStats);
    if (window.MonsterDashboardCloud && typeof MonsterDashboardCloud.forceRefresh === "function") {
        MonsterDashboardCloud.forceRefresh();
    }
}
// =========================================
// 更新統計
// =========================================
function updateStats(stats, ticket, item) {
    if (!stats || !ticket || !item)
        return;
    stats.tickets =
        Number(stats.tickets || 0) + Math.max(0, Number(item.reportTicketCount != null ? item.reportTicketCount : 1));
    stats.income =
        Number(stats.income || 0) +
            Number(ticket.price || 0);
    stats.tokens =
        Number(stats.tokens || 0) +
            Number(ticket.token || 0);
    if (ticket.toy === "green") {
        stats.greenToy =
            Number(stats.greenToy || 0) + 1;
    }
    if (ticket.toy === "red") {
        stats.redToy =
            Number(stats.redToy || 0) + 1;
    }
    if (item.id === "parent") {
        stats.parent =
            Number(stats.parent || 0) + 1;
    }
}
//==========================
// 顯示統計
//==========================
function renderStats(data) {
    if (!data)
        return;
    var sourceData = data;
    var period = data === monthStats ? "month" : (data === totalStats ? "all" : "today");
    var cloudData = getCloudStats(period, data);
    data = cloudData || data;
    var values = {
        statsTickets: "".concat(formatStatsNumber(data.tickets), " \u5F35"),
        statsIncome: "NT$".concat(formatStatsNumber(data.income)),
        statsTokens: "".concat(formatStatsNumber(data.tokens), " \u679A"),
        statsGreenToy: "".concat(formatStatsNumber(data.greenToy), " \u500B"),
        statsRedToy: "".concat(formatStatsNumber(data.redToy), " \u500B"),
        statsParent: "".concat(formatStatsNumber(data.parent), " \u5F35")
    };
    for (var id in values) {
        var element = document.getElementById(id);
        if (element) {
            element.innerHTML =
                values[id];
        }
    }
    renderStatsDate(sourceData);
}

function getCloudStats(period, fallback) {
    if (!window.MonsterDashboardCloud || typeof MonsterDashboardCloud.getSummary !== "function") {
        return fallback;
    }
    var summary = MonsterDashboardCloud.getSummary(period);
    if (!summary) {
        return fallback;
    }
    function cloudNumber(key, fallbackKey) {
        return summary[key] !== undefined && summary[key] !== null
            ? Number(summary[key] || 0)
            : Number(fallback && fallback[fallbackKey] || 0);
    }
    return {
        tickets: cloudNumber("ticketCount", "tickets"),
        income: cloudNumber("income", "income"),
        tokens: cloudNumber("tokens", "tokens"),
        greenToy: cloudNumber("greenToys", "greenToy"),
        redToy: cloudNumber("redToys", "redToy"),
        parent: cloudNumber("parentTickets", "parent")
    };
}

function refreshVisibleStatsFromCloud() {
    var page = document.getElementById("todayStatsPage");
    if (!page || !page.classList.contains("active")) {
        return;
    }
    if (document.getElementById("monthTab") && document.getElementById("monthTab").classList.contains("active")) {
        renderStats(monthStats);
    }
    else if (document.getElementById("totalTab") && document.getElementById("totalTab").classList.contains("active")) {
        renderStats(totalStats);
    }
    else {
        renderStats(todayStats);
    }
}

window.addEventListener("monster:dashboard-cloud-updated", refreshVisibleStatsFromCloud);
//==========================
// 統計數字格式
//==========================
function formatStatsNumber(value) {
    return Number(value || 0)
        .toLocaleString("zh-TW");
}
//==========================
// 顯示統計日期
//==========================
function renderStatsDate(data) {
    var dateBox = document.getElementById("statsDate");
    if (!dateBox)
        return;
    var today = new Date();
    var week = [
        "星期日",
        "星期一",
        "星期二",
        "星期三",
        "星期四",
        "星期五",
        "星期六"
    ];
    if (data === todayStats) {
        dateBox.innerHTML =
            "\uD83D\uDCC5 ".concat(today.toLocaleDateString("zh-TW"), "\uFF08").concat(week[today.getDay()], "\uFF09");
        setStatsTabActive("today");
    }
    else if (data === monthStats) {
        dateBox.innerHTML =
            "\uD83D\uDCC5 ".concat(today.getFullYear(), " \u5E74 ").concat(today.getMonth() + 1, " \u6708");
        setStatsTabActive("month");
    }
    else {
        dateBox.innerHTML =
            "\uD83D\uDCC5 \u7D2F\u7A4D\u81F3 ".concat(today.toLocaleDateString("zh-TW"), "\uFF08").concat(week[today.getDay()], "\uFF09");
        setStatsTabActive("total");
    }
}
//==========================
// 頁籤狀態
//==========================
function setStatsTabActive(type) {
    var tabs = {
        today: document.getElementById("todayTab"),
        month: document.getElementById("monthTab"),
        total: document.getElementById("totalTab")
    };
    for (var key in tabs) {
        if (!tabs[key])
            continue;
        tabs[key].classList.toggle("active", key === type);
    }
}
//==========================
// 今日統計歸零
//==========================
function resetTodayStats() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("stats.reset", "❌ 只有店長可以歸零統計")) {
        return;
    }
    if (!confirm("確定要將今日統計歸零？")) {
        return;
    }
    todayStats =
        createEmptyStats();
    saveTodayStats();
    renderStats(todayStats);
    alert("✅ 今日統計已歸零");
}
//==========================
// 本月統計歸零
//==========================
function resetMonthStats() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("stats.reset", "❌ 只有店長可以歸零統計")) {
        return;
    }
    if (!confirm("確定清除本月統計？")) {
        return;
    }
    monthStats =
        createEmptyStats();
    saveTodayStats();
    renderStats(monthStats);
    alert("✅ 本月統計已歸零");
}
//==========================
// 所有統計歸零
//==========================
function resetAllStats() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("stats.reset", "❌ 只有店長可以歸零統計")) {
        return;
    }
    if (!confirm("確定清除今日、本月及累積統計？")) {
        return;
    }
    todayStats =
        createEmptyStats();
    monthStats =
        createEmptyStats();
    totalStats =
        createEmptyStats();
    saveTodayStats();
    renderStats(todayStats);
    alert("✅ 所有統計已歸零");
}
//==========================
// 建立空白統計
//==========================
function createEmptyStats() {
    return {
        tickets: 0,
        income: 0,
        tokens: 0,
        greenToy: 0,
        redToy: 0,
        parent: 0
    };
}
