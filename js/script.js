// =========================
// 票價設定
// =========================

let ticketData =
JSON.parse(localStorage.getItem("ticketData")) || {

    ticket2hGreen:{
    title:"2H 小怪獸",
    price:250,
    hour:2,
    token:10,
    toy:"green",
    reward:"token,band,toy",
    enable:true

       },

ticket2hRed:{
    title:"2H 小怪獸 Plus",
    price:300,
    hour:2,
    token:15,
    toy:"red",
    reward:"token,band,toy",
    enable:true
},

    ticket3hGreen:{
        title:"3H 大怪獸",
        price:300,
        hour:3,
        token:15,
        toy:"green",
        reward:"token,band,toy",
enable:true
   
    },

    ticket3hRed:{
        title:"3H 大怪獸 Plus",
        price:350,
        hour:3,
        token:20,
        toy:"red",
        reward:"token,band,toy",
enable:true
   
    },

   early:{
    title:"平日早鳥",
    price:300,
    token:15,
    toy:"red",
    reward:"token,band,toy",
enable:true
   
},

    summer:{
    title:"寒暑假限定",
    price:350,
    token:20,
    toy:"red",
    reward:"token,band,toy",
enable:true
},

    baby:{
    title:"幼幼票",
    price:100,
    reward:"band",
        enable:true
},

    parent:{
    title:"陪同票",
    price:80,
    reward:"band",
        enable:true
},

    token10:{
    title:"10枚代幣",
    price:100,
    reward:"token10",
        enable:true
},

    token25:{
    title:"25枚代幣",
    price:200,
    reward:"token25",
        enable:true
},

    powerbank:{
    title:"行動電源",
    price:50,
    reward:"powerbank",
        enable:true
},

};
if (!ticketData.early.token) {
    ticketData.early.token = 15;
    ticketData.early.toy = "red";
}

if (!ticketData.summer.token) {
    ticketData.summer.token = 20;
    ticketData.summer.toy = "red";
}
// ===== 補上 enable 預設值 =====

for(const id in ticketData){

    if(ticketData[id].enable === undefined){

        ticketData[id].enable = true;

    }

}
console.log(JSON.stringify(ticketData, null, 2));
localStorage.setItem(
    "ticketData",
    JSON.stringify(ticketData)
);
// ==========================
// V3.9 購物車
// ==========================

// =========================================
// 全域狀態
// =========================================

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
// =========================================
// V4.0 今日統計
// =========================================

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
function saveTodayStats(){

    localStorage.setItem(
        "todayStats",
        JSON.stringify(todayStats)
    );

    localStorage.setItem(
        "monthStats",
        JSON.stringify(monthStats)
    );

    localStorage.setItem(
        "totalStats",
        JSON.stringify(totalStats)
    );

}
// =========================================
// 更新統計
// =========================================

function updateStats(stats, ticket, item){

    stats.tickets++;

    stats.income += ticket.price;

    stats.tokens += ticket.token || 0;

    if(ticket.toy==="green"){

        stats.greenToy++;

    }

    if(ticket.toy==="red"){

        stats.redToy++;

    }

    if(item.id==="parent"){

        stats.parent++;

    }

}
// =========================================
// 扣回統計（作廢訂單）
// =========================================

function rollbackStats(stats, ticket, item){

    stats.tickets = Math.max(0, stats.tickets - 1);

    stats.income = Math.max(0, stats.income - ticket.price);

    stats.tokens = Math.max(0, stats.tokens - (ticket.token || 0));

    if(ticket.toy === "green"){

        stats.greenToy = Math.max(0, stats.greenToy - 1);

    }

    if(ticket.toy === "red"){

        stats.redToy = Math.max(0, stats.redToy - 1);

    }

    if(item.id === "parent"){

        stats.parent = Math.max(0, stats.parent - 1);

    }

}
// =========================================
// V4.2 售票紀錄
// =========================================

let salesHistory = JSON.parse(

    localStorage.getItem("salesHistory")

) || [];

function saveSalesHistory(){

    localStorage.setItem(

        "salesHistory",

        JSON.stringify(salesHistory)

    );

}
// =========================================
// 建立售票紀錄
// =========================================

