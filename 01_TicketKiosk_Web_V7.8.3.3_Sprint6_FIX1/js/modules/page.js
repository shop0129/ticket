// V7 Phase 1 Legacy Build | js/modules/page.js
function showPage(pageId) {
    clearInterval(countdownTimer);
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });
    document
        .getElementById(pageId)
        .classList.add("active");
    resetIdleTimer();
}
function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
        // 如果不是首頁就回首頁
        if (!document.getElementById("homePage").classList.contains("active")) {
            showPage("homePage");
        }
    }, systemData.homeTimeout * 1000);
}
document.addEventListener("click", resetIdleTimer);
document.addEventListener("touchstart", resetIdleTimer);
document
    .getElementById("startBtn")
    .addEventListener("click", function () {
    playClick();
    setTimeout(function () {
        showPage("ticketPage");
    }, 100);
});
document
    .getElementById("backBtn")
    .addEventListener("click", function () {
    playClick();
    setTimeout(function () {
        showPage("homePage");
    }, 80);
});
