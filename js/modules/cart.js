// =========================================
// 小怪獸售票機 V5.6.5
// 購物車模組
// =========================================

const cartCount =
document.getElementById("cartCount");

const cartItems =
document.getElementById("cartItems");

const cartAmount =
document.getElementById("cartAmount");

const checkoutBtn =
document.getElementById("checkoutBtn");

const paymentArea =
document.getElementById("paymentArea");

const cartLineBtn =
document.getElementById("cartLineBtn");

const cartCashBtn =
document.getElementById("cartCashBtn");

const cartBackBtn =
document.getElementById("cartBackBtn");

// =========================================
// 加入目前票券
// =========================================
function addCurrentTicketToCart(){

    playClick();

    if(!selectedTicket) return;

    const ticket =
    ticketData[selectedTicket];

    if(!ticket) return;

    cart.push({

        id:selectedTicket,

        title:ticket.title,

        price:ticket.price,

        token:ticket.token || 0,

        toy:ticket.toy || "none",

        reward:ticket.reward || ""

    });

    updateCartPanel();

    showPage("ticketPage");

}

// =========================================
// 更新購物車畫面
// =========================================
function updateCartPanel(){

    if(
        !cartCount ||
        !cartItems ||
        !cartAmount
    ){

        return;

    }

    let total = 0;

    const summary = {};

    cart.forEach(ticket=>{

        total +=
        Number(ticket.price || 0);

        if(!summary[ticket.id]){

            summary[ticket.id] = {

                title:ticket.title,

                qty:0,

                amount:0

            };

        }

        summary[ticket.id].qty++;

        summary[ticket.id].amount +=
        Number(ticket.price || 0);

    });

    let html = "";

    for(const id in summary){

        const item =
        summary[id];

        html += `

<div class="cartRow">

    <div class="cartTop">

        <div class="cartTitle">
            ${item.title}
        </div>

        <div class="cartPrice">
            NT$${item.amount}
        </div>

    </div>

    <div class="cartBottom">

        <div class="qtyBox">

            <button
                class="qtyBtn"
                onclick="changeQty('${id}',-1)">
                −
            </button>

            <div class="qtyNumber">
                ${item.qty}
            </div>

            <button
                class="qtyBtn"
                onclick="changeQty('${id}',1)">
                +
            </button>

        </div>

        <button
            class="deleteBtn"
            onclick="removeCartItem('${id}')">
            ✕
        </button>

    </div>

</div>

`;

    }

    cartCount.innerHTML =
    `🛒 購物車（共 ${cart.length} 張）`;

    cartItems.innerHTML =
    html;

    cartAmount.innerHTML = `

<div class="cartTotalPrice">
    NT$${total}
</div>

`;

    applyPaymentSetting();

}

// =========================================
// 修改票券數量
// =========================================
function changeQty(id,step){

    playClick();

    if(step > 0){

        const ticket =
        ticketData[id];

        if(!ticket) return;

        cart.push({

            id:id,

            title:ticket.title,

            price:ticket.price,

            token:ticket.token || 0,

            toy:ticket.toy || "none",

            reward:ticket.reward || ""

        });

    }else{

        const index =
        cart.findIndex(
            item =>
            item.id === id
        );

        if(index !== -1){

            cart.splice(index,1);

        }

    }

    updateCartPanel();

}

// =========================================
// 刪除同票種
// =========================================
function removeCartItem(id){

    playClick();

    cart =
    cart.filter(
        item =>
        item.id !== id
    );

    updateCartPanel();

}

// =========================================
// 前往付款
// =========================================
if(checkoutBtn){

    checkoutBtn.addEventListener("click",()=>{

        playClick();

        if(cart.length === 0){

            alert("請先加入票券！");

            return;

        }

        checkoutBtn.style.display =
        "none";

        paymentArea.style.display =
        "flex";

    });

}

// =========================================
// 返回購物車
// =========================================
if(cartBackBtn){

    cartBackBtn.addEventListener("click",()=>{

        playClick();

        paymentArea.style.display =
        "none";

        checkoutBtn.style.display =
        "block";

    });

}

// =========================================
// 購物車付款
// =========================================
if(cartLineBtn){

    cartLineBtn.addEventListener("click",()=>{

        playClick();

        paymentSuccess("LINE Pay");

    });

}

if(cartCashBtn){

    cartCashBtn.addEventListener("click",()=>{

        playClick();

        paymentSuccess("現金");

    });

}