function saveSalesRecord(paymentType,totalAmount){

    const now = new Date();

    const order={

        orderNo: generateOrderNo(),

        date:now.toLocaleDateString("zh-TW"),

        time:now.toLocaleTimeString("zh-TW",{

            hour:"2-digit",

            minute:"2-digit"

        }),

        payment:paymentType,

       amount: Number(totalAmount) || 0,

       items:

cart.length>0

? JSON.parse(JSON.stringify(cart))

: [{

    id:selectedTicket,

    title:ticketData[selectedTicket].title,

    price:ticketData[selectedTicket].price,

    token:ticketData[selectedTicket].token || 0,

    toy:ticketData[selectedTicket].toy || "none",

    reward:ticketData[selectedTicket].reward || ""

}],

    status:"normal"

    };

    currentPrintOrder = order;

salesHistory.unshift(order);

    saveSalesHistory();

}
function generateOrderNo(){

    let orderIndex = Number(localStorage.getItem("orderIndex")) || 1;

    const now = new Date();

    const y = now.getFullYear();

    const m = String(now.getMonth()+1).padStart(2,"0");

    const d = String(now.getDate()).padStart(2,"0");

    const orderNo =
        "M" +
        y +
        m +
        d +
        String(orderIndex).padStart(4,"0");

    localStorage.setItem("orderIndex", orderIndex + 1);

    return orderNo;

}
function playClick(){

    const click = document.getElementById("clickSound");

    click.pause();

    click.currentTime = 0;

    click.play().catch(function(){});

}
// =========================================
// 共用付款按鈕
// =========================================

function bindPaymentButton(button, paymentType){

    button.addEventListener("click",()=>{

        playClick();

        paymentSuccess(paymentType);

    });

}
document
.getElementById("startBtn")
.addEventListener("click",()=>{

    playClick();

    setTimeout(()=>{

        showPage("ticketPage");

    },100);

});
// ==========================
// 小怪獸放電所 售票機 V3.6
// ==========================

// --------------------------
// 取得元件
// --------------------------

const detailImage = document.getElementById("detailImage");
const detailTitle = document.getElementById("detailTitle");
const detailPrice = document.getElementById("detailPrice");
const detailInfo = document.getElementById("detailInfo");

const countdownNumber = document.getElementById("countdownNumber");
const successTip =
document.getElementById("successTip");

const linePayBtn = document.getElementById("linePayBtn");
const cashBtn = document.getElementById("cashBtn");

// --------------------------
// 換頁
// --------------------------

function showPage(pageId){

    clearInterval(countdownTimer);

    document.querySelectorAll(".page").forEach(page=>{

        page.classList.remove("active");

    });

    document
        .getElementById(pageId)
        .classList.add("active");

    resetIdleTimer();

}

// --------------------------
// 首頁
// --------------------------


// --------------------------
// 返回
// --------------------------

document
.getElementById("backBtn")
.addEventListener("click",()=>{

    playClick();

    setTimeout(()=>{

        showPage("homePage");

    },80);

});

document
.getElementById("detailBackBtn")
.addEventListener("click",()=>{

    playClick();

    setTimeout(()=>{

        showPage("ticketPage");

    },80);

});

// --------------------------
// 點票
// --------------------------

