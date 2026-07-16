// V7.3 Phase 3F Part 2 | 完整營運 Dashboard
var dashboardPeriod = "today";

function formatDashboardAmount(value) {
    return Number(value || 0).toLocaleString("zh-TW");
}
function dashboardParseDate(value) {
    if (!value) return null;
    var parts = String(value).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!parts) return null;
    return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}
function dashboardOrderInPeriod(order, period) {
    if (period === "all") return true;
    var date = dashboardParseDate(order.date);
    if (!date) return false;
    var now = new Date();
    if (period === "month") {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
function getDashboardPeriodOrders(includeCancelled) {
    return (Array.isArray(salesHistory) ? salesHistory : []).filter(function(order){
        return dashboardOrderInPeriod(order, dashboardPeriod) && (includeCancelled || order.status !== "cancel");
    });
}
function setDashboardPeriod(period) {
    dashboardPeriod = period || "today";
    ["today","month","all"].forEach(function(key){
        var id = key === "today" ? "dashboardPeriodToday" : key === "month" ? "dashboardPeriodMonth" : "dashboardPeriodAll";
        var button = document.getElementById(id);
        if (button) button.classList.toggle("active", dashboardPeriod === key);
    });
    renderAdminDashboard();
}
function dashboardPeriodLabel() {
    var now = new Date();
    if (dashboardPeriod === "month") return now.getFullYear() + " 年 " + (now.getMonth()+1) + " 月營運概況";
    if (dashboardPeriod === "all") return "累積營運概況";
    return now.toLocaleDateString("zh-TW") + " 今日營運概況";
}
function dashboardItemQuantity(item) {
    return Math.max(1, Number(item && (item.qty || item.quantity) || 1));
}
function dashboardTicketCount(orders) {
    return orders.reduce(function(total, order){
        return total + (Array.isArray(order.items) ? order.items.reduce(function(sum,item){ return sum + dashboardItemQuantity(item); },0) : 0);
    },0);
}
function dashboardTokenCount(orders) {
    return orders.reduce(function(total, order){
        return total + (Array.isArray(order.items) ? order.items.reduce(function(sum,item){ return sum + Number(item.token || 0) * dashboardItemQuantity(item); },0) : 0);
    },0);
}
function renderDashboardRecentOrders() {
    var box = document.getElementById("dashboardRecentOrders");
    if (!box) return;
    var recent = getDashboardPeriodOrders(true).slice(0,5);
    if (!recent.length) {
        box.innerHTML = '<div class="dashboard-empty">此期間沒有售票紀錄</div>';
        return;
    }
    box.innerHTML = recent.map(function(order){
        var index = salesHistory.indexOf(order);
        var count = Array.isArray(order.items) ? order.items.reduce(function(sum,item){return sum+dashboardItemQuantity(item);},0) : 0;
        var cancelled = order.status === "cancel";
        var operator = order.operatorName || (order.createdBy && order.createdBy.name) || "售票機";
        return '<button type="button" class="dashboard-order-row '+(cancelled?'cancelled':'')+'" onclick="playClick(); openOrderDetail('+index+')">'+
            '<div class="dashboard-order-main"><div class="dashboard-order-number">'+(order.orderNo||'未編號')+'</div>'+
            '<div class="dashboard-order-meta">'+(order.date||'')+' '+(order.time||'')+'・'+(order.payment||'未記錄')+'・'+count+' 張・'+operator+(order.memberId?'・👤 '+(order.memberName||'會員'):'')+'</div></div>'+
            '<div class="dashboard-order-right"><div class="dashboard-order-amount">NT$'+formatDashboardAmount(order.amount)+'</div><div class="dashboard-order-status">'+(cancelled?'已作廢':'正常')+'</div></div></button>';
    }).join('');
}
function renderDashboardRanking(targetId, rows, emptyText) {
    var box = document.getElementById(targetId);
    if (!box) return;
    if (!rows.length) { box.innerHTML='<div class="dashboard-empty compact">'+emptyText+'</div>'; return; }
    var max = Math.max.apply(null, rows.map(function(row){return row.value;})) || 1;
    box.innerHTML = rows.map(function(row,index){
        var width = Math.max(6, Math.round(row.value/max*100));
        return '<div class="dashboard-rank-row"><div class="dashboard-rank-head"><span><b>'+(index+1)+'</b> '+row.label+'</span><strong>'+row.display+'</strong></div><div class="dashboard-rank-track"><i style="width:'+width+'%"></i></div></div>';
    }).join('');
}
function renderDashboardTopTickets(orders) {
    var map={};
    orders.forEach(function(order){(order.items||[]).forEach(function(item){
        var key=item.id||item.title||'unknown'; if(!map[key]) map[key]={label:item.title||key,value:0,income:0};
        var qty=dashboardItemQuantity(item); map[key].value+=qty; map[key].income+=Number(item.price||0)*qty;
    });});
    var rows=Object.keys(map).map(function(key){return map[key];}).sort(function(a,b){return b.value-a.value;}).slice(0,6).map(function(row){row.display=row.value+' 張 / NT$'+formatDashboardAmount(row.income);return row;});
    renderDashboardRanking('dashboardTopTickets',rows,'尚無票券銷售資料');
}
function renderDashboardHourlySales(orders) {
    var buckets={};
    orders.forEach(function(order){var match=String(order.time||'').match(/(\d{1,2})[:：]/);var hour=match?Number(match[1]):-1;if(hour>=0){var key=String(hour).padStart?String(hour).padStart(2,'0'):('0'+hour).slice(-2);key+=':00';buckets[key]=(buckets[key]||0)+Number(order.amount||0);}});
    var rows=Object.keys(buckets).sort().map(function(key){return {label:key,value:buckets[key],display:'NT$'+formatDashboardAmount(buckets[key])};});
    renderDashboardRanking('dashboardHourlySales',rows,'尚無時段營收資料');
}
function renderDashboardStaffSales(orders) {
    var map={};
    orders.forEach(function(order){var name=order.operatorName||(order.createdBy&&order.createdBy.name)||'售票機';if(!map[name])map[name]={label:name,value:0,count:0};map[name].value+=Number(order.amount||0);map[name].count+=1;});
    var rows=Object.keys(map).map(function(key){return map[key];}).sort(function(a,b){return b.value-a.value;}).slice(0,6).map(function(row){row.display='NT$'+formatDashboardAmount(row.value)+' / '+row.count+' 筆';return row;});
    renderDashboardRanking('dashboardStaffSales',rows,'尚無員工銷售資料');
}
function dashboardSetText(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
function renderAdminDashboard() {
    var all = getDashboardPeriodOrders(true);
    var normal = all.filter(function(order){return order.status!=="cancel";});
    var cancelled = all.filter(function(order){return order.status==="cancel";});
    var income = normal.reduce(function(sum,order){return sum+Number(order.amount||0);},0);
    var cash = normal.filter(function(order){return String(order.payment||'').indexOf('現金')>=0;}).reduce(function(sum,order){return sum+Number(order.amount||0);},0);
    var line = normal.filter(function(order){return String(order.payment||'').toLowerCase().indexOf('line')>=0;}).reduce(function(sum,order){return sum+Number(order.amount||0);},0);
    var members = normal.filter(function(order){return Boolean(order.memberId);});
    var memberIncome=members.reduce(function(sum,order){return sum+Number(order.amount||0);},0);
    var nonMemberIncome=income-memberIncome;
    var newMembers=(typeof memberData!=="undefined"&&Array.isArray(memberData)?memberData:[]).filter(function(member){return dashboardOrderInPeriod({date:member.joinDate},dashboardPeriod);}).length;
    dashboardSetText('dashboardDate',dashboardPeriodLabel());
    dashboardSetText('dashboardIncome','NT$'+formatDashboardAmount(income));
    dashboardSetText('dashboardTickets',dashboardTicketCount(normal)+' 張');
    dashboardSetText('dashboardCash','NT$'+formatDashboardAmount(cash));
    dashboardSetText('dashboardLinePay','NT$'+formatDashboardAmount(line));
    dashboardSetText('dashboardOrders',normal.length+' 筆');
    dashboardSetText('dashboardCancelled',cancelled.length+' 筆');
    dashboardSetText('dashboardMemberOrders',members.length+' 筆');
    dashboardSetText('dashboardMemberIncome','NT$'+formatDashboardAmount(memberIncome));
    dashboardSetText('dashboardNonMemberIncome','NT$'+formatDashboardAmount(nonMemberIncome));
    dashboardSetText('dashboardNewMembers',newMembers+' 人');
    dashboardSetText('dashboardAverageOrder','NT$'+formatDashboardAmount(normal.length?Math.round(income/normal.length):0));
    dashboardSetText('dashboardTokens',dashboardTokenCount(normal)+' 枚');
    renderDashboardTopTickets(normal); renderDashboardHourlySales(normal); renderDashboardStaffSales(normal); renderDashboardRecentOrders();
    var status=document.getElementById('dashboardRealtimeStatus');if(status){status.textContent='● 已更新 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});}
}
document.addEventListener("click",function(event){var button=event.target.closest&&event.target.closest('[onclick*="adminHomePage"]');if(button)setTimeout(renderAdminDashboard,0);});
window.addEventListener("focus",renderAdminDashboard);
window.addEventListener("storage",function(event){if(event.key==='salesHistory')renderAdminDashboard();});
document.addEventListener('monster:orders-updated',renderAdminDashboard);
renderAdminDashboard();
