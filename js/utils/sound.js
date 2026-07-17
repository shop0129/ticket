// V7 Phase 1 Legacy Build | js/utils/sound.js
// =========================================
// Monster Ticket V5
// sound.js
// 音效
// =========================================
function playClick() {
    var click = document.getElementById("clickSound");
    click.pause();
    click.currentTime = 0;
    click.play().catch(function () { });
}
function playSuccess() {
    var sound = document.getElementById("successSound");
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(function () { });
}
