// V7 Phase 1 Legacy Build | js/config/state.js
// =========================================
// 小怪獸售票機 V6.5 Legacy R2
// 全域狀態（可安全重複載入）
// =========================================
var cart = window.cart || [];
window.cart = cart;
var currentPrintOrder = window.currentPrintOrder || null;
var isReprint = window.isReprint || false;
var idleTimer = window.idleTimer || null;
var countdownTimer = window.countdownTimer || null;
var selectedReward = window.selectedReward || "";
var selectedTicket = window.selectedTicket || "";
function loadStateObject(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch (error) {
        console.warn("State load failed:", key, error);
        return fallback;
    }
}
var todayStats = window.todayStats || loadStateObject("todayStats", {
    tickets: 0, income: 0, tokens: 0, greenToy: 0, redToy: 0, parent: 0
});
var monthStats = window.monthStats || loadStateObject("monthStats", {
    tickets: 0, income: 0, tokens: 0, greenToy: 0, redToy: 0, parent: 0
});
var totalStats = window.totalStats || loadStateObject("totalStats", {
    tickets: 0, income: 0, tokens: 0, greenToy: 0, redToy: 0, parent: 0
});
var salesHistory = window.salesHistory || loadStateObject("salesHistory", []);
window.currentPrintOrder = currentPrintOrder;
window.isReprint = isReprint;
window.idleTimer = idleTimer;
window.countdownTimer = countdownTimer;
window.selectedReward = selectedReward;
window.selectedTicket = selectedTicket;
window.todayStats = todayStats;
window.monthStats = monthStats;
window.totalStats = totalStats;
window.salesHistory = salesHistory;
function saveSalesHistory() {
    localStorage.setItem("salesHistory", JSON.stringify(salesHistory));
}
