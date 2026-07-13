// =========================================
// 小怪獸售票機 V6.3
// 票券／商品管理
// =========================================

function openTicketManager(){

    renderTicketManager();

    showPage("ticketManagerPage");

}

function updateTicketButtons(){

    if(typeof renderTicketCatalog === "function"){
        renderTicketCatalog();
    }

}

function updateTicketPrices(){

    document
    .querySelectorAll(".ticket-btn")
    .forEach(btn=>{

        const id = btn.dataset.id;
        const price =
        document.getElementById("price-" + id);

        if(
            price &&
            ticketData[id]
        ){

            price.textContent =
            "NT$" +
            Number(ticketData[id].price || 0);

        }

    });

}

function getTicketCategoryLabel(category){

    const labels = {
        general:"一般票",
        special:"限定票",
        other:"其他票種"
    };

    return labels[category] || "其他票種";

}

function renderAddTicketPanel(){

    return `

<div class="ticket-add-card">

    <div class="ticket-add-title">
        ➕ 新增票券
    </div>

    <div class="ticket-add-text">
        新增後會立即出現在票券管理，儲存後同步到前台。
    </div>

    <button
        type="button"
        class="big-btn ticket-add-btn"
        onclick="addNewTicket()">
        新增一張票券
    </button>

</div>

`;

}

function renderTicketManager(){

    const table =
    document.getElementById("ticketTable");

    if(!table) return;

    let html =
    renderAddTicketPanel();

    for(const id in ticketData){

        const ticket =
        ticketData[id];

        html += `

<div
    class="tm-card ticket-manager-card"
    data-ticket-manager-id="${id}">

    <div class="tm-card-header">

        <div class="tm-card-title">
            ${ticket.title || id}
        </div>

        <div class="ticket-manager-actions">

            <label class="tm-enable">

                <input
                    type="checkbox"
                    id="enable-${id}"
                    ${ticket.enable !== false ? "checked" : ""}>

                啟用

            </label>

            ${
                ticket.custom
                ? `
                <button
                    type="button"
                    class="ticket-delete-btn"
                    onclick="deleteCustomTicket('${id}')">
                    🗑 刪除
                </button>
                `
                : ""
            }

        </div>

    </div>

    <div class="tm-preview">

        <img
            src="images/${ticket.image || imageList[0]}"
            class="tm-preview-img"
            id="preview-${id}">

        <div class="image-switch">

            <button
                type="button"
                class="imageArrow"
                onclick="changeTicketImage('${id}',-1)">
                ◀
            </button>

            <div
                class="tm-image-name"
                id="imageName-${id}">
                ${imageNames[ticket.image] || ticket.image || "未選擇"}
            </div>

            <button
                type="button"
                class="imageArrow"
                onclick="changeTicketImage('${id}',1)">
                ▶
            </button>

        </div>

    </div>

    <div class="ticket-manager-grid">

        <div class="tm-field ticket-title-field">

            <label>票券名稱</label>

            <input
                id="title-${id}"
                value="${escapeTicketValue(ticket.title)}">

        </div>

        <div class="tm-field">

            <label>分類</label>

            <select id="category-${id}">

                <option
                    value="general"
                    ${ticket.category === "general" ? "selected" : ""}>
                    一般票
                </option>

                <option
                    value="special"
                    ${ticket.category === "special" ? "selected" : ""}>
                    限定票
                </option>

                <option
                    value="other"
                    ${ticket.category === "other" ? "selected" : ""}>
                    其他票種
                </option>

            </select>

        </div>

        <div class="tm-field">

            <label>價格</label>

            <input
                id="priceInput-${id}"
                type="number"
                min="0"
                value="${Number(ticket.price || 0)}">

        </div>

        <div class="tm-field">

            <label>代幣</label>

            <input
                id="token-${id}"
                type="number"
                min="0"
                value="${Number(ticket.token || 0)}">

        </div>

        <div class="tm-field ticket-toy-field">

            <label>玩具</label>

            <div class="toy-group">

                <button
                    type="button"
                    class="toy-btn ${ticket.toy === "none" ? "active" : ""}"
                    onclick="setToy(event,'${id}','none')">
                    🚫 無
                </button>

                <button
                    type="button"
                    class="toy-btn ${ticket.toy === "green" ? "active" : ""}"
                    onclick="setToy(event,'${id}','green')">
                    🟢 綠標
                </button>

                <button
                    type="button"
                    class="toy-btn ${ticket.toy === "red" ? "active" : ""}"
                    onclick="setToy(event,'${id}','red')">
                    🔴 紅標
                </button>

            </div>

            <input
                type="hidden"
                id="toy-${id}"
                value="${ticket.toy || "none"}">

        </div>

        <div class="tm-field ticket-description-field">

            <label>票券說明</label>

            <textarea
                id="description-${id}"
                placeholder="例如：限平日使用、贈送代幣與玩具">${escapeTicketValue(ticket.description)}</textarea>

        </div>

    </div>

</div>

`;

    }

    table.innerHTML = html;

}

