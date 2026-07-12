function openTicketManager(){

    renderTicketManager();

    showPage("ticketManagerPage");

}
//==========================
// 更新票券顯示 / 圖片
//==========================

function updateTicketButtons(){

    document
    .querySelectorAll(".ticket-btn,.ticket-btn-wide")
    .forEach(btn=>{

        const id = btn.dataset.id;

        if(!id) return;

        // ===== 更新圖片 =====
        if(ticketData[id] && ticketData[id].image){

            btn.src = "images/" + ticketData[id].image;

        }

        // ===== 控制顯示 =====
        const item = btn.closest(".ticket-item");

        if(ticketData[id] && ticketData[id].enable){

            if(item){

                item.style.display = "";

            }else{

                btn.style.display = "";

            }

        }else{

            if(item){

                item.style.display = "none";

            }else{

                btn.style.display = "none";

            }

        }

    });

}
//==========================
// 更新票價
//==========================

function updateTicketPrices(){

    document
    .querySelectorAll(".ticket-btn")
    .forEach(btn=>{

        const id = btn.dataset.id;

        const price =
        document.getElementById("price-"+id);

        if(!price) return;

        price.innerHTML =
        "NT$" + ticketData[id].price;

    });

}
function renderTicketManager(){

    const table = document.getElementById("ticketTable");

    table.innerHTML = "";

    
    for(const id in ticketData){

        const ticket = ticketData[id];

        table.innerHTML += `

        <div class="tm-card">

            <div class="tm-card-header">

    <div class="tm-card-title">

        ${ticketNames[id]}

    </div>

    <label class="tm-enable">

        <input
            type="checkbox"
            id="enable-${id}"
            ${ticket.enable ? "checked" : ""}>

        啟用

    </label>

</div>

<div class="tm-preview">

    <img
        src="images/${ticket.image}"
        class="tm-preview-img"
        id="preview-${id}">

    <div class="image-switch">

        <button
            class="imageArrow"
            onclick="changeTicketImage('${id}',-1)">

            ◀

        </button>

        <div
            class="tm-image-name"
            id="imageName-${id}">

            ${imageNames[ticket.image] || ticket.image}

        </div>

        <button
            class="imageArrow"
            onclick="changeTicketImage('${id}',1)">

            ▶

        </button>

    </div>

</div>

</div>


            <div class="tm-field">

                <label>票名</label>

                <input
                    id="title-${id}"
                    value="${ticket.title}">

            </div>

           <div class="tm-field">

    <label>價格</label>

    <input
        id="priceInput-${id}"
        type="number"
        value="${Number.isFinite(ticket.price) ? ticket.price : 0}">

</div>

                <div class="tm-field">

    <label>玩具</label>

    <div class="toy-group">

        <button
            type="button"
            class="toy-btn ${ticket.toy=="none"?"active":""}"
            onclick="setToy('${id}','none')">

            🚫 無

        </button>

        <button
            type="button"
            class="toy-btn ${ticket.toy=="green"?"active":""}"
            onclick="setToy('${id}','green')">

            🟢 綠標

        </button>

        <button
            type="button"
            class="toy-btn ${ticket.toy=="red"?"active":""}"
            onclick="setToy('${id}','red')">

            🔴 紅標

        </button>

    </div>

    <input
        type="hidden"
        id="toy-${id}"
        value="${ticket.toy}">

</div>

                <div class="tm-field">

                    <label>代幣</label>

                    <input
                        id="token-${id}"
                        type="number"
                        value="${Number.isFinite(ticket.token) ? ticket.token : 0}">

                </div>

            </div>

        </div>

        `;

    }

}