document
.querySelectorAll(".ticket-btn,.ticket-btn-wide")
.forEach(ticket=>{

    ticket.addEventListener("click",()=>{
playClick();
        document
        .querySelectorAll(".ticket-btn,.ticket-btn-wide")
        .forEach(card=>{

            card.classList.remove("ticket-selected");

        });

        ticket.classList.add("ticket-selected");

        setTimeout(()=>{

          const id = ticket.dataset.id;

const data = ticketData[id];
console.log("確認頁 data =", data);
selectedTicket = id;

selectedReward = data.reward;

// 紀錄票種
selectedReward = data.reward;

// 圖片
detailImage.src = ticket.src;

// 標題
detailTitle.innerHTML = data.title;

// 價格
detailPrice.innerHTML = "$" + data.price;


// 說明
let info = "";

switch(id){

    // ===== 一般票 =====
    case "ticket2hGreen":
    case "ticket2hRed":
    case "ticket3hGreen":
    case "ticket3hRed":

        info += `🪙 贈送代幣：${data.token} 枚<br>`;

        if(data.toy=="green"){

            info += "🎁 贈送玩具：綠標玩具";

        }else if(data.toy=="red"){

            info += "🎁 贈送玩具：紅標玩具";

        }

        break;

    // ===== 平日早鳥 =====
    case "early":

        info += `
🕙 入場時間：14:00~15:30<br>
🎮 可暢玩至：18:00<br>
🪙 贈送代幣：${data.token} 枚<br>
🎁 贈送玩具：紅標玩具`;

        break;

    // ===== 寒暑假 =====
    case "summer":

        info += `
🕙 入場時間：10:00~11:30<br>
🎮 可暢玩至：16:00<br>
🪙 贈送代幣：${data.token} 枚<br>
🎁 贈送玩具：紅標玩具`;

        break;

    // ===== 幼幼票 =====
    case "baby":

        info =
        "✓ 限未滿12個月<br>" +
        "✓ 免費陪同1位家長<br>" +
        "不送玩具、不送代幣";

        break;

    // ===== 陪同票 =====
    case "parent":

        info =
        "✓ 限陪同家長使用<br>" +
        "✓ 必須有兒童同行";

        break;

    // ===== 10枚代幣 =====
    case "token10":

        info = "兌換10枚遊戲代幣";

        break;

    // ===== 25枚代幣 =====
    case "token25":

        info = "兌換25枚遊戲代幣";

        break;

    // ===== 行動電源 =====
    case "powerbank":

        info =
        "✓ 限本館內借用<br>" +
        "✓ 離場前請歸還<br>" +
        "〔需抵押證件〕";

        break;

}

detailInfo.innerHTML =
`<div style="display:inline-block;text-align:left;line-height:1.9;">
${info}
</div>`;

            ticket.classList.remove("ticket-selected");

            showPage("detailPage");

        },150);

    });

});
// --------------------------
// 付款成功
// --------------------------

function paymentSuccess(paymentType){
    isReprint = false;
    //==========================
// 本次付款內容
//==========================

const payItems =
cart.length > 0
? cart
: [{
    id:selectedTicket
}];

let totalAmount = 0;

if(cart.length > 0){

    totalAmount = cart.reduce((sum,item)=>{

        return sum + Number(item.price || 0);

    },0);

}else if(selectedTicket){

    totalAmount = Number(ticketData[selectedTicket].price || 0);

}
    saveSalesRecord(paymentType,totalAmount);
    // ==========================
// 更新今日統計
// ==========================

payItems.forEach(item=>{

    const ticket = ticketData[item.id];

    if(!ticket) return;

    updateStats(todayStats, ticket, item);

    updateStats(monthStats, ticket, item);

    updateStats(totalStats, ticket, item);

});
    saveTodayStats();
     linePayBtn.disabled = true;
    cashBtn.disabled = true;
    showPage("successPage");
countdownNumber.innerHTML = "";
updateSuccessItems();

startPrintAnimation();

// 一開始顯示
successTip.innerHTML =
"👾 小怪獸正在準備您的票券...";

   

}

bindPaymentButton(linePayBtn,"LINE Pay");

bindPaymentButton(cashBtn,"現金");

// --------------------------
// 成功頁領取項目
// --------------------------

function updateSuccessItems(){

    const successItems =
    document.getElementById("successItems");

    let totalToken = 0;
    let greenToy = 0;
    let redToy = 0;
    let band = 0;
    let powerbank = 0;
if(!currentPrintOrder){

    successItems.innerHTML =
    "<div class='success-items-content'>沒有可列印資料</div>";

    return;

}

const items = currentPrintOrder.items || [];
    items.forEach(item=>{

        if(!item){

    return;

}

const ticket = item;

        // 代幣
        totalToken += ticket.token || 0;

        // 手環
        if(ticket.reward &&
           ticket.reward.includes("band")){

            band++;

        }

        // 玩具
        if(ticket.toy==="green"){

            greenToy++;

        }

        if(ticket.toy==="red"){

            redToy++;

        }

        // 行動電源
        if(item.id==="powerbank"){

            powerbank++;

        }

    });

    let html="";

    if(band){

        html += `<div>🎫 入場手環 × ${band}</div>`;

    }

    if(totalToken){

        html += `<div>🪙 遊戲代幣 × ${totalToken} 枚</div>`;

    }

    if(greenToy){

        html += `<div>🎁 綠標玩具 × ${greenToy}</div>`;

    }

    if(redToy){

        html += `<div>🎁 紅標玩具 × ${redToy}</div>`;

    }

    if(powerbank){

        html += `<div>🔋 行動電源 × ${powerbank}</div>`;

    }

    if(html===""){

        html="<div>無需領取物品</div>";

    }

    successItems.innerHTML=
    `<div class="success-items-content">
        ${html}
    </div>`;

}
// --------------------------
// 閒置60秒自動回首頁
// --------------------------

