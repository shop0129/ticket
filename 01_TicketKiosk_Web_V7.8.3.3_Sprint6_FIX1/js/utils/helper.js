// V7 Phase 1 Legacy Build | js/utils/helper.js
function generateOrderNo() {
    var orderIndex = Number(localStorage.getItem("orderIndex")) || 1;
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    var orderNo = "M" +
        y +
        m +
        d +
        String(orderIndex).padStart(4, "0");
    localStorage.setItem("orderIndex", orderIndex + 1);
    return orderNo;
}
function playClick() {
    var click = document.getElementById("clickSound");
    click.pause();
    click.currentTime = 0;
    click.play().catch(function () { });
}
