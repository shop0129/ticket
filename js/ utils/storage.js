alert("storage loaded");
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
