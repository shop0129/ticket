// =========================================
// 小怪獸售票機 V6.3
// 動態票券目錄
// =========================================

const ticketCategoryMap = {
    general:"ticketGeneralGrid",
    special:"ticketSpecialGrid",
    other:"ticketOtherGrid"
};

function isTicketVisibleByBusinessMode(id,ticket){

    if(!ticket || ticket.enable === false){
        return false;
    }

    switch(businessMode.mode){

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

function createTicketCard(id,ticket){

    const image =
    ticket.image || "ticket-2h-green.png";

    return `

<div class="ticket-item" data-ticket-id="${id}">

    <img
        src="images/${image}"
        class="ticket-btn"
        data-id="${id}"
        alt="${ticket.title || "票券"}">

    <div
        class="ticket-price"
        id="price-${id}">
        NT$${Number(ticket.price || 0)}
    </div>

</div>

`;

}

function renderTicketCatalog(){

    Object.values(ticketCategoryMap)
    .forEach(containerId=>{

        const container =
        document.getElementById(containerId);

        if(container){
            container.innerHTML = "";
        }

    });

    for(const id in ticketData){

        const ticket =
        ticketData[id];

        if(!isTicketVisibleByBusinessMode(id,ticket)){
            continue;
        }

        const category =
        ticket.category || "other";

        const containerId =
        ticketCategoryMap[category] ||
        ticketCategoryMap.other;

        const container =
        document.getElementById(containerId);

        if(!container) continue;

        container.insertAdjacentHTML(
            "beforeend",
            createTicketCard(id,ticket)
        );

    }

    updateEmptyTicketCategories();

}

function updateEmptyTicketCategories(){

    document
    .querySelectorAll(".ticket-category-section")
    .forEach(section=>{

        const grid =
        section.querySelector(".ticket-grid");

        section.style.display =
        grid && grid.children.length > 0
        ? ""
        : "none";

    });

}
