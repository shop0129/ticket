// =========================================
// 小怪獸售票機 V5.6.4
// 售票紀錄模組
// =========================================

const salesHistoryList =
document.getElementById("salesHistoryList");

const orderDetailContent =
document.getElementById("orderDetailContent");

// =========================================
// 開啟售票紀錄
// =========================================
function openSalesHistory(){

    renderSalesHistory();

    showPage("salesHistoryPage");

}

// =========================================
// 金額格式
// =========================================
function formatHistoryAmount(value){

    return Number(value || 0)
        .toLocaleString("zh-TW");

}


// =========================================
// 售票紀錄搜尋條件
// =========================================
function getHistorySearchValues(){

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

    return {

        keyword:
        keywordInput
        ? keywordInput.value.trim().toLowerCase()
        : "",

        payment:
        paymentSelect
        ? paymentSelect.value
        : "all",

        status:
        statusSelect
        ? statusSelect.value
        : "all"

    };

}

function getFilteredSalesHistory(){

    const filters =
    getHistorySearchValues();

    return (
        Array.isArray(salesHistory)
        ? salesHistory
        : []
    )
    .map((order,index)=>({

        order,
        index

    }))
    .filter(entry=>{

        const order =
        entry.order;

        const searchableText = [

            order.orderNo,
            order.date,
            order.time,
            order.payment,
            order.amount,
            order.memberName,
            order.memberPhone,
            order.memberNo,

            ...(
                Array.isArray(order.items)
                ? order.items.map(item=>
                    item.title || item.id || ""
                )
                : []
            )

        ]
        .join(" ")
        .toLowerCase();

        const keywordMatched =
        !filters.keyword ||
        searchableText.includes(
            filters.keyword
        );

        const paymentMatched =
        filters.payment === "all" ||
        order.payment === filters.payment;

        const statusMatched =
        filters.status === "all" ||
        (
            filters.status === "normal" &&
            order.status !== "cancel"
        ) ||
        (
            filters.status === "cancel" &&
            order.status === "cancel"
        );

        return (
            keywordMatched &&
            paymentMatched &&
            statusMatched
        );

    });

}

// =========================================
// 顯示售票紀錄
// =========================================
function renderSalesHistory(){

    if(!salesHistoryList) return;

    if(
        !Array.isArray(salesHistory) ||
        salesHistory.length === 0
    ){

        salesHistoryList.innerHTML = `

<div class="history-empty-card">

    <div class="history-empty-icon">
        🧾
    </div>

    <div class="history-empty-title">
        目前沒有售票紀錄
    </div>

    <div class="history-empty-text">
        完成售票後，訂單會顯示在這裡
    </div>

</div>

`;

        return;

    }

    const filteredHistory =
    getFilteredSalesHistory();

    if(filteredHistory.length === 0){

        salesHistoryList.innerHTML = `

<div class="history-empty-card">

    <div class="history-empty-icon">
        🔍
    </div>

    <div class="history-empty-title">
        找不到符合條件的訂單
    </div>

    <div class="history-empty-text">
        請調整搜尋關鍵字或篩選條件
    </div>

</div>

`;

        return;

    }

    let html = "";

    filteredHistory.forEach(({order,index})=>{

        const isCancelled =
            order.status === "cancel";

        const itemCount =
            Array.isArray(order.items)
            ? order.items.length
            : 0;

        html += `

<div
    class="historyCard ${isCancelled ? "history-cancelled" : ""}"
    onclick="openOrderDetail(${index})">

    <div class="history-card-header">

        <div>

            <div class="history-time">
                🕒 ${order.date || ""} ${order.time || ""}
            </div>

            <div class="historyOrderNo">
                🆔 ${order.orderNo || "未編號"}
            </div>

        </div>

        <div class="history-status-area">

            <div class="history-payment">
                💳 ${order.payment || "未記錄"}
            </div>

            ${
                order.memberId
                ? `
                <div class="history-member-badge">
                    👤 ${order.memberName || "會員"}
                </div>
                `
                : ""
            }

            ${
                isCancelled
                ? `<div class="cancelBadge">❌ 已作廢</div>`
                : `<div class="normalBadge">🟢 正常</div>`
            }

        </div>

    </div>

    <div class="history-card-body">

        <div class="history-item-count">
            🎫 共 ${itemCount} 張票券
        </div>

        <div class="historyAmount">
            NT$${formatHistoryAmount(order.amount)}
        </div>

    </div>

    <div class="history-card-footer">

        <button
            type="button"
            class="history-detail-btn"
            onclick="event.stopPropagation(); playClick(); openOrderDetail(${index})">
            查看明細
        </button>

        <button
            type="button"
            class="deleteHistoryBtn"
            onclick="deleteSalesHistory(event,${index})">
            🗑️ 刪除紀錄
        </button>

    </div>

</div>

`;

    });

    salesHistoryList.innerHTML = html;

}

