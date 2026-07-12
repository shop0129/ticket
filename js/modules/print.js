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

       // 一般票送的代幣
totalToken += ticket.token || 0;

// 代幣商品
if(item.id === "token10"){

    totalToken += 10;

}

if(item.id === "token25"){

    totalToken += 25;

}

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

function startPrintAnimation(){
    clearInterval(countdownTimer);

countdownNumber.innerHTML = "";

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
          playSuccess();
printStatus.classList.add("print-finish");
    successTitle.style.display="block";

    successItems.style.display="block";

// ===== 0.5秒後開始倒數 =====
setTimeout(() => {

    let sec = systemData.printDelay;

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