function resetIdleTimer(){

    clearTimeout(idleTimer);

    idleTimer = setTimeout(()=>{

        // 如果不是首頁就回首頁
        if(!document.getElementById("homePage").classList.contains("active")){

            showPage("homePage");

        }

    },60000);

}

document.addEventListener("click", resetIdleTimer);

document.addEventListener("touchstart", resetIdleTimer);

// --------------------------
// 啟動
// --------------------------

showPage("homePage");
updateTicketButtons();
updateTicketPrices();
function startPrintAnimation(){

    const progressFill =
    document.getElementById("progressFill");

    const progressText =
    document.getElementById("progressText");

    const printStatus =
    document.getElementById("printStatus");
    
    printStatus.classList.remove("print-finish");

    const successTitle =
    document.querySelector(".success-title");

    const successItems =
    document.querySelector(".success-items");

    progressFill.style.width = "0%";

progressFill.style.background =
"linear-gradient(90deg,#FFD54F,#FF9800)";

progressText.innerHTML = "0%";

    successTitle.style.display="none";

    successItems.style.display="none";

    let percent=0;

    const timer=setInterval(()=>{

       percent += Math.floor(Math.random() * 5) + 5;

if(percent > 100){
    percent = 100;
}
        

        progressFill.style.width=percent+"%";

        progressText.innerHTML=percent+"%";
        if(percent < 30){

    successTip.innerHTML = "👾 小怪獸正在準備您的票券...";

}else if(percent < 70){

    successTip.innerHTML = "🖨️ 正在列印票券...";

}else if(percent < 100){

    successTip.innerHTML = "✨ 即將完成...";

}

       if(percent >=100){

    clearInterval(timer);

    progressFill.style.width="100%";

    progressFill.style.borderRadius = "40px";

    progressText.innerHTML="100%";

    printStatus.innerHTML =
   "✅ 票券已列印完成";
successTip.innerHTML =
"🎉 歡迎來到小怪獸放電所，祝您玩得開心！";
           const sound = document.getElementById("successSound");

sound.pause();
sound.currentTime = 0;

sound.play().catch(function(err){

    console.log(err);

});
printStatus.classList.add("print-finish");
    successTitle.style.display="block";

    successItems.style.display="block";

// ===== 0.5秒後開始倒數 =====
setTimeout(() => {

    let sec = 5;

    clearInterval(countdownTimer);

    countdownNumber.innerHTML = sec;

    countdownTimer = setInterval(() => {

        sec--;

        if (sec > 0) {

            countdownNumber.innerHTML = sec;

        } else {

            clearInterval(countdownTimer);

           linePayBtn.disabled = false;
cashBtn.disabled = false;

// ===== 清空購物車 =====
cart = [];

updateCartPanel();

// ===== 收起付款區 =====
paymentArea.style.display = "none";

checkoutBtn.style.display = "block";

if(isReprint){

    isReprint = false;

    const index = salesHistory.findIndex(
        x => x.orderNo === currentPrintOrder.orderNo
    );

    openOrderDetail(index);

}else{

    showPage("homePage");

}

        }

    }, 1000);

}, 500);

}
        },220);  
}   
function loginAdmin(){

    const password =
        document.getElementById("adminPassword").value;

    if(password==="123456"){

        showPage("adminHomePage");

    }else{

        alert("密碼錯誤");

    }

}

function openTicketManager(){

    renderTicketManager();

    showPage("ticketManagerPage");

}
// ==========================
// 今日統計
// ==========================

//==========================
// 營運中心
//==========================

