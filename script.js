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
// 點選票卡
// ==========================

document
.querySelectorAll(".ticket-btn,.ticket-btn-wide")
.forEach(ticket=>{

    ticket.onclick=function(){

        document.getElementById("detailImage").src=this.src;

        document.getElementById("detailTitle").innerHTML=this.dataset.title;

        document.getElementById("detailPrice").innerHTML=this.dataset.price;

        document.getElementById("detailInfo").innerHTML=this.dataset.info;

        showPage("detailPage");

    };

});

// ==========================
// 詳細頁返回
// ==========================

document.getElementById("detailBackBtn").onclick=function(){

    showPage("ticketPage");

}

// ==========================
// 啟動
// ==========================

showPage("homePage");
