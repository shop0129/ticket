// =========================================
// 小怪獸售票機 V6.1A
// 交易流程優化
// =========================================

const shiftReportContent =
document.getElementById("shiftReportContent");

// =========================================
// 今日日期
// =========================================
function getOperationTodayDate(){

    return new Date()
    .toLocaleDateString("zh-TW");

}

// =========================================
// 取得今日訂單
// =========================================
function getTodaySalesOrders(){

    const today =
    getOperationTodayDate();

    return (
        Array.isArray(salesHistory)
        ? salesHistory
        : []
    ).filter(order=>{

        return order.date === today;

    });

}

// =========================================
// 計算交班報表
// =========================================
function calculateShiftReport(){

    const orders =
    getTodaySalesOrders();

    const normalOrders =
    orders.filter(order=>
        order.status !== "cancel"
    );

    const cancelledOrders =
    orders.filter(order=>
        order.status === "cancel"
    );

    let cashAmount = 0;
    let linePayAmount = 0;
    let otherAmount = 0;
    let ticketCount = 0;
    let tokenCount = 0;
    let greenToy = 0;
    let redToy = 0;
    let parentCount = 0;

    normalOrders.forEach(order=>{

        const amount =
        Number(order.amount || 0);

        if(order.payment === "現金"){

            cashAmount += amount;

        }else if(order.payment === "LINE Pay"){

            linePayAmount += amount;

        }else{

            otherAmount += amount;

        }

        const items =
        Array.isArray(order.items)
        ? order.items
        : [];

        ticketCount +=
        items.length;

        items.forEach(item=>{

            tokenCount +=
            Number(item.token || 0);

            if(item.id === "token10"){

                tokenCount += 10;

            }

            if(item.id === "token25"){

                tokenCount += 25;

            }

            if(item.toy === "green"){

                greenToy++;

            }

            if(item.toy === "red"){

                redToy++;

            }

            if(item.id === "parent"){

                parentCount++;

            }

        });

    });

    return {

        date:getOperationTodayDate(),

        normalOrderCount:
        normalOrders.length,

        cancelledOrderCount:
        cancelledOrders.length,

        ticketCount,

        cashAmount,

        linePayAmount,

        otherAmount,

        totalAmount:
        cashAmount +
        linePayAmount +
        otherAmount,

        tokenCount,

        greenToy,

        redToy,

        parentCount

    };

}

// =========================================
// 金額格式
// =========================================
function formatOperationAmount(value){

    return Number(value || 0)
    .toLocaleString("zh-TW");

}

// =========================================
// 開啟交班報表
// =========================================
function openShiftReport(){

    renderShiftReport();

    showPage("shiftReportPage");

}

// =========================================
// 顯示交班報表
// =========================================
function renderShiftReport(){

    if(!shiftReportContent) return;

    const report =
    calculateShiftReport();

    shiftReportContent.innerHTML = `

<div class="shift-report-card">

    <div class="shift-report-header">

        <div>

            <div class="shift-report-title">
                📋 今日交班報表
            </div>

            <div class="shift-report-date">
                ${report.date}
            </div>

        </div>

        <div class="shift-report-order-count">
            正常訂單 ${report.normalOrderCount} 筆
        </div>

    </div>

    <div class="shift-summary-grid">

        <div class="shift-summary-card shift-total-card">

            <div class="shift-summary-label">
                今日總收入
            </div>

            <div class="shift-summary-value">
                NT$${formatOperationAmount(report.totalAmount)}
            </div>

        </div>

        <div class="shift-summary-card">

            <div class="shift-summary-label">
                現金收入
            </div>

            <div class="shift-summary-value">
                NT$${formatOperationAmount(report.cashAmount)}
            </div>

        </div>

        <div class="shift-summary-card">

            <div class="shift-summary-label">
                LINE Pay
            </div>

            <div class="shift-summary-value">
                NT$${formatOperationAmount(report.linePayAmount)}
            </div>

        </div>

        <div class="shift-summary-card">

            <div class="shift-summary-label">
                其他付款
            </div>

            <div class="shift-summary-value">
                NT$${formatOperationAmount(report.otherAmount)}
            </div>

        </div>

    </div>

    <div class="shift-detail-grid">

        <div class="shift-detail-item">
            <span>🎫 售出票券</span>
            <strong>${report.ticketCount} 張</strong>
        </div>

        <div class="shift-detail-item">
            <span>🧾 正常訂單</span>
            <strong>${report.normalOrderCount} 筆</strong>
        </div>

        <div class="shift-detail-item">
            <span>❌ 作廢訂單</span>
            <strong>${report.cancelledOrderCount} 筆</strong>
        </div>

        <div class="shift-detail-item">
            <span>🪙 應發代幣</span>
            <strong>${report.tokenCount} 枚</strong>
        </div>

        <div class="shift-detail-item">
            <span>🟢 綠標玩具</span>
            <strong>${report.greenToy} 個</strong>
        </div>

        <div class="shift-detail-item">
            <span>🔴 紅標玩具</span>
            <strong>${report.redToy} 個</strong>
        </div>

        <div class="shift-detail-item">
            <span>👨 陪同票</span>
            <strong>${report.parentCount} 張</strong>
        </div>

    </div>

    <div class="shift-report-actions">

        <button
            class="big-btn shift-refresh-btn"
            onclick="playClick(); renderShiftReport()">
            🔄 重新計算
        </button>

        <button
            class="big-btn shift-print-btn"
            onclick="printShiftReport()">
            🖨️ 列印報表
        </button>

    </div>

</div>

`;

}

// =========================================
// 列印交班報表
// =========================================
function printShiftReport(){

    playClick();

    renderShiftReport();

    window.print();

}

// =========================================
// 一鍵補印最近一筆
// =========================================
function reprintLatestOrder(){

    playClick();

    const latestOrder =
    (
        Array.isArray(salesHistory)
        ? salesHistory
        : []
    ).find(order=>
        order.status !== "cancel"
    );

    if(!latestOrder){

        alert("目前沒有可補印的正常訂單");

        return;

    }

    const confirmed =
    confirm(
        `確定補印最近一筆訂單？\n\n訂單編號：${latestOrder.orderNo}\n金額：NT$${formatOperationAmount(latestOrder.amount)}`
    );

    if(!confirmed) return;

    reprintOrder(
        latestOrder.orderNo
    );

}

// =========================================
// 售票紀錄搜尋
// =========================================
function refreshHistorySearch(){

    renderSalesHistory();

}

function clearHistorySearch(){

    playClick();

    const keywordInput =
    document.getElementById(
        "historySearchInput"
    );

    const paymentSelect =
    document.getElementById(
        "historyPaymentFilter"
    );

    const statusSelect =
    document.getElementById(
        "historyStatusFilter"
    );

    if(keywordInput){

        keywordInput.value = "";

    }

    if(paymentSelect){

        paymentSelect.value = "all";

    }

    if(statusSelect){

        statusSelect.value = "all";

    }

    renderSalesHistory();

}

const historySearchInput =
document.getElementById(
    "historySearchInput"
);

const historyPaymentFilter =
document.getElementById(
    "historyPaymentFilter"
);

const historyStatusFilter =
document.getElementById(
    "historyStatusFilter"
);

if(historySearchInput){

    historySearchInput.addEventListener(
        "input",
        refreshHistorySearch
    );

}

if(historyPaymentFilter){

    historyPaymentFilter.addEventListener(
        "change",
        refreshHistorySearch
    );

}

if(historyStatusFilter){

    historyStatusFilter.addEventListener(
        "change",
        refreshHistorySearch
    );

}
