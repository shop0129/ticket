let cart = [];

// 目前列印中的訂單
let currentPrintOrder = null;

// 是否為補印模式
let isReprint = false;

// 閒置計時
let idleTimer;
let countdownTimer;

// 目前選擇票券
let selectedReward = "";
let selectedTicket = "";
let todayStats = JSON.parse(
    localStorage.getItem("todayStats")
) || {

    tickets:0,

    income:0,

    tokens:0,

    greenToy:0,

    redToy:0,

    parent:0

};
let monthStats = JSON.parse(
    localStorage.getItem("monthStats")
) || {

    tickets:0,
    income:0,
    tokens:0,
    greenToy:0,
    redToy:0,
    parent:0

};

let totalStats = JSON.parse(
    localStorage.getItem("totalStats")
) || {

    tickets:0,
    income:0,
    tokens:0,
    greenToy:0,
    redToy:0,
    parent:0

};
let salesHistory = JSON.parse(

    localStorage.getItem("salesHistory")

) || [];

function saveSalesHistory(){

    localStorage.setItem(

        "salesHistory",

        JSON.stringify(salesHistory)

    );

}
