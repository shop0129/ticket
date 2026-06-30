// ==========================
// 票價設定
// ==========================

let ticketData =
JSON.parse(localStorage.getItem("ticketData")) || {

    ticket2hGreen:{
        title:"2H 小怪獸",
        price:250,
        hour:2,
        token:10,
        toy:"green",
        reward:"token,band,toy",

    info:"🪙 贈送代幣：10 枚<br>🎁 贈送玩具：綠標玩具"
    },

    ticket2hRed:{
        title:"2H 小怪獸 Plus",
        price:300,
        hour:2,
        token:15,
        toy:"red",
        reward:"token,band,toy",

    info:"🪙 贈送代幣：15 枚<br>🎁 贈送玩具：紅標玩具"
    },

    ticket3hGreen:{
        title:"3H 大怪獸",
        price:300,
        hour:3,
        token:15,
        toy:"green",
        reward:"token,band,toy",

    info:"🪙 贈送代幣：15 枚<br>🎁 贈送玩具：綠標玩具"
    },

    ticket3hRed:{
        title:"3H 大怪獸 Plus",
        price:350,
        hour:3,
        token:20,
        toy:"red",
        reward:"token,band,toy",

    info:"🪙 贈送代幣：20 枚<br>🎁 贈送玩具：紅標玩具"
    },

   early:{
    title:"平日早鳥",
    price:300,
    token:15,
    toy:"red",
    reward:"token,band,toy",

    info:"🕙 入場時間：14:00~15:30<br>🎮 可暢玩至：18:00<br>🪙 贈送代幣：15 枚<br>🎁 贈送玩具：紅標玩具"
},

    summer:{
    title:"寒暑假限定",
    price:350,
    token:20,
    toy:"red",
    reward:"token,band,toy",

    info:"🕙 入場時間：10:00~11:30<br>🎮 可暢玩至：16:00<br>🪙 贈送代幣：20 枚<br>🎁 贈送玩具：紅標玩具"
},

    baby:{
    title:"幼幼票",
    price:100,
    reward:"band",
    info:"✓ 限未滿12個月<br>✓ 免費陪同1位家長<br>不送玩具、不送代幣"
},

    parent:{
    title:"陪同票",
    price:80,
    reward:"band",
    info:"✓ 限陪同家長使用<br>✓ 必須有兒童同行"
},

    token10:{
    title:"10枚代幣",
    price:100,
    reward:"token10",
    info:"兌換10枚遊戲代幣"
},

    token25:{
    title:"25枚代幣",
    price:200,
    reward:"token25",
    info:"兌換25枚遊戲代幣"
},

    powerbank:{
    title:"行動電源",
    price:50,
    reward:"powerbank",
    info:"✓ 限本館內借用<br>✓ 離場前請歸還<br>〔需抵押證件〕"
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

localStorage.setItem(
    "ticketData",
    JSON.stringify(ticketData)
);

function playClick(){

    const click = document.getElementById("clickSound");

    click.pause();

    click.currentTime = 0;

    click.play().catch(()=>{});

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
// 全域變數
// --------------------------

let idleTimer;
let countdownTimer;

let selectedReward = "";
let selectedTicket = "";

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
detailInfo.innerHTML =
"<div style='display:inline-block;text-align:left;line-height:1.9;'>"
+ data.info +
"</div>";

            ticket.classList.remove("ticket-selected");

            showPage("detailPage");

        },150);

    });

});
// --------------------------
// 付款成功
// --------------------------

function paymentSuccess(){
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

linePayBtn.addEventListener("click",()=>{

    playClick();

    paymentSuccess();

});

cashBtn.addEventListener("click",()=>{

    playClick();

    paymentSuccess();

});

// --------------------------
// 成功頁領取項目
// --------------------------

function updateSuccessItems(){

    const ticket = ticketData[selectedTicket];

    const successItems =
    document.getElementById("successItems");

    let html = "";

    if(!ticket){

        successItems.innerHTML =
        "<div>請至櫃檯確認領取項目</div>";

        return;

    }

    // ===== 代幣 =====

    if(ticket.token){

        html += `<div>🪙 領取： ${ticket.token} 枚代幣</div>`;

    }

    // ===== 手環 =====

    if(ticket.reward.includes("band")){

        html += "<div>🎫 領取：入場手環</div>";

    }

    // ===== 玩具 =====

    if(ticket.toy=="green"){

        html +=
        "<div>🎁 兌換：綠標玩具(離場時)</div>";

    }

    if(ticket.toy=="red"){

        html +=
        "<div>🎁 兌換：紅標玩具(離場時)</div>";

    }

    // ===== 代幣票 =====

    if(selectedTicket=="token10"){

        html =
        "<div>🪙 領取：10枚代幣</div>";

    }

    if(selectedTicket=="token25"){

        html =
        "<div>🪙 領取：25枚代幣</div>";

    }

    // ===== 行動電源 =====

    if(selectedTicket=="powerbank"){

        html =
        "<div>🔋 領取：行動電源</div>";

    }

   successItems.innerHTML =
"<div style='display:inline-block;text-align:left;'>"
+ html +
"</div>";

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

sound.play().catch(err => console.log(err));
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

            showPage("homePage");

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
function openPricePage(){

    document.getElementById("price-ticket2hGreen").value =
    ticketData.ticket2hGreen.price;

    document.getElementById("price-ticket2hRed").value =
    ticketData.ticket2hRed.price;

    document.getElementById("price-ticket3hGreen").value =
    ticketData.ticket3hGreen.price;

    document.getElementById("price-ticket3hRed").value =
    ticketData.ticket3hRed.price;

    document.getElementById("price-early").value =
    ticketData.early.price;

    document.getElementById("price-summer").value =
    ticketData.summer.price;

    document.getElementById("price-baby").value =
    ticketData.baby.price;

    document.getElementById("price-parent").value =
    ticketData.parent.price;

    document.getElementById("price-token10").value =
    ticketData.token10.price;

    document.getElementById("price-token25").value =
    ticketData.token25.price;

    document.getElementById("price-powerbank").value =
    ticketData.powerbank.price;

    showPage("pricePage");

}
function savePrices(){

    ticketData.ticket2hGreen.price =
    Number(document.getElementById("price-ticket2hGreen").value);

    ticketData.ticket2hRed.price =
    Number(document.getElementById("price-ticket2hRed").value);

    ticketData.ticket3hGreen.price =
    Number(document.getElementById("price-ticket3hGreen").value);

    ticketData.ticket3hRed.price =
    Number(document.getElementById("price-ticket3hRed").value);

    ticketData.early.price =
    Number(document.getElementById("price-early").value);

    ticketData.summer.price =
    Number(document.getElementById("price-summer").value);

    ticketData.baby.price =
    Number(document.getElementById("price-baby").value);

    ticketData.parent.price =
    Number(document.getElementById("price-parent").value);

    ticketData.token10.price =
    Number(document.getElementById("price-token10").value);

    ticketData.token25.price =
    Number(document.getElementById("price-token25").value);

    ticketData.powerbank.price =
    Number(document.getElementById("price-powerbank").value);

   localStorage.setItem("ticketData", JSON.stringify(ticketData));

    alert("票價已儲存！");

}
