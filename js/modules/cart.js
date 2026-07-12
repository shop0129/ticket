const checkoutBtn = document.getElementById("checkoutBtn");
const paymentArea = document.getElementById("paymentArea");
const cartLineBtn = document.getElementById("cartLineBtn");
const cartCashBtn = document.getElementById("cartCashBtn");
const cartBackBtn = document.getElementById("cartBackBtn");
function addCurrentTicketToCart(){

    if(!selectedTicket) return;

    const ticket = ticketData[selectedTicket];

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
function updateCartPanel(){

    const count=document.getElementById("cartCount");
    const items=document.getElementById("cartItems");
    const amount=document.getElementById("cartAmount");

    let total=0;

    const summary={};

    cart.forEach(ticket=>{

        total+=ticket.price;

        if(!summary[ticket.id]){

            summary[ticket.id]={

                title:ticket.title,

                qty:0,

                amount:0

            };

        }
      function changeQty(id,step){

    if(step>0){

        const ticket=ticketData[id];

        cart.push({

            id:id,

            title:ticket.title,

            price:ticket.price,

            token:ticket.token||0,

            toy:ticket.toy||"none",

            reward:ticket.reward||""

        });

    }else{

        const index=cart.findIndex(x=>x.id===id);

        if(index!=-1){

            cart.splice(index,1);

        }

    }

    updateCartPanel();

}


function removeCartItem(id){

    cart=cart.filter(x=>x.id!==id);

    updateCartPanel();

}
      checkoutBtn.addEventListener("click",()=>{

    if(cart.length===0){

        alert("請先加入票券！");

        return;

    }

    checkoutBtn.style.display="none";

    paymentArea.style.display="flex";

});

cartBackBtn.addEventListener("click",()=>{

    paymentArea.style.display="none";

    checkoutBtn.style.display="block";

});
      bindPaymentButton(cartLineBtn,"LINE Pay");

bindPaymentButton(cartCashBtn,"現金");