// =========================================
// 刪除售票紀錄
// =========================================
function deleteSalesHistory(clickEvent,index){

    if(clickEvent){

        clickEvent.stopPropagation();

    }

    playClick();

    if(!confirm("確定要刪除這筆售票紀錄？")){

        return;

    }

    if(
        !Array.isArray(salesHistory) ||
        index < 0 ||
        index >= salesHistory.length
    ){

        return;

    }

    salesHistory.splice(index,1);

    saveSalesHistory();

    renderSalesHistory();

}

// =========================================
// 整理訂單內容
// =========================================
function summarizeOrderItems(order){

    const items =
        Array.isArray(order.items)
        ? order.items
        : [];

    const groupedItems = {};

    let totalToken = 0;
    let greenToy = 0;
    let redToy = 0;

    items.forEach(item=>{

        if(!item) return;

        const itemId =
            item.id ||
            item.title ||
            "unknown";

        if(!groupedItems[itemId]){

            groupedItems[itemId] = {

                title:
                    item.title ||
                    "未命名票券",

                qty:0,

                totalPrice:0

            };

        }

        groupedItems[itemId].qty++;

        groupedItems[itemId].totalPrice +=
            Number(item.price || 0);

        totalToken +=
            Number(item.token || 0);

        if(item.toy === "green"){

            greenToy++;

        }

        if(item.toy === "red"){

            redToy++;

        }

    });

    return {

        groupedItems,

        totalToken,

        greenToy,

        redToy

    };

}

// =========================================
// 產生購買內容
// =========================================
function renderOrderItemRows(groupedItems){

    let html = "";

    for(const id in groupedItems){

        const item =
            groupedItems[id];

        html += `

<div class="detailItem">

    <span class="detail-item-name">
        🎫 ${item.title} × ${item.qty}
    </span>

    <span class="detailItemPrice">
        NT$${formatHistoryAmount(item.totalPrice)}
    </span>

</div>

`;

    }

    if(html === ""){

        html = `

<div class="history-detail-empty">
    無購買內容
</div>

`;

    }

    return html;

}

// =========================================
// 產生贈送內容
// =========================================
function renderOrderRewardRows(
    totalToken,
    greenToy,
    redToy
){

    let html = `

<div class="detailRow">
    🪙 遊戲代幣：${formatHistoryAmount(totalToken)} 枚
</div>

`;

    if(greenToy > 0){

        html += `

<div class="detailRow">
    🟢 綠標玩具：${greenToy} 個
</div>

`;

    }

    if(redToy > 0){

        html += `

<div class="detailRow">
    🔴 紅標玩具：${redToy} 個
</div>

`;

    }

    if(
        totalToken === 0 &&
        greenToy === 0 &&
        redToy === 0
    ){

        html = `

<div class="detailRow">
    無贈送內容
</div>

`;

    }

    return html;

}

