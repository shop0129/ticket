// 售票紀錄
//==========================

function openSalesHistory(){

    renderSalesHistory();//==========================
// 售票紀錄
//==========================

function openSalesHistory(){

    renderSalesHistory();

    showPage("salesHistoryPage");

}

//==========================
// 顯示售票紀錄
//==========================

function renderSalesHistory(){

    const list =
        document.getElementById("salesHistoryList");

    if(!list) return;

    if(!Array.isArray(salesHistory) || salesHistory.length === 0){

        list.innerHTML = `

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

    let html = "";

    salesHistory.forEach((order,index)=>{

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
            onclick="event.stopPropagation(); openOrderDetail(${index})">
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

    list.innerHTML = html;

}

//==========================
// 金額格式
//==========================

function formatHistoryAmount(value){

    return Number(value || 0)
        .toLocaleString("zh-TW");

}

//==========================
// 刪除售票紀錄
//==========================

function deleteSalesHistory(clickEvent,index){

    if(clickEvent){

        clickEvent.stopPropagation();

    }

    if(!confirm("確定要刪除這筆售票紀錄？")){

        return;

    }

    salesHistory.splice(index,1);

    saveSalesHistory();

    renderSalesHistory();

}

//==========================
// 開啟訂單明細
//==========================

function openOrderDetail(index){

    const order =
        salesHistory[index];

    if(!order) return;

    const items =
        Array.isArray(order.items)
        ? order.items
        : [];

    let totalToken = 0;
    let greenToy = 0;
    let redToy = 0;

    const groupedItems = {};

    items.forEach(item=>{

        const itemId =
            item.id || item.title || "unknown";

        if(!groupedItems[itemId]){

            groupedItems[itemId] = {

                title:item.title || "未命名票券",

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

    let htmlItems = "";

    for(const id in groupedItems){

        const item =
            groupedItems[id];

        htmlItems += `

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

    if(!htmlItems){

        htmlItems = `

<div class="history-detail-empty">
    無購買內容
</div>

`;

    }

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

        <div class="detailRow">
            🪙 遊戲代幣：${formatHistoryAmount(totalToken)} 枚
        </div>

        ${
            greenToy > 0
            ? `
<div class="detailRow">
    🟢 綠標玩具：${greenToy} 個
</div>
`
            : ""
        }

        ${
            redToy > 0
            ? `
<div class="detailRow">
    🔴 紅標玩具：${redToy} 個
</div>
`
            : ""
        }

        ${
            totalToken === 0 &&
            greenToy === 0 &&
            redToy === 0
            ? `
<div class="detailRow">
    無贈送內容
</div>
`
            : ""
        }

    </div>

    <div class="order-detail-total">

        <div class="order-detail-total-label">
            訂單金額
        </div>

        <div class="detailPrice">
            NT$${formatHistoryAmount(order.amount)}
        </div>

    </div>

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

    const content =
        document.getElementById("orderDetailContent");

    if(content){

        content.innerHTML = html;

    }

    showPage("orderDetailPage");

}

//==========================
// 補印票券
//==========================

function reprintOrder(orderNo){

    isReprint = true;

    const order =
        salesHistory.find(
            item => item.orderNo === orderNo
        );

    if(!order) return;

    currentPrintOrder = order;

    showPage("successPage");

    updateSuccessItems();

    startPrintAnimation();

}

//==========================
// 作廢訂單
//==========================

function cancelOrder(orderNo){

    const order =
        salesHistory.find(
            item => item.orderNo === orderNo
        );

    if(!order) return;

    if(order.status === "cancel"){

        alert("此訂單已經作廢！");

        return;

    }

    if(!confirm("確定要作廢這筆訂單？")){

        return;

    }

    order.status = "cancel";

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
            item => item.orderNo === orderNo
        );

    openOrderDetail(index);

}

    showPage("salesHistoryPage");

}

