let selectedReward = "";
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

// 記錄目前票種的領取項目
selectedReward = ticket.dataset.reward;

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
function updateSuccessItems(){

```
const successItems =
document.getElementById("successItems");

let html = "";

// 一般票
if(selectedReward==="token,band,toy"){

    html += "<div>🪙 請領取代幣</div>";
    html += "<div>🎫 請領取入場手環</div>";
    html += "<div>🎁 玩具請於離場時憑手環兌換</div>";

}

// 幼幼票、陪同票
else if(selectedReward==="band"){

    html += "<div>🎫 請領取入場手環</div>";

}

// 10枚代幣
else if(selectedReward==="token10"){

    html += "<div>🪙 請領取10枚代幣</div>";

}

// 25枚代幣
else if(selectedReward==="token25"){

    html += "<div>🪙 請領取25枚代幣</div>";

}

// 行動電源
else if(selectedReward==="powerbank"){

    html += "<div>🔋 請向櫃檯領取行動電源</div>";

}

successItems.innerHTML = html;
```

}
