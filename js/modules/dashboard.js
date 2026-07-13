// =========================================
// 小怪獸售票機 V6.2
// 後台 Dashboard
// =========================================

const dashboardDate =
document.getElementById("dashboardDate");

const dashboardIncome =
document.getElementById("dashboardIncome");

const dashboardTickets =
document.getElementById("dashboardTickets");

const dashboardCash =
document.getElementById("dashboardCash");

const dashboardLinePay =
document.getElementById("dashboardLinePay");

const dashboardOrders =
document.getElementById("dashboardOrders");

const dashboardCancelled =
document.getElementById("dashboardCancelled");

const dashboardRecentOrders =
document.getElementById("dashboardRecentOrders");

// =========================================
// 顯示金額
// =========================================
function formatDashboardAmount(value){

    return Number(value || 0)
    .toLocaleString("zh-TW");

}

// =========================================
// 最近訂單
// =========================================
function renderDashboardRecentOrders(){

    if(!dashboardRecentOrders) return;

    const recentOrders =
    (
        Array.isArray(salesHistory)
        ? salesHistory
        : []
    ).slice(0,5);

    if(recentOrders.length === 0){

        dashboardRecentOrders.innerHTML = `

<div class="dashboard-empty">
    目前沒有售票紀錄
</div>

`;

        return;

    }

    let html = "";

    recentOrders.forEach(order=>{

        const index =
        salesHistory.indexOf(order);

        const itemCount =
        Array.isArray(order.items)
        ? order.items.length
        : 0;

        const cancelled =
        order.status === "cancel";

        html += `

<button
    type="button"
    class="dashboard-order-row ${cancelled ? "cancelled" : ""}"
    onclick="playClick(); openOrderDetail(${index})">

    <div class="dashboard-order-main">

        <div class="dashboard-order-number">
            ${order.orderNo || "未編號"}
        </div>

        <div class="dashboard-order-meta">
            ${order.time || ""}・${order.payment || "未記錄"}・${itemCount} 張
        </div>

    </div>

    <div class="dashboard-order-right">

        <div class="dashboard-order-amount">
            NT$${formatDashboardAmount(order.amount)}
        </div>

        <div class="dashboard-order-status">
            ${cancelled ? "已作廢" : "正常"}
        </div>

    </div>

</button>

`;

    });

    dashboardRecentOrders.innerHTML =
    html;

}

// =========================================
// 更新 Dashboard
// =========================================
function renderAdminDashboard(){

    if(!dashboardIncome) return;

    const report =
    typeof calculateShiftReport === "function"
    ? calculateShiftReport()
    : {

        date:
        new Date().toLocaleDateString("zh-TW"),

        totalAmount:0,
        ticketCount:0,
        cashAmount:0,
        linePayAmount:0,
        normalOrderCount:0,
        cancelledOrderCount:0

    };

    if(dashboardDate){

        dashboardDate.textContent =
        `${report.date} 今日營運概況`;

    }

    dashboardIncome.textContent =
    `NT$${formatDashboardAmount(report.totalAmount)}`;

    dashboardTickets.textContent =
    `${report.ticketCount} 張`;

    dashboardCash.textContent =
    `NT$${formatDashboardAmount(report.cashAmount)}`;

    dashboardLinePay.textContent =
    `NT$${formatDashboardAmount(report.linePayAmount)}`;

    dashboardOrders.textContent =
    `${report.normalOrderCount} 筆`;

    dashboardCancelled.textContent =
    `${report.cancelledOrderCount} 筆`;

    renderDashboardRecentOrders();

}

// =========================================
// 回到後台首頁時自動更新
// =========================================
document.addEventListener("click",event=>{

    const button =
    event.target.closest(
        '[onclick*="adminHomePage"]'
    );

    if(!button) return;

    setTimeout(
        renderAdminDashboard,
        0
    );

});

window.addEventListener(
    "focus",
    renderAdminDashboard
);

renderAdminDashboard();
