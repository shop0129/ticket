// =========================================
// 小怪獸售票機 V6.3
// 確認票券模組
// =========================================

const detailImage =
document.getElementById("detailImage");

const detailTitle =
document.getElementById("detailTitle");

const detailPrice =
document.getElementById("detailPrice");

const detailInfo =
document.getElementById("detailInfo");

const detailBackBtn =
document.getElementById("detailBackBtn");

if(detailBackBtn){

    detailBackBtn.addEventListener(
        "click",
        ()=>{

            playClick();

            setTimeout(()=>{

                showPage("ticketPage");

            },80);

        }
    );

}

function getTicketDetailInfo(id,data){

    if(data.description){

        return escapeDetailText(
            data.description
        )
        .replaceAll("\n","<br>");

    }

    let info = "";

    if(Number(data.token || 0) > 0){

        info +=
        `🪙 贈送代幣：${data.token} 枚<br>`;

    }

    if(data.toy === "green"){

        info +=
        "🎁 贈送玩具：綠標玩具<br>";

    }else if(data.toy === "red"){

        info +=
        "🎁 贈送玩具：紅標玩具<br>";

    }

    switch(id){

        case "early":

            return `
🕙 入場時間：14:00~15:30<br>
🎮 可暢玩至：18:00<br>
${info}`;

        case "summer":

            return `
🕙 入場時間：10:00~11:30<br>
🎮 可暢玩至：16:00<br>
${info}`;

        case "baby":

            return (
                "✓ 限未滿12個月<br>" +
                "✓ 免費陪同1位家長<br>" +
                "不送玩具、不送代幣"
            );

        case "parent":

            return (
                "✓ 限陪同家長使用<br>" +
                "✓ 必須有兒童同行"
            );

        case "token10":

            return "兌換10枚遊戲代幣";

        case "token25":

            return "兌換25枚遊戲代幣";

        case "powerbank":

            return (
                "✓ 限本館內借用<br>" +
                "✓ 離場前請歸還<br>" +
                "〔需抵押證件〕"
            );

        default:

            return (
                info ||
                "請確認票券內容後選擇付款方式"
            );

    }

}

function escapeDetailText(value){

    return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}

function openTicketDetail(ticketElement){

    const id =
    ticketElement.dataset.id;

    const data =
    ticketData[id];

    if(!data) return;

    selectedTicket = id;

    selectedReward =
    data.reward || "";

    detailImage.src =
    ticketElement.src;

    detailTitle.textContent =
    data.title;

    detailPrice.textContent =
    "$" + Number(data.price || 0);

    const info =
    getTicketDetailInfo(id,data);

    detailInfo.innerHTML = `

<div style="display:inline-block;text-align:left;line-height:1.9;">
    ${info}
</div>

`;

    ticketElement
    .classList
    .remove("ticket-selected");

    showPage("detailPage");

    applyPaymentSetting();

}

// 動態票卡使用事件代理，不需重新綁定
document.addEventListener(
    "click",
    event=>{

        const ticket =
        event.target.closest(
            ".ticket-btn,.ticket-btn-wide"
        );

        if(!ticket) return;

        playClick();

        document
        .querySelectorAll(
            ".ticket-btn,.ticket-btn-wide"
        )
        .forEach(card=>{

            card.classList.remove(
                "ticket-selected"
            );

        });

        ticket.classList.add(
            "ticket-selected"
        );

        setTimeout(()=>{

            openTicketDetail(ticket);

        },150);

    }
);
