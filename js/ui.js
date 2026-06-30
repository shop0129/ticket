// ==========================
// UI Engine
// ==========================

function createTicket(ticketId,data){

    return `
        <div class="ticket-card">

            <img
                src="${data.image}"
                class="ticket-btn"
                data-id="${ticketId}">

            <div class="ticket-price">

                NT$${data.price}

            </div>

        </div>
    `;

}

function renderTickets(){

    const general =
    document.getElementById("generalTicketContainer");

    const event =
    document.getElementById("eventTicketContainer");

    const other =
    document.getElementById("otherTicketContainer");

    let generalHtml="";
    let eventHtml="";
    let otherHtml="";

    for(const id in ticketData){

        const ticket=ticketData[id];

        if(!ticket.enable) continue;

        if(ticket.category==="general"){

            generalHtml+=createTicket(id,ticket);

        }

        if(ticket.category==="event"){

            eventHtml+=createTicket(id,ticket);

        }

        if(ticket.category==="other"){

            otherHtml+=createTicket(id,ticket);

        }

    }

    general.innerHTML=generalHtml;

    event.innerHTML=eventHtml;

    other.innerHTML=otherHtml;

}
