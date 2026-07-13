// =========================================
// 小怪獸售票機 V5.6.5
// 付款模組
// =========================================

const countdownNumber =
document.getElementById("countdownNumber");

const successTip =
document.getElementById("successTip");

const linePayBtn =
document.getElementById("linePayBtn");

const cashBtn =
document.getElementById("cashBtn");


let paymentInProgress = false;

function setPaymentButtonsDisabled(disabled){

    [
        linePayBtn,
        cashBtn,
        document.getElementById("cartLineBtn"),
        document.getElementById("cartCashBtn")
    ]
    .filter(Boolean)
    .forEach(button=>{

        button.disabled = disabled;

    });

}

function resetPaymentLock(){

    paymentInProgress = false;

    setPaymentButtonsDisabled(false);

    if(
        typeof applyPaymentSetting ===
        "function"
    ){

        applyPaymentSetting();

    }

}

// =========================================
// 建立售票紀錄
// =========================================
function saveSalesRecord(paymentType,totalAmount){

    const now = new Date();

    const order = {

        orderNo:generateOrderNo(),

        date:now.toLocaleDateString("zh-TW"),

        time:now.toLocaleTimeString("zh-TW",{

            hour:"2-digit",

            minute:"2-digit"

        }),

        payment:paymentType,

        amount:Number(totalAmount) || 0,

        ...(typeof getCurrentMemberOrderInfo === "function" ? getCurrentMemberOrderInfo() : {}),

        items:
        cart.length > 0
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
function bindPaymentButton(button,paymentType){

    if(!button) return;

    button.addEventListener("click",()=>{

        playClick();

        paymentSuccess(paymentType);

    });

}

// =========================================
// 付款成功
// =========================================
function paymentSuccess(paymentType){

    if(paymentInProgress){

        return;

    }

    paymentInProgress = true;

    setPaymentButtonsDisabled(true);

    isReprint = false;

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

        totalAmount =
        Number(ticketData[selectedTicket].price || 0);

    }

    saveSalesRecord(
        paymentType,
        totalAmount
    );

    if(typeof applyMemberPurchase === "function") applyMemberPurchase(totalAmount);

    payItems.forEach(item=>{

        const ticket =
        ticketData[item.id];

        if(!ticket) return;

        updateStats(
            todayStats,
            ticket,
            item
        );

        updateStats(
            monthStats,
            ticket,
            item
        );

        updateStats(
            totalStats,
            ticket,
            item
        );

    });

    saveTodayStats();

    showPage("successPage");

    countdownNumber.innerHTML = "";

    updateSuccessItems();

    startPrintAnimation();

    successTip.innerHTML =
    "👾 小怪獸正在準備您的票券...";

}

// =========================================
// 單張票券付款按鈕
// =========================================
bindPaymentButton(
    linePayBtn,
    "LINE Pay"
);

bindPaymentButton(
    cashBtn,
    "現金"
);
