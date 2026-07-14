// V7 Phase 1 Legacy Build | js/modules/detail.js
// =========================================
// 小怪獸售票機 V6.3
// 確認票券模組
// =========================================
var detailImage = document.getElementById("detailImage");
var detailTitle = document.getElementById("detailTitle");
var detailPrice = document.getElementById("detailPrice");
var detailInfo = document.getElementById("detailInfo");
var detailBackBtn = document.getElementById("detailBackBtn");
if (detailBackBtn) {
    detailBackBtn.addEventListener("click", function () {
        playClick();
        setTimeout(function () {
            showPage("ticketPage");
        }, 80);
    });
}
function getTicketDetailInfo(id, data) {
    if (data.description) {
        return escapeDetailText(data.description)
            .replaceAll("\n", "<br>");
    }
    var info = "";
    if (Number(data.token || 0) > 0) {
        info +=
            "\uD83E\uDE99 \u8D08\u9001\u4EE3\u5E63\uFF1A".concat(data.token, " \u679A<br>");
    }
    if (data.toy === "green") {
        info +=
            "🎁 贈送玩具：綠標玩具<br>";
    }
    else if (data.toy === "red") {
        info +=
            "🎁 贈送玩具：紅標玩具<br>";
    }
    switch (id) {
        case "early":
            return "\n\uD83D\uDD59 \u5165\u5834\u6642\u9593\uFF1A14:00~15:30<br>\n\uD83C\uDFAE \u53EF\u66A2\u73A9\u81F3\uFF1A18:00<br>\n".concat(info);
        case "summer":
            return "\n\uD83D\uDD59 \u5165\u5834\u6642\u9593\uFF1A10:00~11:30<br>\n\uD83C\uDFAE \u53EF\u66A2\u73A9\u81F3\uFF1A16:00<br>\n".concat(info);
        case "baby":
            return ("✓ 限未滿12個月<br>" +
                "✓ 免費陪同1位家長<br>" +
                "不送玩具、不送代幣");
        case "parent":
            return ("✓ 限陪同家長使用<br>" +
                "✓ 必須有兒童同行");
        case "token10":
            return "兌換10枚遊戲代幣";
        case "token25":
            return "兌換25枚遊戲代幣";
        case "powerbank":
            return ("✓ 限本館內借用<br>" +
                "✓ 離場前請歸還<br>" +
                "〔需抵押證件〕");
        default:
            return (info ||
                "請確認票券內容後選擇付款方式");
    }
}
function escapeDetailText(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
function openTicketDetail(ticketElement) {
    var id = ticketElement.dataset.id;
    var data = ticketData[id];
    if (!data)
        return;
    selectedTicket = id;
    selectedReward =
        data.reward || "";
    detailImage.src =
        ticketElement.src;
    detailTitle.textContent =
        data.title;
    detailPrice.textContent =
        "$" + Number(data.price || 0);
    var info = getTicketDetailInfo(id, data);
    detailInfo.innerHTML = "\n\n<div style=\"display:inline-block;text-align:left;line-height:1.9;\">\n    ".concat(info, "\n</div>\n\n");
    ticketElement
        .classList
        .remove("ticket-selected");
    showPage("detailPage");
    applyPaymentSetting();
}
// 動態票卡使用事件代理，不需重新綁定
document.addEventListener("click", function (event) {
    var ticket = event.target.closest(".ticket-btn,.ticket-btn-wide");
    if (!ticket)
        return;
    playClick();
    document
        .querySelectorAll(".ticket-btn,.ticket-btn-wide")
        .forEach(function (card) {
        card.classList.remove("ticket-selected");
    });
    ticket.classList.add("ticket-selected");
    setTimeout(function () {
        openTicketDetail(ticket);
    }, 150);
});
