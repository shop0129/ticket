// =========================================
// 小怪獸售票機 V7.3 Phase 3F Part 1 Fix 1
// Dashboard 雲端即時統計
// Firebase Realtime Database
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var ORDER_PATH =
        "monsterTicket/v1/orders";

    var MEMBER_PATH =
        "monsterTicket/v1/members";

    var DASHBOARD_PATH =
        "monsterTicket/v1/dashboard";

    var orderRef = null;
    var memberRef = null;
    var dashboardRef = null;

    var cloudOrders = {};
    var cloudMembers = {};

    var ordersReady = false;
    var membersReady = false;
    var writeTimer = null;
    var TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
    var activeDateKey = "";

    window.MonsterDashboardCloud =
        window.MonsterDashboardCloud || {};

    function cloneValue(value){

        return JSON.parse(
            JSON.stringify(value)
        );
    }

    function padNumber(value){

        return String(value)
        .padStart
        ? String(value).padStart(2,"0")
        : (
            Number(value) < 10
            ? "0" + String(value)
            : String(value)
        );
    }

    function taipeiParts(value){

        var date = new Date(
            Number(value == null ? Date.now() : value) +
            TAIPEI_OFFSET_MS
        );

        return {
            year:date.getUTCFullYear(),
            month:date.getUTCMonth() + 1,
            day:date.getUTCDate()
        };
    }

    function dateKeyFromTimestamp(value){

        var parts = taipeiParts(value);

        return parts.year + "-" +
        padNumber(parts.month) + "-" +
        padNumber(parts.day);
    }

    function normalizeDateKey(value){

        var match = String(value || "")
        .match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);

        return match
        ? match[1] + "-" + padNumber(match[2]) + "-" + padNumber(match[3])
        : "";
    }

    function recordDateKey(record, fallbackFields){

        var fields = fallbackFields || ["createdAt","timestamp","dateTime"];
        var dateKey = normalizeDateKey(record && record.date);

        if(dateKey){
            return dateKey;
        }

        for(var index = 0; index < fields.length; index++){
            var raw = record && record[fields[index]];
            var milliseconds = raw && raw.seconds
            ? Number(raw.seconds) * 1000
            : Number(raw);

            if(isFinite(milliseconds) && milliseconds > 1000000000){
                return dateKeyFromTimestamp(milliseconds);
            }

            if(typeof raw === "string"){
                var parsed = Date.parse(raw);
                if(isFinite(parsed)){
                    return dateKeyFromTimestamp(parsed);
                }
            }
        }

        return "";
    }

    function getTodayText(){

        var parts = taipeiParts();

        return parts.year + "/" + parts.month + "/" + parts.day;
    }

    function getTodayKey(){

        return dateKeyFromTimestamp(Date.now());
    }

    function getMonthKey(){

        return getTodayKey().slice(0,7);
    }

    function isNormalOrder(order){

        return (
            order &&
            !order.deleted &&
            order.status !== "cancel"
        );
    }

    function getOrderItems(order){

        return Array.isArray(order.items)
        ? order.items
        : [];
    }

    function countOrderTickets(order){

        return getOrderItems(order).length;
    }

    function getOrderToyCounts(order){

        var result = {
            green:0,
            red:0,
            convertedPoints:0
        };

        getOrderItems(order)
        .forEach(function(item){

            if(item.toy === "green"){
                result.green++;
            }

            if(item.toy === "red"){
                result.red++;
            }
        });

        if(order.toyPointConversion){

            result.convertedPoints =
            Number(
                order.toyPointConversion.points || 0
            );
        }

        return result;
    }

    function createSummary(){

        return {
            income:0,
            cashIncome:0,
            linePayIncome:0,
            otherIncome:0,

            normalOrders:0,
            cancelledOrders:0,
            ticketCount:0,

            memberOrders:0,
            memberIncome:0,
            nonMemberOrders:0,
            nonMemberIncome:0,

            greenToys:0,
            redToys:0,
            toyPointsConverted:0,

            newMembers:0,

            updatedAt:Date.now()
        };
    }

    function addOrderToSummary(
        summary,
        order
    ){

        if(!order || order.deleted){
            return;
        }

        if(order.status === "cancel"){

            summary.cancelledOrders++;
            return;
        }

        var amount =
        Number(order.amount || 0);

        var toy =
        getOrderToyCounts(order);

        summary.income += amount;
        summary.normalOrders++;
        summary.ticketCount +=
        countOrderTickets(order);

        summary.greenToys +=
        toy.green;

        summary.redToys +=
        toy.red;

        summary.toyPointsConverted +=
        toy.convertedPoints;

        if(order.payment === "現金"){

            summary.cashIncome += amount;

        }else if(order.payment === "LINE Pay"){

            summary.linePayIncome += amount;

        }else{

            summary.otherIncome += amount;
        }

        if(order.memberId){

            summary.memberOrders++;
            summary.memberIncome += amount;

        }else{

            summary.nonMemberOrders++;
            summary.nonMemberIncome += amount;
        }
    }

    function calculateSummaries(){

        var todayKey = getTodayKey();
        var monthKey = getMonthKey();

        var today =
        createSummary();

        var month =
        createSummary();

        var allTime =
        createSummary();

        Object.keys(cloudOrders || {})
        .forEach(function(id){

            var order =
            cloudOrders[id];

            if(!order || order.deleted){
                return;
            }

            addOrderToSummary(
                allTime,
                order
            );

            var orderKey = recordDateKey(order);

            if(orderKey.slice(0,7) === monthKey){
                addOrderToSummary(
                    month,
                    order
                );
            }

            if(orderKey === todayKey){

                addOrderToSummary(
                    today,
                    order
                );
            }
        });

        Object.keys(cloudMembers || {})
        .forEach(function(id){

            var member =
            cloudMembers[id];

            if(
                !member ||
                member.deleted
            ){
                return;
            }

            var memberKey = normalizeDateKey(member.joinDate) ||
            recordDateKey(member,["createdAt","joinedAt"]);

            if(memberKey === todayKey){

                today.newMembers++;
            }

            if(
                memberKey.slice(0,7) === monthKey
            ){
                month.newMembers++;
            }

            allTime.newMembers++;
        });

        return {
            today:today,
            month:month,
            allTime:allTime
        };
    }

    function setCloudStatus(
        title,
        detail,
        state
    ){

        if(
            window.MonsterCloud &&
            typeof window.MonsterCloud.setStatus ===
            "function"
        ){
            window.MonsterCloud.setStatus(
                state || "online",
                title,
                detail
            );
        }
    }

    function writeDashboard(){

        if(
            !dashboardRef ||
            !ordersReady ||
            !membersReady
        ){
            return;
        }

        var summaries =
        calculateSummaries();

        var updates = {};

        updates[
            "daily/" + getTodayKey()
        ] = summaries.today;

        updates[
            "monthly/" + getMonthKey()
        ] = summaries.month;

        updates["allTime"] =
        summaries.allTime;

        updates["current"] = {
            date:getTodayText(),
            dateKey:getTodayKey(),
            monthKey:getMonthKey(),
            summary:summaries.today,
            updatedAt:Date.now()
        };

        dashboardRef
        .update(updates)
        .then(function(){

            setCloudStatus(
                "Dashboard 已同步",
                "今日營運統計已即時更新",
                "online"
            );
        })
        .catch(function(error){

            console.error(
                "[MonsterDashboardCloud] write error:",
                error
            );

            setCloudStatus(
                "Dashboard 等待同步",
                "目前使用本機統計，連線恢復後會更新",
                "warning"
            );
        });
    }

    function scheduleDashboardWrite(){

        if(writeTimer){
            clearTimeout(writeTimer);
        }

        writeTimer =
        setTimeout(
            writeDashboard,
            80
        );
    }

    function updateText(
        elementId,
        value
    ){

        var element =
        document.getElementById(
            elementId
        );

        if(element){
            element.textContent = value;
        }
    }

    function formatMoney(value){

        return Number(value || 0)
        .toLocaleString("zh-TW");
    }

    function applyCloudDashboard(data){

        if(
            !data ||
            !data.summary
        ){
            return;
        }

        if(data.dateKey && data.dateKey !== getTodayKey()){
            data = {
                date:getTodayText(),
                dateKey:getTodayKey(),
                summary:createSummary()
            };
            scheduleDashboardWrite();
        }

        var summary = data.summary;

        updateText(
            "dashboardDate",
            (data.date || getTodayText()) +
            " 雲端即時營運概況"
        );

        updateText(
            "dashboardIncome",
            "NT$" +
            formatMoney(summary.income)
        );

        updateText(
            "dashboardTickets",
            Number(summary.ticketCount || 0) +
            " 張"
        );

        updateText(
            "dashboardCash",
            "NT$" +
            formatMoney(summary.cashIncome)
        );

        updateText(
            "dashboardLinePay",
            "NT$" +
            formatMoney(summary.linePayIncome)
        );

        updateText(
            "dashboardOrders",
            Number(summary.normalOrders || 0) +
            " 筆"
        );

        updateText(
            "dashboardCancelled",
            Number(summary.cancelledOrders || 0) +
            " 筆"
        );

        updateText(
            "dashboardMemberOrders",
            Number(summary.memberOrders || 0) +
            " 筆"
        );

        updateText(
            "dashboardMemberIncome",
            "NT$" +
            formatMoney(summary.memberIncome)
        );

        updateText(
            "dashboardNonMemberIncome",
            "NT$" +
            formatMoney(summary.nonMemberIncome)
        );

        updateText(
            "dashboardNewMembers",
            Number(summary.newMembers || 0) +
            " 人"
        );

        window.MonsterDashboardCloud
        .latestCurrent =
        cloneValue(data);
    }

    function listenDashboardCurrent(){

        dashboardRef
        .child("current")
        .on(
            "value",
            function(snapshot){

                var data =
                snapshot.val();

                if(data){
                    applyCloudDashboard(data);
                }
            },
            function(error){

                console.error(
                    "[MonsterDashboardCloud] current read error:",
                    error
                );
            }
        );
    }

    function startSync(){

        if(
            !window.MonsterCloud ||
            !window.MonsterCloud.database
        ){
            return;
        }

        orderRef =
        window.MonsterCloud.database
        .ref(ORDER_PATH);

        memberRef =
        window.MonsterCloud.database
        .ref(MEMBER_PATH);

        dashboardRef =
        window.MonsterCloud.database
        .ref(DASHBOARD_PATH);

        activeDateKey = getTodayKey();

        orderRef.on(
            "value",
            function(snapshot){

                cloudOrders =
                snapshot.val() || {};

                ordersReady = true;

                scheduleDashboardWrite();
            },
            function(error){

                console.error(
                    "[MonsterDashboardCloud] order read error:",
                    error
                );
            }
        );

        memberRef.on(
            "value",
            function(snapshot){

                cloudMembers =
                snapshot.val() || {};

                membersReady = true;

                scheduleDashboardWrite();
            },
            function(error){

                console.error(
                    "[MonsterDashboardCloud] member read error:",
                    error
                );
            }
        );

        listenDashboardCurrent();
    }

    window.MonsterDashboardCloud
    .forceRefresh =
    function(){

        scheduleDashboardWrite();
    };

    window.MonsterDashboardCloud
    .getInfo =
    function(){

        return {
            ordersReady:ordersReady,
            membersReady:membersReady,
            orderCount:
            Object.keys(
                cloudOrders || {}
            ).length,
            memberCount:
            Object.keys(
                cloudMembers || {}
            ).length,
            latestCurrent:
            window.MonsterDashboardCloud
            .latestCurrent || null
        };
    };

    if(
        window.MonsterCloud &&
        typeof window.MonsterCloud.onReady ===
        "function"
    ){
        window.MonsterCloud.onReady(
            startSync
        );
    }else{

        var waitTimer =
        setInterval(function(){

            if(
                window.MonsterCloud &&
                typeof window.MonsterCloud.onReady ===
                "function"
            ){
                clearInterval(waitTimer);

                window.MonsterCloud
                .onReady(startSync);
            }
        },500);
    }

    window.addEventListener(
        "online",
        function(){

            scheduleDashboardWrite();
        }
    );

    function refreshBusinessDate(){

        var nextDateKey = getTodayKey();

        if(activeDateKey !== nextDateKey){
            activeDateKey = nextDateKey;
            applyCloudDashboard({
                date:getTodayText(),
                dateKey:nextDateKey,
                summary:createSummary()
            });
        }

        scheduleDashboardWrite();
    }

    setInterval(refreshBusinessDate,30000);

    document.addEventListener("visibilitychange",function(){
        if(!document.hidden){
            refreshBusinessDate();
        }
    });

    window.addEventListener("pageshow",refreshBusinessDate);

})();
