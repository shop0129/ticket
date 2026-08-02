// V7 Phase 1 Legacy Build | js/utils/storage.js
function saveTodayStats() {
    localStorage.setItem("todayStats", JSON.stringify(todayStats));
    localStorage.setItem("monthStats", JSON.stringify(monthStats));
    localStorage.setItem("totalStats", JSON.stringify(totalStats));
}
// =========================================
// 小怪獸售票機 V5.6.6
// Storage Module
// =========================================
function saveTicketData() {
    localStorage.setItem("ticketData", JSON.stringify(ticketData));
}
function saveSalesHistory() {
    localStorage.setItem(
        "salesHistory",
        JSON.stringify(salesHistory)
    );

    window.salesHistory = salesHistory;

    if(
        window.MonsterOrderCloud &&
        typeof window.MonsterOrderCloud.onLocalSave ===
        "function"
    ){
        window.MonsterOrderCloud.onLocalSave(
            salesHistory
        );
    }
}
function saveSystemSetting() {
    localStorage.setItem("systemData", JSON.stringify(systemData));
}
// 舊版 V5.6 的 businessData 已停用。名稱不可再使用 saveBusinessMode，
// 避免覆蓋 V7.8 Business Mode Engine 的正式儲存函式。
function saveLegacyBusinessData() {
    if (typeof businessData !== "undefined") {
        localStorage.setItem("businessData", JSON.stringify(businessData));
    }
}
function loadStorage(key, defaultValue) {
    try {
        var value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    }
    catch (e) {
        console.warn("Storage parse error:", key, e);
        return defaultValue;
    }
}
