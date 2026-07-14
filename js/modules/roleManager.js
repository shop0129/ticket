// V7 Phase 1 Legacy Build | js/modules/roleManager.js
// =========================================
// 小怪獸售票機 V6.0 穩定修正版
// Admin / Staff 權限系統
// =========================================
var currentUserRole = null;
var ROLE_ADMIN = "admin";
var ROLE_STAFF = "staff";
// =========================================
// 角色登入
// =========================================
function loginByRole(password) {
    if (password === systemData.adminPassword) {
        currentUserRole = ROLE_ADMIN;
    }
    else if (password === systemData.staffPassword) {
        currentUserRole = ROLE_STAFF;
    }
    else {
        return false;
    }
    applyRolePermissions();
    return true;
}
// =========================================
// 登出
// =========================================
function logoutAdmin() {
    playClick();
    currentUserRole = null;
    applyRolePermissions();
    showPage("homePage");
}
// =========================================
// 套用畫面權限
// =========================================
function applyRolePermissions() {
    document.body.classList.remove("role-admin-active", "role-staff-active");
    if (currentUserRole === ROLE_ADMIN) {
        document.body.classList.add("role-admin-active");
    }
    if (currentUserRole === ROLE_STAFF) {
        document.body.classList.add("role-staff-active");
    }
    var badge = document.getElementById("currentRoleBadge");
    if (!badge)
        return;
    if (currentUserRole === ROLE_ADMIN) {
        badge.className =
            "role-badge role-admin";
        badge.textContent =
            "👑 店長模式";
    }
    else if (currentUserRole === ROLE_STAFF) {
        badge.className =
            "role-badge role-staff";
        badge.textContent =
            "👤 員工模式";
    }
    else {
        badge.className =
            "role-badge";
        badge.textContent = "";
    }
}
// =========================================
// 員工禁止危險操作
// 使用事件攔截，不覆寫任何原有函式
// =========================================
document.addEventListener("click", function (event) {
    if (currentUserRole !== ROLE_STAFF) {
        return;
    }
    var blockedButton = event.target.closest("\n        #adminHomePage button[onclick*=\"openTicketManager\"],\n        #adminHomePage button[onclick*=\"openBusinessMode\"],\n        #adminHomePage button[onclick*=\"openSystemSetting\"],\n        #adminHomePage button[onclick*=\"openDataManager\"],\n        #adminHomePage button[onclick*=\"openHardwareTest\"],\n        .deleteHistoryBtn,\n        .cancelBtn,\n        .statsResetButtons button\n    ");
    if (!blockedButton) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    playClick();
    alert("🔒 此功能僅限店長使用");
}, true);
// =========================================
// 員工不可直接進入受限頁面
// =========================================
document.addEventListener("click", function (event) {
    if (currentUserRole !== ROLE_STAFF) {
        return;
    }
    var restrictedLink = event.target.closest("\n        [onclick*=\"openTicketManager\"],\n        [onclick*=\"openBusinessMode\"],\n        [onclick*=\"openSystemSetting\"],\n        [onclick*=\"openDataManager\"],\n        [onclick*=\"openHardwareTest\"]\n    ");
    if (!restrictedLink) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
}, true);
applyRolePermissions();
