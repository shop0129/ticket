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

    function getTodayText(){

        return new Date()
        .toLocaleDateString("zh-TW");
    }

    function getTodayKey(){

        var date = new Date();

        return (
            date.getFullYear() +
            "-" +
            padNumber(date.getMonth() + 1) +
            "-" +
            padNumber(date.getDate())
        );
    }

    function getMonthKey(){

        var date = new Date();

        return (
            date.getFullYear() +
            "-" +
            padNumber(date.getMonth() + 1)
        );
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

        var todayText =
        getTodayText();

        var monthText =
        todayText.split("/");

        var monthPrefix =
        monthText.length >= 2
        ? monthText[0] + "/" + monthText[1] + "/"
        : "";

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

            if(
                monthPrefix &&
                String(order.date || "")
                .indexOf(monthPrefix) === 0
            ){
                addOrderToSummary(
                    month,
                    order
                );
            }

            if(order.date === todayText){

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

            if(member.joinDate === todayText){

                today.newMembers++;
            }

            if(
                monthPrefix &&
                String(member.joinDate || "")
                .indexOf(monthPrefix) === 0
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

        var summary =
        data.summary;

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

})();
