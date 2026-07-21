// V7 Phase 1 Legacy Build | js/modules/ticketCatalog.js
// =========================================
// 小怪獸售票機 V6.3.1
// 動態票券目錄
// =========================================
var ticketCategoryMap = {
    general: "ticketGeneralGrid",
    special: "ticketSpecialGrid",
    other: "ticketOtherGrid"
};
function isTicketVisibleByBusinessMode(id, ticket) {
    if (!ticket || ticket.enable === false) {
        return false;
    }
    var activeMode = (window.MonsterBusinessMode && MonsterBusinessMode.getCurrentMode)
        ? MonsterBusinessMode.getCurrentMode()
        : ((window.businessMode && businessMode.mode) || "weekday");

    // 新版票券可直接指定可販售模式；未設定則沿用舊票券相容規則。
    if (Array.isArray(ticket.allowedBusinessModes) && ticket.allowedBusinessModes.length) {
        return ticket.allowedBusinessModes.indexOf(activeMode) >= 0;
    }
    if (activeMode === "closed") {
        // 公休時只保留非入場商品，例如代幣、襪子、行動電源。
        return ticket.canEnter === false || ticket.admissionEnabled === false || ticket.timeMode === "none";
    }
    switch (activeMode) {
        case "weekday":
            return id !== "summer";
        case "holiday":
            return id !== "early" && id !== "summer";
        case "summer":
            return id !== "early";
        default:
            return true;
    }
}
function createTicketCard(id, ticket, status) {
    var imageSrc = resolveTicketImageSrc(ticket.image);
    status=status||{available:true,display:"normal",label:"可購買"};
    var cls=status.available?"":" ticket-sale-disabled ticket-sale-"+status.display;
    var badge=status.available?"":'<div class="ticket-sale-status">'+status.label+'</div>';
    if(status.available&&status.rule&&status.rule.showCountdown&&status.remainingMinutes!==null) badge+='<div class="ticket-sale-countdown">剩餘 '+MonsterSaleRule.formatCountdown(status.remainingMinutes)+'</div>';
    if(status.available&&status.remaining!==null&&status.remaining!==undefined) badge+='<div class="ticket-sale-limit">今日剩 '+status.remaining+' 張</div>';
    return "\n\n<div class=\"ticket-item"+cls+"\" data-ticket-id=\""+id+"\" data-sale-available=\""+(status.available?"1":"0")+"\" data-sale-message=\""+String(status.label||"").replace(/\"/g,"&quot;")+"\">\n<img src=\""+imageSrc+"\" class=\"ticket-btn\" data-id=\""+id+"\" alt=\""+(ticket.title||"票券")+"\">\n<div class=\"ticket-price\" id=\"price-"+id+"\">NT$"+Number(ticket.price||0)+"</div>"+badge+"\n</div>\n";
}
function renderTicketCatalog() {
    Object.values(ticketCategoryMap)
        .forEach(function (containerId) {
        var container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = "";
        }
    });
    var orderedTicketIds = (typeof getSortedTicketIds === "function")
        ? getSortedTicketIds()
        : Object.keys(ticketData || {}).sort(function(a,b){
            return Number(ticketData[a].sortOrder || 0) - Number(ticketData[b].sortOrder || 0);
        });
    orderedTicketIds.forEach(function(id) {
        var ticket = ticketData[id];
        if (!isTicketVisibleByBusinessMode(id, ticket)) return;
        var saleStatus=window.MonsterSaleRule?MonsterSaleRule.evaluate(id,ticket):{available:true,display:"normal",label:"可購買"};
        if(!saleStatus.available&&saleStatus.display==="hidden") return;
        var category = ticket.category || "other";
        var containerId = ticketCategoryMap[category] ||
            ticketCategoryMap.other;
        var container = document.getElementById(containerId);
        if (!container)
            return;
        container.insertAdjacentHTML("beforeend", createTicketCard(id, ticket, saleStatus));
    });
    updateEmptyTicketCategories();
}
function updateEmptyTicketCategories() {
    document
        .querySelectorAll(".ticket-category-section")
        .forEach(function (section) {
        var grid = section.querySelector(".ticket-grid");
        section.style.display =
            grid && grid.children.length > 0
                ? ""
                : "none";
    });
}
