// V7 Phase 1 Legacy Build | js/script.js
// =========================================
// 小怪獸售票機 V5.6.5
// 主程式
// =========================================
var todayTab = document.getElementById("todayTab");
var monthTab = document.getElementById("monthTab");
var totalTab = document.getElementById("totalTab");
// =========================================
// 扣回統計（作廢訂單）
// =========================================
function rollbackStats(stats, ticket, item) {
    stats.tickets =
        Math.max(0, stats.tickets - 1);
    stats.income =
        Math.max(0, stats.income -
            Number(ticket.price || 0));
    stats.tokens =
        Math.max(0, stats.tokens -
            Number(ticket.token || 0));
    if (ticket.toy === "green") {
        stats.greenToy =
            Math.max(0, stats.greenToy - 1);
    }
    if (ticket.toy === "red") {
        stats.redToy =
            Math.max(0, stats.redToy - 1);
    }
    if (item.id === "parent") {
        stats.parent =
            Math.max(0, stats.parent - 1);
    }
}
// =========================================
// 管理員／員工登入
// =========================================
function loginAdmin() {
    var accountInput = document.getElementById("adminLoginAccount");
    var passwordInput = document.getElementById("adminLoginPassword");
    var account;
    var password;
    if (!passwordInput) {
        return;
    }
    account = accountInput ? accountInput.value.trim() : "";
    password = passwordInput.value.trim();
    if (!account) {
        alert("❌ 請輸入員工帳號");
        if (accountInput) {
            accountInput.focus();
        }
        return;
    }
    if (!window.MonsterAuth || !MonsterAuth.login(account, password)) {
        alert("❌ 帳號、密碼錯誤或帳號已停用");
        passwordInput.value = "";
        passwordInput.focus();
        return;
    }
    passwordInput.value = "";
    showPage("adminHomePage");
    applyRolePermissions();
}
// =========================================
// 統計分頁
// =========================================
if (todayTab) {
    todayTab.addEventListener("click", function () {
        playClick();
        renderStats(todayStats);
        todayTab.classList.add("active");
        monthTab.classList.remove("active");
        totalTab.classList.remove("active");
    });
}
if (monthTab) {
    monthTab.addEventListener("click", function () {
        playClick();
        renderStats(monthStats);
        todayTab.classList.remove("active");
        monthTab.classList.add("active");
        totalTab.classList.remove("active");
    });
}
if (totalTab) {
    totalTab.addEventListener("click", function () {
        playClick();
        renderStats(totalStats);
        todayTab.classList.remove("active");
        monthTab.classList.remove("active");
        totalTab.classList.add("active");
    });
}
// =========================================
// 後台按鍵音效
// =========================================
// 防止同一次點擊被多個事件重複播放
var originalPlayClick = playClick;
var lastClickSoundTime = 0;
window.playClick = function () {
    var now = Date.now();
    if (now - lastClickSoundTime < 100) {
        return;
    }
    lastClickSoundTime = now;
    originalPlayClick();
};
// 後台頁面所有按鈕統一播放點擊音效
document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button)
        return;
    var adminPage = button.closest("\n        #adminLoginPage,\n        #adminHomePage,\n        #ticketManagerPage,\n        #businessModePage,\n        #systemSettingPage,\n        #todayStatsPage,\n        #salesHistoryPage,\n        #orderDetailPage,\n        #dataManagerPage,\n        #hardwareTestPage\n    ");
    if (!adminPage)
        return;
    playClick();
}, true);
// =========================================
// 啟動
// =========================================
showPage("homePage");
applyPaymentSetting();
updateTicketButtons();
updateTicketPrices();
updateCartPanel();
