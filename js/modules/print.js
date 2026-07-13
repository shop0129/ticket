// =========================================
// 小怪獸售票機 V5.6.3
// 列印模組
// =========================================

// =========================================
// 成功頁 DOM
// =========================================
const successItemsBox =
document.getElementById("successItems");

const progressFill =
document.getElementById("progressFill");

const progressText =
document.getElementById("progressText");

const printStatus =
document.getElementById("printStatus");

const successTitle =
document.querySelector(".success-title");

const successItemsArea =
document.querySelector(".success-items");

// =========================================
// 成功頁領取項目
// =========================================
function updateSuccessItems(){

    if(!successItemsBox) return;

    if(!currentPrintOrder){

        successItemsBox.innerHTML =
        "<div class='success-items-content'>沒有可列印資料</div>";

        return;

    }

    let totalToken = 0;
    let greenToy = 0;
    let redToy = 0;
    let band = 0;
    let powerbank = 0;

    const items = currentPrintOrder.items || [];

    items.forEach(item=>{

        if(!item) return;

        const ticket = item;

        // 一般票附贈代幣
        totalToken += ticket.token || 0;

        // 代幣商品
        if(item.id === "token10"){

            totalToken += 10;

        }

        if(item.id === "token25"){

            totalToken += 25;

        }

        // 入場手環
        if(
            ticket.reward &&
            ticket.reward.includes("band")
        ){

            band++;

        }

        // 玩具
        if(ticket.toy === "green"){

            greenToy++;

        }

        if(ticket.toy === "red"){

            redToy++;

        }

        // 行動電源
        if(item.id === "powerbank"){

            powerbank++;

        }

    });

    let html = "";

    if(band){

        html +=
        `<div>🎫 入場手環 × ${band}</div>`;

    }

    if(totalToken){

        html +=
        `<div>🪙 遊戲代幣 × ${totalToken} 枚</div>`;

    }

    if(greenToy){

        html +=
        `<div>🎁 綠標玩具 × ${greenToy}</div>`;

    }

    if(redToy){

        html +=
        `<div>🎁 紅標玩具 × ${redToy}</div>`;

    }

    if(powerbank){

        html +=
        `<div>🔋 行動電源 × ${powerbank}</div>`;

    }

    if(html === ""){

        html =
        "<div>無需領取物品</div>";

    }

    successItemsBox.innerHTML =
    `<div class="success-items-content">
        ${html}
    </div>`;

}

// =========================================
// 重設列印畫面
// =========================================
function resetPrintDisplay(){

    clearInterval(countdownTimer);

    countdownNumber.innerHTML = "";

    printStatus.classList.remove("print-finish");

    progressFill.style.width = "0%";

    progressFill.style.borderRadius = "";

    progressFill.style.background =
    "linear-gradient(90deg,#FFD54F,#FF9800)";

    progressText.innerHTML = "0%";

    successTitle.style.display = "none";

    successItemsArea.style.display = "none";

}

// =========================================
// 更新列印提示文字
// =========================================
function updatePrintMessage(percent){

    if(percent < 30){

        successTip.innerHTML =
        "👾 小怪獸正在準備您的票券...";

    }else if(percent < 70){

        successTip.innerHTML =
        "🖨️ 正在列印票券...";

    }else if(percent < 100){

        successTip.innerHTML =
        "✨ 即將完成...";

    }

}

// =========================================
// 完成列印
// =========================================
function finishPrintAnimation(){

    progressFill.style.width = "100%";

    progressFill.style.borderRadius = "40px";

    progressText.innerHTML = "100%";

    printStatus.innerHTML =
    "✅ 票券已列印完成";

    successTip.innerHTML =
    "🎉 歡迎來到小怪獸放電所，祝您玩得開心！";

    playSuccess();

    printStatus.classList.add("print-finish");

    successTitle.style.display = "block";

    successItemsArea.style.display = "block";

    // 0.5 秒後開始倒數
    setTimeout(()=>{

        startReturnCountdown();

    },500);

}

// =========================================
// 列印完成倒數
// =========================================
function startReturnCountdown(){

    let sec = systemData.printDelay;

    clearInterval(countdownTimer);

    countdownNumber.innerHTML = sec;

    countdownTimer = setInterval(()=>{

        sec--;

        if(sec > 0){

            countdownNumber.innerHTML = sec;

            return;

        }

        clearInterval(countdownTimer);

        linePayBtn.disabled = false;
        cashBtn.disabled = false;


        if(
            typeof resetPaymentLock ===
            "function"
        ){

            resetPaymentLock();

        }

        // 清空購物車
        cart = [];

        updateCartPanel();

        // 收起付款區
        paymentArea.style.display = "none";

        checkoutBtn.style.display = "block";

        if(isReprint){

            isReprint = false;

            const index =
            salesHistory.findIndex(
                order =>
                order.orderNo ===
                currentPrintOrder.orderNo
            );

            openOrderDetail(index);

        }else{

            showPage("homePage");

        }

    },1000);

}

// =========================================
// 啟動列印動畫
// =========================================
function startPrintAnimation(){

    resetPrintDisplay();

    let percent = 0;

    const timer = setInterval(()=>{

        percent +=
        Math.floor(Math.random() * 5) + 5;

        if(percent > 100){

            percent = 100;

        }

        progressFill.style.width =
        percent + "%";

        progressText.innerHTML =
        percent + "%";

        updatePrintMessage(percent);

        if(percent >= 100){

            clearInterval(timer);

            finishPrintAnimation();

        }

    },220);

}
