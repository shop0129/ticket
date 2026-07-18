// V7 Phase 1 Legacy Build | js/modules/cart.js
// =========================================
// 小怪獸售票機 V5.6.5
// 購物車模組
// =========================================
var cartCount = document.getElementById("cartCount");
var cartItems = document.getElementById("cartItems");
var cartAmount = document.getElementById("cartAmount");
var checkoutBtn = document.getElementById("checkoutBtn");
var paymentArea = document.getElementById("paymentArea");
var cartLineBtn = document.getElementById("cartLineBtn");
var cartCashBtn = document.getElementById("cartCashBtn");
var cartBackBtn = document.getElementById("cartBackBtn");
// =========================================
// 加入目前票券
// =========================================
function addCurrentTicketToCart() {
    playClick();
    if (!selectedTicket)
        return;
    var ticket = ticketData[selectedTicket];
    if (!ticket)
        return;
    cart.push({
        id: selectedTicket,
        title: ticket.title,
        price: ticket.price,
        token: ticket.token || 0,
        toy: ticket.toy || "none",
        reward: ticket.reward || "",
        canEnter: ticket.canEnter !== false,
        admissionRequired: ticket.canEnter !== false,
        pickupItem: ticket.pickupItem || "none"
    });
    updateCartPanel();
    showPage("ticketPage");
}
// =========================================
// 更新購物車畫面
// =========================================
function updateCartPanel() {
    if (!cartCount ||
        !cartItems ||
        !cartAmount) {
        return;
    }
    var total = 0;
    var summary = {};
    cart.forEach(function (ticket) {
        total +=
            Number(ticket.price || 0);
        if (!summary[ticket.id]) {
            summary[ticket.id] = {
                title: ticket.title,
                qty: 0,
                amount: 0
            };
        }
        summary[ticket.id].qty++;
        summary[ticket.id].amount +=
            Number(ticket.price || 0);
    });
    var html = "";
    for (var id in summary) {
        var item = summary[id];
        html += "\n\n<div class=\"cartRow\">\n\n    <div class=\"cartTop\">\n\n        <div class=\"cartTitle\">\n            ".concat(item.title, "\n        </div>\n\n        <div class=\"cartPrice\">\n            NT$").concat(item.amount, "\n        </div>\n\n    </div>\n\n    <div class=\"cartBottom\">\n\n        <div class=\"qtyBox\">\n\n            <button\n                class=\"qtyBtn\"\n                onclick=\"changeQty('").concat(id, "',-1)\">\n                \u2212\n            </button>\n\n            <div class=\"qtyNumber\">\n                ").concat(item.qty, "\n            </div>\n\n            <button\n                class=\"qtyBtn\"\n                onclick=\"changeQty('").concat(id, "',1)\">\n                +\n            </button>\n\n        </div>\n\n        <button\n            class=\"deleteBtn\"\n            onclick=\"removeCartItem('").concat(id, "')\">\n            \u2715\n        </button>\n\n    </div>\n\n</div>\n\n");
    }
    cartCount.innerHTML =
        "\uD83D\uDED2 \u8CFC\u7269\u8ECA\uFF08\u5171 ".concat(cart.length, " \u5F35\uFF09");
    cartItems.innerHTML =
        html;
    cartAmount.innerHTML = "\n\n<div class=\"cartTotalPrice\">\n    NT$".concat(total, "\n</div>\n\n");
    applyPaymentSetting();
}
// =========================================
// 修改票券數量
// =========================================
function changeQty(id, step) {
    playClick();
    if (step > 0) {
        var ticket = ticketData[id];
        if (!ticket)
            return;
        cart.push({
            id: id,
            title: ticket.title,
            price: ticket.price,
            token: ticket.token || 0,
            toy: ticket.toy || "none",
            reward: ticket.reward || ""
        });
    }
    else {
        var index = cart.findIndex(function (item) {
            return item.id === id;
        });
        if (index !== -1) {
            cart.splice(index, 1);
        }
    }
    updateCartPanel();
}
// =========================================
// 刪除同票種
// =========================================
function removeCartItem(id) {
    playClick();
    cart =
        cart.filter(function (item) {
            return item.id !== id;
        });
    updateCartPanel();
}
// =========================================
// 前往付款
// =========================================
if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function () {
        playClick();
        if (cart.length === 0) {
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
if (cartBackBtn) {
    cartBackBtn.addEventListener("click", function () {
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
if (cartLineBtn) {
    cartLineBtn.addEventListener("click", function () {
        playClick();
        paymentSuccess("LINE Pay");
    });
}
if (cartCashBtn) {
    cartCashBtn.addEventListener("click", function () {
        playClick();
        paymentSuccess("現金");
    });
}
