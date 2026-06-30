// ==========================
// Render Engine
// ==========================

function getTicket(id){

    return ticketData[id];

}

function renderTicketCard(id){

    const ticket = getTicket(id);

    if(!ticket.enable){

        return "";

    }

    return `
    <div class="ticket-card">

        <img
            src="${ticket.image}"
            class="ticket-btn"
            data-id="${id}">

        <div class="ticket-price">

            NT$${ticket.price}

        </div>

    </div>
    `;

}

function renderCategory(category,containerId){

    const container =
    document.getElementById(containerId);

    let html="";

    for(const id in ticketData){

        const ticket=ticketData[id];

        if(ticket.category!==category){

            continue;

        }

        html+=renderTicketCard(id);

    }

    container.innerHTML=html;

}

function renderAllTickets(){

    renderCategory(
        "general",
        "generalTicketContainer"
    );

    renderCategory(
        "event",
        "eventTicketContainer"
    );

    renderCategory(
        "other",
        "otherTicketContainer"
    );

}
