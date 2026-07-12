// =========================================
// Monster Ticket V5
// sound.js
// 音效
// =========================================

function playClick(){

    const click = document.getElementById("clickSound");

    click.pause();

    click.currentTime = 0;

    click.play().catch(()=>{});

}

function playSuccess(){

    const sound = document.getElementById("successSound");

    sound.pause();

    sound.currentTime = 0;

    sound.play().catch(()=>{});

}
