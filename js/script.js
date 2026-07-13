// =========================================
// 小怪獸售票機 V5.6.5
// 主程式
// =========================================

const todayTab =
document.getElementById("todayTab");

const monthTab =
document.getElementById("monthTab");

const totalTab =
document.getElementById("totalTab");

// =========================================
// 扣回統計（作廢訂單）
// =========================================
function rollbackStats(stats,ticket,item){

    stats.tickets =
    Math.max(
        0,
        stats.tickets - 1
    );

    stats.income =
    Math.max(
        0,
        stats.income -
        Number(ticket.price || 0)
    );

    stats.tokens =
    Math.max(
        0,
        stats.tokens -
        Number(ticket.token || 0)
    );

    if(ticket.toy === "green"){

        stats.greenToy =
        Math.max(
            0,
            stats.greenToy - 1
        );

    }

    if(ticket.toy === "red"){

        stats.redToy =
        Math.max(
            0,
            stats.redToy - 1
        );

    }

    if(item.id === "parent"){

        stats.parent =
        Math.max(
            0,
            stats.parent - 1
        );

    }

}

// =========================================
// 管理員登入
// =========================================
function loginAdmin(){

    const input =
    document.getElementById(
        "adminLoginPassword"
    );

    if(!input) return;

    const password =
    input.value;

    input.value = "";

    if(
        password ===
        systemData.adminPassword
    ){

        showPage(
            "adminHomePage"
        );

    }else{

        alert("❌ 密碼錯誤");

    }

}

// =========================================
// 統計分頁
// =========================================
if(todayTab){

    todayTab.addEventListener("click",()=>{

        playClick();

        renderStats(todayStats);

        todayTab.classList.add("active");

        monthTab.classList.remove("active");

        totalTab.classList.remove("active");

    });

}

if(monthTab){

    monthTab.addEventListener("click",()=>{

        playClick();

        renderStats(monthStats);

        todayTab.classList.remove("active");

        monthTab.classList.add("active");

        totalTab.classList.remove("active");

    });

}

if(totalTab){

    totalTab.addEventListener("click",()=>{

        playClick();

        renderStats(totalStats);

        todayTab.classList.remove("active");

        monthTab.classList.remove("active");

        totalTab.classList.add("active");

    });

}


// =========================================
// 後台按鍵音效
// =========================================

// 防止同一次點擊被多個事件重複播放
const originalPlayClick = playClick;

let lastClickSoundTime = 0;

window.playClick = function(){

    const now = Date.now();

    if(now - lastClickSoundTime < 100){

        return;

    }

    lastClickSoundTime = now;

    originalPlayClick();

};

// 後台頁面所有按鈕統一播放點擊音效
document.addEventListener("click",(event)=>{

    const button =
    event.target.closest("button");

    if(!button) return;

    const adminPage =
    button.closest(`
        #adminLoginPage,
        #adminHomePage,
        #ticketManagerPage,
        #businessModePage,
        #systemSettingPage,
        #todayStatsPage,
        #salesHistoryPage,
        #orderDetailPage,
        #dataManagerPage
    `);

    if(!adminPage) return;

    playClick();

},true);

// =========================================
// 啟動
// =========================================
showPage("homePage");

applyPaymentSetting();

updateTicketButtons();

updateTicketPrices();

updateCartPanel();