function openTodayStats(){

    showPage("todayStatsPage");

    renderStats(todayStats);

}

//==========================
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

//==========================
// 扣回統計
//==========================

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
function renderStats(data){

    document.getElementById("statsTickets").innerHTML =
    data.tickets + " 張";

    document.getElementById("statsIncome").innerHTML =
    "NT$" + data.income;

    document.getElementById("statsTokens").innerHTML =
    data.tokens + " 枚";

    document.getElementById("statsGreenToy").innerHTML =
    data.greenToy + " 個";

    document.getElementById("statsRedToy").innerHTML =
    data.redToy + " 個";

    document.getElementById("statsParent").innerHTML =
    data.parent + " 張";

}
function resetTodayStats(){

    if(!confirm("確定要將今日統計歸零？")){

        return;

    }

    todayStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(todayStats);

    alert("今日統計已歸零！");

}
function resetMonthStats(){

    if(!confirm("確定清除本月統計？")) return;

    monthStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(monthStats);

}
function resetAllStats(){

    if(!confirm("確定清除所有統計？")) return;

    todayStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    monthStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    totalStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(todayStats);

}
//==========================
// 更新票券顯示
//==========================

function updateTicketButtons(){

    document
    .querySelectorAll(".ticket-btn,.ticket-btn-wide")
    .forEach(btn=>{

        const id = btn.dataset.id;

        if(!id) return;

        const item = btn.closest(".ticket-item");

        if(ticketData[id] && ticketData[id].enable){

            if(item){

                item.style.display = "";

            }else{

                btn.style.display = "";

            }

        }else{

            if(item){

                item.style.display = "none";

            }else{

                btn.style.display = "none";

            }

        }

    });

}

//==========================
// 更新票價
//==========================

function updateTicketPrices(){

    document
    .querySelectorAll(".ticket-btn")
    .forEach(btn=>{

        const id = btn.dataset.id;

        const price =
        document.getElementById("price-"+id);

        if(!price) return;

        price.innerHTML =
        "NT$" + ticketData[id].price;

    });

}
function renderTicketManager(){

    const table = document.getElementById("ticketTable");

    table.innerHTML = "";

    const ticketNames = {

        ticket2hGreen:"🟢 2H 小怪獸",
        ticket2hRed:"🔴 2H 小怪獸 Plus",
        ticket3hGreen:"🟢 3H 大怪獸",
        ticket3hRed:"🔴 3H 大怪獸 Plus",
        early:"🌞 平日早鳥",
        summer:"🏖 寒暑假限定",
        baby:"👶 幼幼票",
        parent:"👨 陪同票",
        token10:"🪙 10枚代幣",
        token25:"🪙 25枚代幣",
        powerbank:"🔋 行動電源"

    };

    for(const id in ticketData){

        const ticket = ticketData[id];

        table.innerHTML += `

        <div class="tm-card">

            <div class="tm-card-header">

    <div class="tm-card-title">

        ${ticketNames[id]}

    </div>

    <label class="tm-enable">

        <input
            type="checkbox"
            id="enable-${id}"
            ${ticket.enable ? "checked" : ""}>

        啟用

    </label>

</div>

            <div class="tm-field">

                <label>票名</label>

                <input
                    id="title-${id}"
                    value="${ticket.title}">

            </div>

           <div class="tm-field">

    <label>價格</label>

    <input
        id="priceInput-${id}"
        type="number"
        value="${Number.isFinite(ticket.price) ? ticket.price : 0}">

</div>

                <div class="tm-field">

                    <label>時數</label>

                    <input
                        id="hour-${id}"
                        type="number"
                        value="${Number.isFinite(ticket.hour) ? ticket.hour : 0}">

                </div>

                <div class="tm-field">

                    <label>代幣</label>

                    <input
                        id="token-${id}"
                        type="number"
                        value="${Number.isFinite(ticket.token) ? ticket.token : 0}">

                </div>

            </div>

        </div>

        `;

    }

}
/* =========================================
   V3.9 購物車
========================================= */