function escapeTicketValue(value){

    return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}

function addNewTicket(){

    playClick();

    const id =
    "custom_" + Date.now();

    ticketData[id] = {

        title:"新票券",

        price:0,

        token:0,

        toy:"none",

        reward:"",

        enable:true,

        image:imageList[0],

        category:"other",

        description:"",

        custom:true

    };

    renderTicketManager();

    setTimeout(()=>{

        const card =
        document.querySelector(
            `[data-ticket-manager-id="${id}"]`
        );

        if(card){

            card.scrollIntoView({
                behavior:"smooth",
                block:"center"
            });

            const input =
            document.getElementById(
                "title-" + id
            );

            if(input){

                input.focus();
                input.select();

            }

        }

    },50);

}

function deleteCustomTicket(id){

    playClick();

    const ticket =
    ticketData[id];

    if(!ticket || !ticket.custom){
        return;
    }

    if(
        !confirm(
            `確定刪除「${ticket.title}」？`
        )
    ){
        return;
    }

    delete ticketData[id];

    localStorage.setItem(
        "ticketData",
        JSON.stringify(ticketData)
    );

    renderTicketManager();

    updateTicketButtons();

}

function saveTicketManager(){

    for(const id in ticketData){

        const ticket =
        ticketData[id];

        ticket.enable =
        document.getElementById(
            `enable-${id}`
        ).checked;

        ticket.title =
        document.getElementById(
            `title-${id}`
        ).value.trim() || "未命名票券";

        ticket.category =
        document.getElementById(
            `category-${id}`
        ).value;

        ticket.price =
        Math.max(
            0,
            Number(
                document.getElementById(
                    `priceInput-${id}`
                ).value
            ) || 0
        );

        ticket.token =
        Math.max(
            0,
            Number(
                document.getElementById(
                    `token-${id}`
                ).value
            ) || 0
        );

        ticket.toy =
        document.getElementById(
            `toy-${id}`
        ).value;

        ticket.description =
        document.getElementById(
            `description-${id}`
        ).value.trim();

        ticket.reward =
        buildTicketReward(ticket);

    }

    localStorage.setItem(
        "ticketData",
        JSON.stringify(ticketData)
    );

    updateTicketButtons();

    updateTicketPrices();

    renderTicketManager();

    alert("✅ 票券設定已儲存");

}

function buildTicketReward(ticket){

    const rewards = [];

    if(Number(ticket.token || 0) > 0){
        rewards.push("token");
    }

    if(ticket.toy !== "none"){
        rewards.push("toy");
    }

    if(
        ticket.category === "general" ||
        ticket.category === "special"
    ){
        rewards.push("band");
    }

    return rewards.join(",");

}

function resetTicketManager(){

    if(!confirm("確定恢復預設票券？")){

        return;

    }

    localStorage.removeItem("ticketData");

    location.reload();

}

function setToy(clickEvent,id,toy){

    const hidden =
    document.getElementById(
        `toy-${id}`
    );

    if(!hidden) return;

    hidden.value = toy;

    const group =
    hidden.parentElement;

    group
    .querySelectorAll(".toy-btn")
    .forEach(button=>{

        button.classList.remove("active");

    });

    clickEvent.currentTarget
    .classList.add("active");

}

function changeTicketImage(id,step){

    const ticket =
    ticketData[id];

    if(!ticket) return;

    let index =
    imageList.indexOf(
        ticket.image
    );

    if(index === -1){
        index = 0;
    }

    index += step;

    if(index < 0){
        index = imageList.length - 1;
    }

    if(index >= imageList.length){
        index = 0;
    }

    ticket.image =
    imageList[index];

    const preview =
    document.getElementById(
        `preview-${id}`
    );

    const name =
    document.getElementById(
        `imageName-${id}`
    );

    if(preview){
        preview.src =
        "images/" + ticket.image;
    }

    if(name){
        name.textContent =
        imageNames[ticket.image] ||
        ticket.image;
    }

}
