// =========================================
// 確認票券模組
// =========================================

const detailImage = document.getElementById("detailImage");
const detailTitle = document.getElementById("detailTitle");
const detailPrice = document.getElementById("detailPrice");
const detailInfo = document.getElementById("detailInfo");
const detailBackBtn = document.getElementById("detailBackBtn");

// =========================================
// 返回票種頁
// =========================================
if(detailBackBtn){

    detailBackBtn.addEventListener("click",()=>{

        playClick();

        setTimeout(()=>{

            showPage("ticketPage");

        },80);

    });

}

// =========================================
// 產生票券說明
// =========================================
function getTicketDetailInfo(id,data){

    let info = "";

    switch(id){

        // ===== 一般票 =====
        case "ticket2hGreen":
        case "ticket2hRed":
        case "ticket3hGreen":
        case "ticket3hRed":

            info += `🪙 贈送代幣：${data.token} 枚<br>`;

            if(data.toy === "green"){

                info += "🎁 贈送玩具：綠標玩具";

            }else if(data.toy === "red"){

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

    return info;

}

// =========================================
// 顯示確認票券頁
// =========================================
function openTicketDetail(ticketElement){

    const id = ticketElement.dataset.id;
    const data = ticketData[id];

    if(!data) return;

    selectedTicket = id;
    selectedReward = data.reward;

    detailImage.src = ticketElement.src;
    detailTitle.innerHTML = data.title;
    detailPrice.innerHTML = "$" + data.price;

    const info = getTicketDetailInfo(id,data);

    detailInfo.innerHTML =
    `<div style="display:inline-block;text-align:left;line-height:1.9;">
    ${info}
    </div>`;

    ticketElement.classList.remove("ticket-selected");

    showPage("detailPage");

    applyPaymentSetting();

}

// =========================================
// 點選票券
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

            openTicketDetail(ticket);

        },150);

    });

});
