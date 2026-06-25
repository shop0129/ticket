function showPage(pageId){

    document.querySelectorAll(".page").forEach(page=>{

        page.classList.remove("show");

    });

    document.getElementById(pageId).classList.add("show");

}

document.getElementById("startBtn").onclick=()=>{

    showPage("ticketPage");

}

document.getElementById("backBtn").onclick=()=>{

    showPage("homePage");

}

document.getElementById("detailBackBtn").onclick=()=>{

    showPage("ticketPage");

}

document
.querySelectorAll(".ticket-btn,.ticket-btn-wide")
.forEach(ticket=>{

    ticket.onclick=()=>{

        detailImage.src=ticket.src;

        detailTitle.innerHTML=ticket.dataset.title;

        detailPrice.innerHTML=ticket.dataset.price;

        detailInfo.innerHTML=ticket.dataset.info;

        showPage("detailPage");

    }

});

showPage("homePage");
