// =========================================
// Monster Ticket V5
// state.js
// 全域狀態
// =========================================

// 購物車
let cart = [];

// 目前選擇票券
let selectedTicket = "";
let selectedReward = "";

// 列印
let currentPrintOrder = null;
let isReprint = false;

// Timer
let idleTimer = null;
let countdownTimer = null;

// 今日統計
let todayStats =
JSON.parse(localStorage.getItem("todayStats")) || {

    tickets:0,
    income:0,
    tokens:0,
    greenToy:0,
    redToy:0,
    parent:0

};

// 本月統計
let monthStats =
JSON.parse(localStorage.getItem("monthStats")) || {

    tickets:0,
    income:0,
    tokens:0,
    greenToy:0,
    redToy:0,
    parent:0

};

// 累積統計
let totalStats =
JSON.parse(localStorage.getItem("totalStats")) || {

    tickets:0,
    income:0,
    tokens:0,
    greenToy:0,
    redToy:0,
    parent:0

};

// 售票紀錄
let salesHistory =
JSON.parse(localStorage.getItem("salesHistory")) || [];
