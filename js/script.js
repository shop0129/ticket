// =========================================
// DOM 元件
// ========================================
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
// 確認票券功能已移至 detail.js

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
