//==========================
// 營運中心
//==========================

function openTodayStats(){

    showPage("todayStatsPage");

    setStatsTabActive("today");

    renderStats(todayStats);

}

// =========================================
// 更新統計
// =========================================

function updateStats(stats, ticket, item){

    if(!stats || !ticket || !item) return;

    stats.tickets =
        Number(stats.tickets || 0) + 1;

    stats.income =
        Number(stats.income || 0) +
        Number(ticket.price || 0);

    stats.tokens =
        Number(stats.tokens || 0) +
        Number(ticket.token || 0);

    if(ticket.toy === "green"){

        stats.greenToy =
            Number(stats.greenToy || 0) + 1;

    }

    if(ticket.toy === "red"){

        stats.redToy =
            Number(stats.redToy || 0) + 1;

    }

    if(item.id === "parent"){

        stats.parent =
            Number(stats.parent || 0) + 1;

    }

}

//==========================
// 顯示統計
//==========================

function renderStats(data){

    if(!data) return;

    const values = {

        statsTickets:
            `${formatStatsNumber(data.tickets)} 張`,

        statsIncome:
            `NT$${formatStatsNumber(data.income)}`,

        statsTokens:
            `${formatStatsNumber(data.tokens)} 枚`,

        statsGreenToy:
            `${formatStatsNumber(data.greenToy)} 個`,

        statsRedToy:
            `${formatStatsNumber(data.redToy)} 個`,

        statsParent:
            `${formatStatsNumber(data.parent)} 張`

    };

    for(const id in values){

        const element =
            document.getElementById(id);

        if(element){

            element.innerHTML =
                values[id];

        }

    }

    renderStatsDate(data);

}

//==========================
// 統計數字格式
//==========================

function formatStatsNumber(value){

    return Number(value || 0)
        .toLocaleString("zh-TW");

}

//==========================
// 顯示統計日期
//==========================

function renderStatsDate(data){

    const dateBox =
        document.getElementById("statsDate");

    if(!dateBox) return;

    const today =
        new Date();

    const week = [

        "星期日",
        "星期一",
        "星期二",
        "星期三",
        "星期四",
        "星期五",
        "星期六"

    ];

    if(data === todayStats){

        dateBox.innerHTML =
            `📅 ${today.toLocaleDateString("zh-TW")}（${week[today.getDay()]}）`;

        setStatsTabActive("today");

    }else if(data === monthStats){

        dateBox.innerHTML =
            `📅 ${today.getFullYear()} 年 ${today.getMonth()+1} 月`;

        setStatsTabActive("month");

    }else{

        dateBox.innerHTML =
            `📅 累積至 ${today.toLocaleDateString("zh-TW")}（${week[today.getDay()]}）`;

        setStatsTabActive("total");

    }

}

//==========================
// 頁籤狀態
//==========================

function setStatsTabActive(type){

    const tabs = {

        today:
            document.getElementById("todayTab"),

        month:
            document.getElementById("monthTab"),

        total:
            document.getElementById("totalTab")

    };

    for(const key in tabs){

        if(!tabs[key]) continue;

        tabs[key].classList.toggle(
            "active",
            key === type
        );

    }

}

//==========================
// 今日統計歸零
//==========================

function resetTodayStats(){

    if(!confirm("確定要將今日統計歸零？")){

        return;

    }

    todayStats =
        createEmptyStats();

    saveTodayStats();

    renderStats(todayStats);

    alert("✅ 今日統計已歸零");

}

//==========================
// 本月統計歸零
//==========================

function resetMonthStats(){

    if(!confirm("確定清除本月統計？")){

        return;

    }

    monthStats =
        createEmptyStats();

    saveTodayStats();

    renderStats(monthStats);

    alert("✅ 本月統計已歸零");

}

//==========================
// 所有統計歸零
//==========================

function resetAllStats(){

    if(!confirm("確定清除今日、本月及累積統計？")){

        return;

    }

    todayStats =
        createEmptyStats();

    monthStats =
        createEmptyStats();

    totalStats =
        createEmptyStats();

    saveTodayStats();

    renderStats(todayStats);

    alert("✅ 所有統計已歸零");

}

//==========================
// 建立空白統計
//==========================

function createEmptyStats(){

    return {

        tickets:0,

        income:0,

        tokens:0,

        greenToy:0,

        redToy:0,

        parent:0

    };

}
