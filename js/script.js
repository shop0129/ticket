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
var adminLoginBusy = false;

function cloudLoginErrorMessage(error) {
    var code = error && error.code ? String(error.code) : "";
    if (code.indexOf("operation-not-allowed") >= 0) {
        return "Firebase 尚未啟用電子郵件／密碼登入，請先依 FIX31 更新說明設定";
    }
    if (code.indexOf("functions/not-found") >= 0 || code.indexOf("functions/unimplemented") >= 0) {
        return "員工雲端功能尚未部署，請先執行 FIX31 部署程式";
    }
    if (code.indexOf("network-request-failed") >= 0 || code.indexOf("unavailable") >= 0 || code.indexOf("firebase-not-ready") >= 0) {
        return "雲端連線失敗，請確認網路後重試";
    }
    if (code.indexOf("too-many-requests") >= 0) {
        return "登入嘗試次數過多，請稍後再試";
    }
    if (code.indexOf("wrong-password") >= 0 || code.indexOf("invalid-credential") >= 0 ||
            code.indexOf("invalid-login-credentials") >= 0 || code.indexOf("user-not-found") >= 0 ||
            code.indexOf("user-disabled") >= 0) {
        return "帳號、密碼錯誤或帳號已停用";
    }
    return (error && error.message) || "帳號、密碼錯誤或帳號已停用";
}

function loginAdmin() {
    var accountInput = document.getElementById("adminLoginAccount");
    var passwordInput = document.getElementById("adminLoginPassword");
    var account;
    var password;
    if (!passwordInput || adminLoginBusy) {
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
    if (!window.MonsterAuth || !MonsterAuth.loginAsync) {
        alert("❌ 雲端員工登入模組尚未載入");
        return;
    }
    adminLoginBusy = true;
    MonsterAuth.loginAsync(account, password).then(function (success) {
        if (!success) { throw { message: "帳號、密碼錯誤或帳號已停用" }; }
        passwordInput.value = "";
        showPage("adminHomePage");
        applyRolePermissions();
    }).catch(function (error) {
        alert("❌ " + cloudLoginErrorMessage(error));
        passwordInput.value = "";
        passwordInput.focus();
    }).then(function () {
        adminLoginBusy = false;
    });
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
