function saveTodayStats(){

    localStorage.setItem(
        "todayStats",
        JSON.stringify(todayStats)
    );

    localStorage.setItem(
        "monthStats",
        JSON.stringify(monthStats)
    );

    localStorage.setItem(
        "totalStats",
        JSON.stringify(totalStats)
    );

}



// =========================================
// 小怪獸售票機 V5.6.6
// Storage Module
// =========================================

function saveTicketData(){
    localStorage.setItem(
        "ticketData",
        JSON.stringify(ticketData)
    );
}

function saveSalesHistory(){
    localStorage.setItem(
        "salesHistory",
        JSON.stringify(salesHistory)
    );
}

function saveSystemSetting(){
    localStorage.setItem(
        "systemData",
        JSON.stringify(systemData)
    );
}

function saveBusinessMode(){
    localStorage.setItem(
        "businessData",
        JSON.stringify(businessData)
    );
}

function loadStorage(key, defaultValue){
    try{
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    }catch(e){
        console.warn("Storage parse error:", key, e);
        return defaultValue;
    }
}