function addCurrentTicketToCart(){

    if(!selectedTicket) return;

    const ticket = ticketData[selectedTicket];

    cart.push({

        id:selectedTicket,

        title:ticket.title,

        price:ticket.price,

        token:ticket.token || 0,

        toy:ticket.toy || "none",

        reward:ticket.reward || ""

    });

    updateCartPanel();

    showPage("ticketPage");

}


function updateCartPanel(){

    const count=document.getElementById("cartCount");
    const items=document.getElementById("cartItems");
    const amount=document.getElementById("cartAmount");

    let total=0;

    const summary={};

    cart.forEach(ticket=>{

        total+=ticket.price;

        if(!summary[ticket.id]){

            summary[ticket.id]={

                title:ticket.title,

                qty:0,

                amount:0

            };

        }

        summary[ticket.id].qty++;

        summary[ticket.id].amount+=ticket.price;

    });

    let html="";

    for(const id in summary){

        const item=summary[id];

        html+=`

<div class="cartRow">

    <div class="cartTop">

        <div class="cartTitle">

            ${item.title}

        </div>

        <div class="cartPrice">

            NT$${item.amount}

        </div>

    </div>

    <div class="cartBottom">

        <div class="qtyBox">

            <button
                class="qtyBtn"
                onclick="changeQty('${id}',-1)">
                −
            </button>

            <div class="qtyNumber">

                ${item.qty}

            </div>

            <button
                class="qtyBtn"
                onclick="changeQty('${id}',1)">
                +

            </button>

        </div>

        <button
            class="deleteBtn"
            onclick="removeCartItem('${id}')">

            ✕

        </button>

    </div>

</div>

`;

    }

    count.innerHTML=
    `🛒 購物車（共 ${cart.length} 張）`;

    items.innerHTML=html;

    amount.innerHTML=`


    <div class="cartTotalPrice">

        NT$${total}

    </div>

</div>

`;

}


function changeQty(id,step){

    if(step>0){

        const ticket=ticketData[id];

        cart.push({

            id:id,

            title:ticket.title,

            price:ticket.price,

            token:ticket.token||0,

            toy:ticket.toy||"none",

            reward:ticket.reward||""

        });

    }else{

        const index=cart.findIndex(x=>x.id===id);

        if(index!=-1){

            cart.splice(index,1);

        }

    }

    updateCartPanel();

}


function removeCartItem(id){

    cart=cart.filter(x=>x.id!==id);

    updateCartPanel();

}
// =========================================
// V3.9.9 購物車付款
// =========================================

const checkoutBtn = document.getElementById("checkoutBtn");
const paymentArea = document.getElementById("paymentArea");
const cartLineBtn = document.getElementById("cartLineBtn");
const cartCashBtn = document.getElementById("cartCashBtn");
const cartBackBtn = document.getElementById("cartBackBtn");

console.log("checkoutBtn =", checkoutBtn);
console.log("paymentArea =", paymentArea);
console.log("cartLineBtn =", cartLineBtn);
console.log("cartCashBtn =", cartCashBtn);
console.log("cartBackBtn =", cartBackBtn);

checkoutBtn.addEventListener("click",()=>{

    if(cart.length===0){

        alert("請先加入票券！");

        return;

    }

    checkoutBtn.style.display="none";

    paymentArea.style.display="flex";

});

cartBackBtn.addEventListener("click",()=>{

    paymentArea.style.display="none";

    checkoutBtn.style.display="block";

});
// =========================
// 購物車付款
// =========================

bindPaymentButton(cartLineBtn,"LINE Pay");

bindPaymentButton(cartCashBtn,"現金");
const todayTab = document.getElementById("todayTab");
const monthTab = document.getElementById("monthTab");
const totalTab = document.getElementById("totalTab");

if(todayTab){

    todayTab.onclick = ()=>{

        renderStats(todayStats);

        todayTab.classList.add("active");
        monthTab.classList.remove("active");
        totalTab.classList.remove("active");

    };

}

if(monthTab){

    monthTab.onclick = ()=>{

        renderStats(monthStats);

        todayTab.classList.remove("active");
        monthTab.classList.add("active");
        totalTab.classList.remove("active");

    };

}

if(totalTab){

    totalTab.onclick = ()=>{

        renderStats(totalStats);

        todayTab.classList.remove("active");
        monthTab.classList.remove("active");
        totalTab.classList.add("active");

    };

}
