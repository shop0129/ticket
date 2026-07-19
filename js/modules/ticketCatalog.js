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
function createTicketCard(id, ticket) {
    var imageSrc = resolveTicketImageSrc(ticket.image);
    return "\n\n<div class=\"ticket-item\" data-ticket-id=\"".concat(id, "\">\n\n    <img\n        src=\"").concat(imageSrc, "\"\n        class=\"ticket-btn\"\n        data-id=\"").concat(id, "\"\n        alt=\"").concat(ticket.title || "票券", "\">\n\n    <div\n        class=\"ticket-price\"\n        id=\"price-").concat(id, "\">\n        NT$").concat(Number(ticket.price || 0), "\n    </div>\n\n</div>\n\n");
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
        if (!isTicketVisibleByBusinessMode(id, ticket)) {
            return;
        }
        var category = ticket.category || "other";
        var containerId = ticketCategoryMap[category] ||
            ticketCategoryMap.other;
        var container = document.getElementById(containerId);
        if (!container)
            return;
        container.insertAdjacentHTML("beforeend", createTicketCard(id, ticket));
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
