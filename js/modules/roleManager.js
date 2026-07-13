// =========================================
// 小怪獸售票機 V6.0
// Admin / Staff 權限系統
// =========================================

let currentUserRole = null;

const ROLE_ADMIN = "admin";
const ROLE_STAFF = "staff";

const roleNames = {
    admin:"店長",
    staff:"員工"
};

const staffAllowedPages = new Set([
    "homePage",
    "adminLoginPage",
    "adminHomePage",
    "todayStatsPage",
    "salesHistoryPage",
    "orderDetailPage",
    "successPage"
]);

// =========================================
// 權限判斷
// =========================================
function isAdminRole(){
    return currentUserRole === ROLE_ADMIN;
}

function isStaffRole(){
    return currentUserRole === ROLE_STAFF;
}

function requireAdmin(message="此功能僅限店長使用"){

    if(isAdminRole()){
        return true;
    }

    playClick();
    alert("🔒 " + message);
    return false;
}

// =========================================
// 登入
// =========================================
window.loginAdmin = function(){

    const input =
    document.getElementById("adminLoginPassword");

    if(!input) return;

    const password = input.value;
    input.value = "";

    if(password === systemData.adminPassword){

        currentUserRole = ROLE_ADMIN;

    }else if(password === systemData.staffPassword){

        currentUserRole = ROLE_STAFF;

    }else{

        alert("❌ 密碼錯誤");
        return;

    }

    applyRolePermissions();

    showPage("adminHomePage");

};

// =========================================
// 登出
// =========================================
function logoutAdmin(){

    playClick();

    currentUserRole = null;

    applyRolePermissions();

    showPage("homePage");

}

// =========================================
// 保護換頁
// =========================================
const originalShowPageForRole = window.showPage;

window.showPage = function(pageId){

    if(
        isStaffRole() &&
        !staffAllowedPages.has(pageId)
    ){

        alert("🔒 員工帳號沒有此頁面權限");
        return;

    }

    originalShowPageForRole(pageId);

    setTimeout(
        applyRolePermissions,
        0
    );

};

// =========================================
// 後台首頁權限
// =========================================
function setButtonVisible(selector,visible){

    document
    .querySelectorAll(selector)
    .forEach(button=>{

        button.style.display =
        visible ? "" : "none";

    });

}

function updateRoleBadge(){

    const badge =
    document.getElementById("currentRoleBadge");

    if(!badge) return;

    if(!currentUserRole){

        if(badge.style.display !== "none"){

            badge.style.display = "none";

        }

        return;

    }

    const nextClass =
    `role-badge role-${currentUserRole}`;

    const nextText =
    currentUserRole === ROLE_ADMIN
    ? "👑 店長模式"
    : "👤 員工模式";

    if(badge.style.display !== "inline-flex"){

        badge.style.display = "inline-flex";

    }

    if(badge.className !== nextClass){

        badge.className = nextClass;

    }

    if(badge.textContent !== nextText){

        badge.textContent = nextText;

    }

}

// =========================================
// 套用角色權限
// =========================================
function applyRolePermissions(){

    updateRoleBadge();

    const adminOnlySelectors = [
        '#adminHomePage button[onclick*="openTicketManager"]',
        '#adminHomePage button[onclick*="openBusinessMode"]',
        '#adminHomePage button[onclick*="openSystemSetting"]',
        '#adminHomePage button[onclick*="openDataManager"]',
        '#adminHomePage button[onclick*="openHardwareTest"]'
    ];

    adminOnlySelectors.forEach(selector=>{
        setButtonVisible(
            selector,
            !isStaffRole()
        );
    });

    // 員工不可刪除售票紀錄
    setButtonVisible(
        ".deleteHistoryBtn",
        !isStaffRole()
    );

    // 員工不可作廢訂單
    setButtonVisible(
        ".cancelBtn",
        !isStaffRole()
    );

    document
    .querySelectorAll(".reprint-btn")
    .forEach(button=>{

        button.style.display = "";

    });

}

// =========================================
// 保護危險函式
// =========================================
function protectAdminFunction(functionName,message){

    const original =
    window[functionName];

    if(typeof original !== "function"){
        return;
    }

    window[functionName] = function(...args){

        if(!requireAdmin(message)){
            return;
        }

        return original.apply(
            this,
            args
        );

    };

}

[
    ["openTicketManager","票券管理僅限店長使用"],
    ["saveTicketManager","修改票券僅限店長使用"],
    ["resetTicketManager","恢復票券預設僅限店長使用"],

    ["openBusinessMode","營業模式僅限店長使用"],
    ["saveBusinessMode","修改營業模式僅限店長使用"],
    ["resetBusinessMode","恢復營業模式僅限店長使用"],

    ["openSystemSetting","系統設定僅限店長使用"],
    ["saveSystemSetting","修改系統設定僅限店長使用"],
    ["resetSystemSetting","恢復系統設定僅限店長使用"],

    ["openDataManager","資料管理僅限店長使用"],
    ["exportFullBackup","完整備份僅限店長使用"],
    ["chooseBackupFile","資料還原僅限店長使用"],
    ["clearAllAppData","清除資料僅限店長使用"],

    ["openHardwareTest","硬體測試僅限店長使用"],

    ["resetTodayStats","統計歸零僅限店長使用"],
    ["resetMonthStats","統計歸零僅限店長使用"],
    ["resetAllStats","統計歸零僅限店長使用"],

    ["deleteSalesHistory","刪除紀錄僅限店長使用"],
    ["cancelOrder","作廢訂單僅限店長使用"]
]
.forEach(item=>{

    protectAdminFunction(
        item[0],
        item[1]
    );

});

// 動態產生售票紀錄或訂單明細後重新套用權限
function observeRoleContainer(elementId){

    const element =
    document.getElementById(elementId);

    if(!element) return;

    const observer =
    new MutationObserver(()=>{

        applyRolePermissions();

    });

    observer.observe(
        element,
        {
            childList:true,
            subtree:true
        }
    );

}

observeRoleContainer("salesHistoryList");
observeRoleContainer("orderDetailContent");

applyRolePermissions();
