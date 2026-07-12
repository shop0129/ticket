// 售票紀錄
//==========================

function openSalesHistory(){

    renderSalesHistory();

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
