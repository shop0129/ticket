// ==========================
// 小怪獸放電所 售票機 V3
// ==========================

let idleTimer;
let countdownTimer;

// ==========================
// 換頁
// ==========================

function showPage(pageId){

    document.querySelectorAll(".page").forEach(page=>{
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    resetIdleTimer();

}

// ==========================
// 首頁
// ==========================

document.getElementById("startBtn").addEventListener("click",()=>{

    showPage("ticketPage");

});

// ==========================
// 返回
// ==========================

document.getElementById("backBtn").addEventListener("click",()=>{

    showPage("homePage");

});

document.getElementById("detailBackBtn").addEventListener("click",()=>{

    showPage("ticketPage");

});

// ==========================
// 點票
// ==========================

document.querySelectorAll(".ticket-btn,.ticket-btn-wide")

.forEach(ticket=>{

    ticket.addEventListener("click",()=>{

    // 先清除其他票卡發光
    document
    .querySelectorAll(".ticket-btn,.ticket-btn-wide")
    .forEach(card=>{

        card.classList.remove("ticket-selected");

    });

    // 自己發光
    ticket.classList.add("ticket-selected");

    // 延遲切換頁面
    setTimeout(()=>{

        detailImage.src=ticket.src;

        detailTitle.innerHTML=ticket.dataset.title;

        detailPrice.innerHTML=ticket.dataset.price;

        detailInfo.innerHTML=ticket.dataset.info;

        ticket.classList.remove("ticket-selected");

        showPage("detailPage");

    },150);

});

});

// ==========================
// 付款
// ==========================

function paymentSuccess(){

    showPage("successPage");

    let sec=5;

    countdownNumber.innerHTML=sec;

    clearInterval(countdownTimer);

    countdownTimer=setInterval(()=>{

        sec--;

        countdownNumber.innerHTML=sec;

        if(sec<=0){

            clearInterval(countdownTimer);

            showPage("homePage");

        }

    },1000);

}

linePayBtn.addEventListener("click",paymentSuccess);

cashBtn.addEventListener("click",paymentSuccess);

// ==========================
// 閒置60秒
// ==========================

function resetIdleTimer(){

    clearTimeout(idleTimer);

    idleTimer=setTimeout(()=>{

        showPage("homePage");

    },60000);

}

document.addEventListener("click",resetIdleTimer);

document.addEventListener("touchstart",resetIdleTimer);

// ==========================
// 啟動
// ==========================

showPage("homePage");
