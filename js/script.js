


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


// =========================================
// 共用付款按鈕
// =========================================

function bindPaymentButton(button, paymentType){

    button.addEventListener("click",()=>{

        playClick();

        paymentSuccess(paymentType);

    });

}

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
// 啟動
// --------------------------

showPage("homePage");
updateTicketButtons();
updateTicketPrices();
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

//==========================
// 扣回統計
//==========================


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

bindPaymentButton(cartLineBtn,"LINE Pay");
bindPaymentButton(cartCashBtn,"現金");
// =========================================
// V3.9.9 購物車付款
// =========================================



console.log("checkoutBtn =", checkoutBtn);
console.log("paymentArea =", paymentArea);
console.log("cartLineBtn =", cartLineBtn);
console.log("cartCashBtn =", cartCashBtn);
console.log("cartBackBtn =", cartBackBtn);


// =========================
// 購物車付款
// =========================


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
