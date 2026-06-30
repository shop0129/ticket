// =====================================
// Monster Ticket System V3.8
// render.js
// =====================================

function createTicketCard(id){

    const ticket = ticketData[id];

    if(!ticket.enable) return "";

    return `
        <div class="ticket-card">

            <img
                src="${ticket.image}"
                class="ticket-btn"
                data-id="${id}"
                draggable="false">

            <div class="ticket-price">
                NT$${ticket.price}
            </div>

        </div>
    `;

}

function renderCategory(category, containerId){

    const container =
        document.getElementById(containerId);

    if(!container) return;

    let html = "";

    Object.keys(ticketData).forEach(id=>{

        const ticket = ticketData[id];

        if(ticket.category !== category) return;

        html += createTicketCard(id);

    });

    container.innerHTML = html;

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
