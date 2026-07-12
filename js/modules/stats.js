//==========================
// 營運中心
//==========================

function openTodayStats(){

    showPage("todayStatsPage");

    renderStats(todayStats);

}
// =========================================
// 更新統計
// =========================================

function updateStats(stats, ticket, item){

    stats.tickets++;

    stats.income += ticket.price;

    stats.tokens += ticket.token || 0;

    if(ticket.toy==="green"){

        stats.greenToy++;

    }

    if(ticket.toy==="red"){

        stats.redToy++;

    }

    if(item.id==="parent"){

        stats.parent++;

    }

}
//==========================
// 扣回統計
//==========================


function renderStats(data){

    document.getElementById("statsTickets").innerHTML =
    data.tickets + " 張";

    document.getElementById("statsIncome").innerHTML =
    "NT$" + data.income;

    document.getElementById("statsTokens").innerHTML =
    data.tokens + " 枚";

    document.getElementById("statsGreenToy").innerHTML =
    data.greenToy + " 個";

    document.getElementById("statsRedToy").innerHTML =
    data.redToy + " 個";

    document.getElementById("statsParent").innerHTML =
    data.parent + " 張";

}
function resetTodayStats(){

    if(!confirm("確定要將今日統計歸零？")){

        return;

    }

    todayStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(todayStats);

    alert("今日統計已歸零！");

}

function resetMonthStats(){

    if(!confirm("確定清除本月統計？")) return;

    monthStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(monthStats);

}
function resetAllStats(){

    if(!confirm("確定清除所有統計？")) return;

    todayStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    monthStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    totalStats={

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

    saveTodayStats();

    renderStats(todayStats);

}