function renderSalesHistory(){

    const list = document.getElementById("salesHistoryList");

    if(salesHistory.length===0){

        list.innerHTML=`
            <div class="emptyHistory">
                目前沒有售票紀錄
            </div>
        `;

        return;

    }

    let html="";

    salesHistory.forEach((order,index)=>{

        html+=`

        <div
    class="historyCard"
    onclick="openOrderDetail(${index})">

            <div class="historyTop">

                <span>${order.time}</span>

                <span>${order.payment}</span>

            </div>
${order.status==="cancel"
? `<div class="cancelBadge">❌ 已作廢</div>`
: ""}
            <div class="historyAmount">

                NT$${order.amount}

            </div>

            <div class="historyOrderNo">

                ${order.orderNo}

            </div>
<button
    class="deleteHistoryBtn"
    onclick="event.stopPropagation(); deleteSalesHistory(${index})">

    🗑️ 刪除紀錄

</button>
        </div>

        `;

    });

    list.innerHTML=html;

}
function deleteSalesHistory(index){

    if(!confirm("確定要刪除這筆售票紀錄？")){

        return;

    }

    salesHistory.splice(index,1);

    saveSalesHistory();

    renderSalesHistory();

}
function openOrderDetail(index){

    const order = salesHistory[index];

    if(!order){
        return;
    }

    let totalToken = 0;
    let greenToy = 0;
    let redToy = 0;

    const groupedItems = {};

    //==========================
    // 整理購買內容
    //==========================
    order.items.forEach(item=>{

        if(!groupedItems[item.id]){

            groupedItems[item.id]={

                title:item.title,

                qty:0,

                totalPrice:0

            };

        }

        groupedItems[item.id].qty++;

        groupedItems[item.id].totalPrice += Number(item.price||0);

        totalToken += Number(item.token||0);

        if(item.toy==="green"){

            greenToy++;

        }

        if(item.toy==="red"){

            redToy++;

        }

    });

    //==========================
    // 購買內容HTML
    //==========================

    let htmlItems="";

    for(const id in groupedItems){

        const item = groupedItems[id];

        htmlItems += `

        <div class="detailItem">

            <span>
                🎫 ${item.title} × ${item.qty}
            </span>

            <span class="detailItemPrice">
                NT$${item.totalPrice}
            </span>

        </div>

        `;

    }

    //==========================
    // 明細HTML
    //==========================

    const html=`

    <div class="detailCard">

<div class="detailTitle">

    🆔 ${order.orderNo}

</div>

${order.status==="cancel"
? `
<div class="cancelBadge">
    ❌ 已作廢
</div>
`
: ""}

        <div class="detailRow">

            🕒 ${order.date} ${order.time}

        </div>

        <div class="detailRow">

            💳 ${order.payment}

        </div>

        <hr>

        <h3>🎫 購買內容</h3>

        ${htmlItems}

        <hr>

        <h3>🎁 贈送內容</h3>

        <div class="detailRow">

            🪙 遊戲代幣：${totalToken} 枚

        </div>

        ${greenToy>0?`
        <div class="detailRow">
            🎁 綠標玩具 × ${greenToy}
        </div>
        `:""}

        ${redToy>0?`
        <div class="detailRow">
            🎁 紅標玩具 × ${redToy}
        </div>
        `:""}

        <hr>

        <div class="detailPrice">

            NT$${order.amount}

        </div>

        <div class="detailButtons">

           <button
    class="big-btn"
    ${order.status==="cancel"
        ? "disabled"
        : `onclick="reprintOrder('${order.orderNo}')"`}>

    ${order.status==="cancel"
        ? "🚫 已作廢不可補印"
        : "🖨️ 補印票券"}

</button>
<button
    class="big-btn cancelBtn"
    ${order.status==="cancel"
        ? "disabled"
        : `onclick="cancelOrder('${order.orderNo}')"`}>

    ${order.status==="cancel"
        ? "✅ 已作廢"
        : "❌ 作廢訂單"}

</button>
        </div>

    </div>

    `;

    document.getElementById("orderDetailContent").innerHTML=html;

    showPage("orderDetailPage");

}
function reprintOrder(orderNo){
    
isReprint = true;
    const order = salesHistory.find(
        x => x.orderNo === orderNo
    );

    if(!order){

        return;

    }

currentPrintOrder = order;
showPage("successPage");
updateSuccessItems();
startPrintAnimation();
    }
function cancelOrder(orderNo){

    const order = salesHistory.find(
        x => x.orderNo === orderNo
    );

    if(!order){

        return;

    }

    if(order.status==="cancel"){

        alert("此訂單已經作廢！");

        return;

    }

    if(!confirm("確定要作廢這筆訂單？")){

        return;

    }

    order.status = "cancel";

order.items.forEach(item=>{

    rollbackStats(todayStats, item, item);

    rollbackStats(monthStats, item, item);

    rollbackStats(totalStats, item, item);

});

// 儲存統計
saveTodayStats();

// 儲存售票紀錄
saveSalesHistory();

alert("✅ 訂單已作廢");

    openOrderDetail(
        salesHistory.findIndex(
            x => x.orderNo === orderNo
        )
    );

}
