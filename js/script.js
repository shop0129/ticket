// ========================================
// DOM 元件
// ========================================
const detailImage = document.getElementById("detailImage");
const detailTitle = document.getElementById("detailTitle");
const detailPrice = document.getElementById("detailPrice");
const detailInfo = document.getElementById("detailInfo");

const countdownNumber = document.getElementById("countdownNumber");
const successTip =
document.getElementById("successTip");

const linePayBtn = document.getElementById("linePayBtn");
const cashBtn = document.getElementById("cashBtn");

const todayTab = document.getElementById("todayTab");
const monthTab = document.getElementById("monthTab");
const totalTab = document.getElementById("totalTab");
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
// 建立售票紀錄
// =========================================

function saveSalesRecord(paymentType,totalAmount){

     now = new Date();

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
// =========================================
// 換頁
// =========================================
document
.getElementById("detailBackBtn")
.addEventListener("click",()=>{

    playClick();

    setTimeout(()=>{

        showPage("ticketPage");

    },80);

});

// =========================================
// 點票
// =========================================

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
applyPaymentSetting();
        },150);

    });

});
// =========================================
// 付款成功
// =========================================

function paymentSuccess(paymentType){
    isReprint = false;
    
//=========================================
// 本次付款內容
//=========================================

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
// ================================================
// 更新今日統計
// ================================================

payItems.forEach(item=>{

    const ticket = ticketData[item.id];

    if(!ticket) return;

    updateStats(todayStats, ticket, item);

    updateStats(monthStats, ticket, item);

    updateStats(totalStats, ticket, item);

});
    saveTodayStats();

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

// =========================================
// 啟動
// =========================================

showPage("homePage");

applyPaymentSetting();
updateTicketButtons();
updateTicketPrices();
function loginAdmin(){

    const input =
        document.getElementById("adminLoginPassword");

    const password = input.value;

    if(password===systemData.adminPassword){

        input.value = "";

        showPage("adminHomePage");

    }else{

        input.value = "";

        alert("❌ 密碼錯誤");

    }

}


// 購物車功能已移至 cart.js
