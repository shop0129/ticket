// ==========================
// 小怪獸放電所 售票機 V3.6
// ==========================

// --------------------------
// 全域變數
// --------------------------

let idleTimer;
let countdownTimer;

let selectedReward = "";

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

document
.getElementById("startBtn")
.addEventListener("click",()=>{

    showPage("ticketPage");

});

// --------------------------
// 返回
// --------------------------

document
.getElementById("backBtn")
.addEventListener("click",()=>{

    showPage("homePage");

});

document
.getElementById("detailBackBtn")
.addEventListener("click",()=>{

    showPage("ticketPage");

});

// --------------------------
// 點票
// --------------------------

document
.querySelectorAll(".ticket-btn,.ticket-btn-wide")
.forEach(ticket=>{

    ticket.addEventListener("click",()=>{

        document
        .querySelectorAll(".ticket-btn,.ticket-btn-wide")
        .forEach(card=>{

            card.classList.remove("ticket-selected");

        });

        ticket.classList.add("ticket-selected");

        setTimeout(()=>{

            selectedReward = ticket.dataset.reward;

            detailImage.src = ticket.src;

            detailTitle.innerHTML = ticket.dataset.title;

            detailPrice.innerHTML = ticket.dataset.price;

            detailInfo.innerHTML = ticket.dataset.info;

            ticket.classList.remove("ticket-selected");

            showPage("detailPage");

        },150);

    });

});
// --------------------------
// 付款成功
// --------------------------

function paymentSuccess(){

    showPage("successPage");

updateSuccessItems();

startPrintAnimation();

// 一開始顯示
successTip.innerHTML =
"👾 小怪獸正在準備您的票券...";

// 1秒後改文字
setTimeout(()=>{

    successTip.innerHTML =
    "🎉 歡迎來到小怪獸放電所，祝您玩得開心！";

},1000);

    let sec = 5;

    countdownNumber.innerHTML = sec;

    clearInterval(countdownTimer);

    countdownTimer = setInterval(()=>{

        sec--;

        countdownNumber.innerHTML = sec;

        if(sec <= 0){

            clearInterval(countdownTimer);

            showPage("homePage");

        }

    },1000);

}

linePayBtn.addEventListener("click", paymentSuccess);

cashBtn.addEventListener("click", paymentSuccess);

// --------------------------
// 成功頁領取項目
// --------------------------

function updateSuccessItems(){

    const successItems =
    document.getElementById("successItems");

    let html = "";

    switch(selectedReward){

        case "token,band,toy":

            html += "<div>🪙 請領取代幣</div>";
            html += "<div>🎫 請領取入場手環</div>";
            html += "<div>🎁 玩具請於離場時憑手環兌換</div>";
            break;

        case "band":

            html += "<div>🎫 請領取入場手環</div>";
            break;

        case "token10":

            html += "<div>🪙 請領取10枚代幣</div>";
            break;

        case "token25":

            html += "<div>🪙 請領取25枚代幣</div>";
            break;

        case "powerbank":

            html += "<div>🔋 請向櫃檯領取行動電源</div>";
            break;

        default:

            html = "<div>請至櫃檯確認領取項目</div>";

    }

    successItems.innerHTML = html;

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
function startPrintAnimation(){

    const progressFill =
    document.getElementById("progressFill");

    const progressText =
    document.getElementById("progressText");

    const printStatus =
    document.getElementById("printStatus");

    const successTitle =
    document.querySelector(".success-title");

    const successItems =
    document.querySelector(".success-items");

    progressFill.style.width="0%";

    progressText.innerHTML="0%";

    successTitle.style.display="none";

    successItems.style.display="none";

    let percent=0;

    const timer=setInterval(()=>{

        percent+=10;

        progressFill.style.width=percent+"%";

        progressText.innerHTML=percent+"%";

        if(percent>=100){

            clearInterval(timer);

            printStatus.innerHTML=
            "🎫 票券已準備完成";

            successTitle.style.display="block";

            successItems.style.display="block";

        }

    },180);

}