// =========================================
// 開啟訂單明細
// =========================================
function openOrderDetail(index){

    const order =
        salesHistory[index];

    if(!order) return;

    const summary =
        summarizeOrderItems(order);

    const htmlItems =
        renderOrderItemRows(
            summary.groupedItems
        );

    const htmlRewards =
        renderOrderRewardRows(
            summary.totalToken,
            summary.greenToy,
            summary.redToy
        );

    const isCancelled =
        order.status === "cancel";

    const html = `

<div class="detailCard order-detail-card">

    <div class="order-detail-header">

        <div>

            <div class="detailTitle">
                🆔 ${order.orderNo || "未編號"}
            </div>

            <div class="detailRow">
                🕒 ${order.date || ""} ${order.time || ""}
            </div>

            <div class="detailRow">
                💳 ${order.payment || "未記錄"}
            </div>

        </div>

        ${
            isCancelled
            ? `<div class="cancelBadge detail-status-badge">❌ 已作廢</div>`
            : `<div class="normalBadge detail-status-badge">🟢 正常</div>`
        }

    </div>

    ${
        order.memberId
        ? `
        <div class="order-member-section">

            <div class="order-member-title">
                👤 會員資料
            </div>

            <div class="order-member-grid">

                <div>
                    <span>姓名</span>
                    <strong>${order.memberName || ""}</strong>
                </div>

                <div>
                    <span>手機</span>
                    <strong>${order.memberPhone || ""}</strong>
                </div>

                <div>
                    <span>會員編號</span>
                    <strong>${order.memberNo || ""}</strong>
                </div>

            </div>

        </div>
        `
        : `
        <div class="order-nonmember-badge">
            非會員交易
        </div>
        `
    }

    <div class="order-detail-section">

        <h3>
            🎫 購買內容
        </h3>

        ${htmlItems}

    </div>

    <div class="order-detail-section">

        <h3>
            🎁 贈送內容
        </h3>

        ${htmlRewards}

    </div>

    <div class="order-detail-total">

        <div class="order-detail-total-label">
            訂單金額
        </div>

        <div class="detailPrice">
            NT$${formatHistoryAmount(order.amount)}
        </div>

    </div>

    <div id="toyPointOrderPanel"></div>

    <div class="detailButtons">

        <button
            type="button"
            class="big-btn reprint-btn"
            ${isCancelled
                ? "disabled"
                : `onclick="reprintOrder('${order.orderNo}')"`}>

            ${
                isCancelled
                ? "🚫 已作廢不可補印"
                : "🖨️ 補印票券"
            }

        </button>

        <button
            type="button"
            class="big-btn cancelBtn"
            ${isCancelled
                ? "disabled"
                : `onclick="cancelOrder('${order.orderNo}')"`}>

            ${
                isCancelled
                ? "✅ 已作廢"
                : "❌ 作廢訂單"
            }

        </button>

    </div>

</div>

`;

    if(orderDetailContent){

        orderDetailContent.innerHTML = html;

    }

    if(
        typeof renderToyPointOrderPanel ===
        "function"
    ){

        renderToyPointOrderPanel(
            order.orderNo
        );

    }

    showPage("orderDetailPage");

}

// =========================================
// 補印票券
// =========================================
function reprintOrder(orderNo){

    playClick();

    const order =
        salesHistory.find(
            item =>
            item.orderNo === orderNo
        );

    if(!order) return;

    isReprint = true;

    currentPrintOrder = order;

    showPage("successPage");

    updateSuccessItems();

    startPrintAnimation();

}

// =========================================
// 作廢訂單
// =========================================
function cancelOrder(orderNo){

    playClick();

    const order =
        salesHistory.find(
            item =>
            item.orderNo === orderNo
        );

    if(!order) return;

    if(order.status === "cancel"){

        alert("此訂單已經作廢！");

        return;

    }

    if(!confirm("確定要作廢這筆訂單？")){

        return;

    }

    if(
        typeof canRollbackMemberOrder ===
        "function" &&
        !canRollbackMemberOrder(order)
    ){

        return;

    }

    order.status = "cancel";

    if(
        typeof rollbackMemberPurchase ===
        "function"
    ){

        rollbackMemberPurchase(order);

    }

    const items =
        Array.isArray(order.items)
        ? order.items
        : [];

    items.forEach(item=>{

        rollbackStats(
            todayStats,
            item,
            item
        );

        rollbackStats(
            monthStats,
            item,
            item
        );

        rollbackStats(
            totalStats,
            item,
            item
        );

    });

    saveTodayStats();

    saveSalesHistory();

    alert("✅ 訂單已作廢");

    const index =
        salesHistory.findIndex(
            item =>
            item.orderNo === orderNo
        );

    openOrderDetail(index);

}
