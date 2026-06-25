// ==========================
// 頁面切換
// ==========================

function showPage(pageId){

    document.querySelectorAll(".page").forEach(page=>{

        page.style.display="none";

    });

    document.getElementById(pageId).style.display="flex";

}

// ==========================
// 首頁
// ==========================

document.getElementById("startBtn").onclick=function(){

    showPage("ticketPage");

}

// ==========================
// 返回首頁
// ==========================

document.getElementById("backBtn").onclick=function(){

    showPage("homePage");

}

// ==========================
// 啟動
// ==========================

showPage("homePage");
// ==========================
// 點票卡
// ==========================

document.querySelectorAll(".ticket-btn,.ticket-btn-wide")

.forEach(ticket=>{

    ticket.onclick=function(){

        alert(

            this.dataset.title +

            "\n\n價格：" +

            this.dataset.price

        );

    }

});
