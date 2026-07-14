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
    switch (businessMode.mode) {
        case "weekday":
            return id !== "summer";
        case "holiday":
            return id !== "early" &&
                id !== "summer";
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
    for (var id in ticketData) {
        var ticket = ticketData[id];
        if (!isTicketVisibleByBusinessMode(id, ticket)) {
            continue;
        }
        var category = ticket.category || "other";
        var containerId = ticketCategoryMap[category] ||
            ticketCategoryMap.other;
        var container = document.getElementById(containerId);
        if (!container)
            continue;
        container.insertAdjacentHTML("beforeend", createTicketCard(id, ticket));
    }
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
