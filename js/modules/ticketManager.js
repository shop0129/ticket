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

        const item = btn.closest(".ticket-item");

        let enable =
            ticketData[id] &&
            ticketData[id].enable;

        //==========================
        // 營業模式
        //==========================

        if(enable){

            switch(businessMode.mode){

                case "weekday":

                    // 平日：隱藏寒暑假票
                    if(id==="summer"){

                        enable = false;

                    }

                    break;

                case "holiday":

                    // 假日：隱藏早鳥、寒暑假
                    if(id==="early" || id==="summer"){

                        enable = false;

                    }

                    break;

                case "summer":

                    // 寒暑假：隱藏早鳥
                    if(id==="early"){

                        enable = false;

                    }

                    break;

                case "event":

                    // 之後特殊活動
                    break;

            }

        }

        if(enable){

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
// =========================================
// 儲存票券設定
// =========================================

function saveTicketManager(){

    for(const id in ticketData){

        ticketData[id].enable =
            document.getElementById(`enable-${id}`).checked;

        ticketData[id].title =
            document.getElementById(`title-${id}`).value;

        ticketData[id].price =
            Number(
                document.getElementById(`priceInput-${id}`).value
            );

        ticketData[id].token =
Number(document.getElementById(`token-${id}`).value);

    ticketData[id].toy =
document.getElementById(`toy-${id}`).value;
    }

    localStorage.setItem(
        "ticketData",
        JSON.stringify(ticketData)
    );

    updateTicketButtons();

    updateTicketPrices();

    alert("✅ 票券設定已儲存");

}
// =========================================
// 恢復預設票券
// =========================================

function resetTicketManager(){

    if(!confirm("確定恢復預設票券？")){

        return;

    }

    localStorage.removeItem("ticketData");

    location.reload();

}
function setToy(id,toy){

    document
    .getElementById(`toy-${id}`)
    .value = toy;

    const group =
    document
    .getElementById(`toy-${id}`)
    .parentElement;

    group
    .querySelectorAll(".toy-btn")
    .forEach(btn=>{

        btn.classList.remove("active");

    });

    event.target.classList.add("active");

}
function changeTicketImage(id,step){

    const ticket=ticketData[id];

    let index=imageList.indexOf(ticket.image);

    if(index==-1){

        index=0;

    }

    index+=step;

    if(index<0){

        index=imageList.length-1;

    }

    if(index>=imageList.length){

        index=0;

    }

    ticket.image=imageList[index];

    document
    .getElementById(`preview-${id}`)
    .src="images/"+ticket.image;

    document
    .getElementById(`imageName-${id}`)
    .innerHTML=
    imageNames[ticket.image];

}
