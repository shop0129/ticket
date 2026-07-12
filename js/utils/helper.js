function generateOrderNo(){

    let orderIndex = Number(localStorage.getItem("orderIndex")) || 1;

    const now = new Date();

    const y = now.getFullYear();

    const m = String(now.getMonth()+1).padStart(2,"0");

    const d = String(now.getDate()).padStart(2,"0");

    const orderNo =
        "M" +
        y +
        m +
        d +
        String(orderIndex).padStart(4,"0");

    localStorage.setItem("orderIndex", orderIndex + 1);

    return orderNo;

}
function playClick(){

    const click = document.getElementById("clickSound");

    click.pause();

    click.currentTime = 0;

    click.play().catch(function(){});

}
