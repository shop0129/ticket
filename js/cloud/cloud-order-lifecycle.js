// =========================================
// 小怪獸售票機 V7 Phase 3D
// 訂單生命週期、入場商品與時間規則
// =========================================
(function(){

    "use strict";

    var ROOT = "monsterTicket/v1";
    var ordersRef = null;

    function pad(value,width){

        var text =
        String(value || 0);

        while(text.length < width){
            text = "0" + text;
        }

        return text;
    }

    function dayKey(){

        var d = new Date();

        return (
            d.getFullYear() +
            pad(d.getMonth()+1,2) +
            pad(d.getDate(),2)
        );
    }

    function itemId(item){
        return String(item && item.id || "");
    }

    function itemTitle(item){
        return String(item && item.title || "");
    }

    function isNonAdmissionItem(item){

        if(item && (item.canEnter === false || item.admissionRequired === false)){
            return true;
        }
        if(item && (item.canEnter === true || item.admissionRequired === true)){
            return false;
        }

        var id = itemId(item);
        var title = itemTitle(item);

        return (
            id === "token10" ||
            id === "token25" ||
            id === "powerbank" ||
            title.indexOf("代幣") !== -1 ||
            title.indexOf("行動電源") !== -1
        );
    }

    function isGuardianItem(item){

        var id = itemId(item);
        var title = itemTitle(item);

        return (
            id === "parent" ||
            title.indexOf("陪同") !== -1
        );
    }

    function isUnlimitedItem(item){

        var id = itemId(item);
        var title = itemTitle(item);

        return (
            item.timeMode === "unlimited" ||
            id === "baby" ||
            title.indexOf("幼幼") !== -1
        );
    }

    function admissionItems(order){

        return (
            Array.isArray(order && order.items)
            ? order.items
            : []
        ).filter(function(item){

            return (
                !isNonAdmissionItem(item) &&
                !isGuardianItem(item)
            );
        });
    }

    function hasAdmission(order){
        return admissionItems(order).length > 0;
    }

    function inferTimeRule(order){

        var items =
        admissionItems(order);

        var rule = {
            mode:"duration",
            minutes:120,
            fixedTime:""
        };

        var maxMinutes = 0;
        var hasUnlimited = false;

        items.forEach(function(item){

            var title =
            itemTitle(item);

            if(isUnlimitedItem(item)){
                hasUnlimited = true;
            }

            if(
                item.timeMode === "fixed" &&
                item.fixedExitTime
            ){
                rule.mode = "fixed";
                rule.fixedTime =
                String(item.fixedExitTime);
            }

            if(
                title.indexOf("早鳥") !== -1
            ){
                rule.mode = "fixed";
                rule.fixedTime = "18:00";
            }

            if(
                title.indexOf("暑假") !== -1 ||
                title.indexOf("寒假") !== -1 ||
                title.indexOf("寒暑假") !== -1
            ){
                rule.mode = "fixed";
                rule.fixedTime = "16:00";
            }

            var minutes =
            Number(item.playMinutes || 0);

            if(!minutes && item.hour){
                minutes =
                Number(item.hour) * 60;
            }

            if(!minutes){

                if(/3H/i.test(title)){
                    minutes = 180;
                }else if(/2H/i.test(title)){
                    minutes = 120;
                }
            }

            if(minutes > maxMinutes){
                maxMinutes = minutes;
            }
        });

        if(hasUnlimited){
            return {
                mode:"unlimited",
                minutes:0,
                fixedTime:""
            };
        }

        if(rule.mode === "fixed"){
            return rule;
        }

        rule.minutes =
        maxMinutes || 120;

        return rule;
    }

    function inferPlayerCount(order){

        var players = 0;
        var guardians = 0;

        (
            Array.isArray(order && order.items)
            ? order.items
            : []
        ).forEach(function(item){

            if(isNonAdmissionItem(item)){
                return;
            }

            if(isGuardianItem(item)){
                guardians++;
                return;
            }

            players++;
        });

        return {
            players:players,
            guardians:guardians
        };
    }

    function expectedExitTimestamp(
        entryTime,
        playMinutes,
        fixedExitTime,
        timeMode
    ){

        if(timeMode === "unlimited"){
            return null;
        }

        if(fixedExitTime){

            var parts =
            String(fixedExitTime)
            .split(":");

            var date =
            new Date(Number(entryTime));

            date.setHours(
                Number(parts[0] || 0),
                Number(parts[1] || 0),
                0,
                0
            );

            return date.getTime();
        }

        return (
            Number(entryTime) +
            Number(playMinutes || 120) *
            60000
        );
    }

    function assignQueue(orderId,order){

        var dateKey =
        order.queueDateKey ||
        dayKey();

        firebase.database()
        .ref(
            ROOT +
            "/queueCounters/" +
            dateKey
        )
        .transaction(
            function(current){
                return Number(current || 0) + 1;
            },
            function(error,committed,snapshot){

                if(error || !committed){
                    return;
                }

                ordersRef
                .child(orderId)
                .update({
                    queueNumber:
                    "A" + pad(snapshot.val(),3),
                    queueDateKey:dateKey,
                    updatedAt:Date.now()
                });
            }
        );
    }

    function initializeOrder(orderId,order){

        if(!order || order.deleted){
            return;
        }

        var inferred =
        inferPlayerCount(order);

        if(!hasAdmission(order)){

            ordersRef
            .child(orderId)
            .update({
                admissionRequired:false,
                playStatus:"not_required",
                playerCount:0,
                guardianCount:0,
                playMinutes:0,
                timeMode:"none",
                fixedExitTime:"",
                queueNumber:null,
                updatedAt:Date.now()
            });

            return;
        }

        var timeRule =
        inferTimeRule(order);

        var updates = {
            admissionRequired:true,
            timeMode:timeRule.mode,
            fixedExitTime:
            timeRule.fixedTime || ""
        };

        if(
            !order.playStatus ||
            order.playStatus === "not_required"
        ){
            updates.playStatus = "waiting";
        }

        if(
            order.playerCount === undefined ||
            order.playerCount === null ||
            Number(order.playerCount) <= 0
        ){
            updates.playerCount =
            inferred.players;
        }

        if(
            order.guardianCount === undefined ||
            order.guardianCount === null
        ){
            updates.guardianCount =
            inferred.guardians;
        }

        if(
            order.playMinutes === undefined ||
            order.playMinutes === null ||
            (
                timeRule.mode === "duration" &&
                Number(order.playMinutes) <= 0
            )
        ){
            updates.playMinutes =
            timeRule.minutes;
        }

        if(!order.waitingSince){
            updates.waitingSince =
            order.createdAt ||
            Date.now();
        }

        if(!order.queueDateKey){
            updates.queueDateKey =
            dayKey();
        }

        if(!order.queueNumber){
            assignQueue(orderId,order);
        }

        updates.updatedAt =
        Date.now();

        ordersRef
        .child(orderId)
        .update(updates);
    }

    function start(){

        ordersRef =
        firebase.database()
        .ref(ROOT + "/orders");

        ordersRef.on(
            "child_added",
            function(snapshot){

                initializeOrder(
                    snapshot.key,
                    snapshot.val()
                );
            }
        );

        ordersRef.on(
            "child_changed",
            function(snapshot){

                var order =
                snapshot.val();

                if(
                    order &&
                    (
                        order.admissionRequired === undefined ||
                        !order.timeMode
                    )
                ){
                    initializeOrder(
                        snapshot.key,
                        order
                    );
                }
            }
        );
    }

    function boot(){

        if(
            !window.firebase ||
            !window.MONSTER_FIREBASE_CONFIG
        ){
            return;
        }

        if(!firebase.apps.length){
            firebase.initializeApp(
                window.MONSTER_FIREBASE_CONFIG
            );
        }

        firebase.auth()
        .signInAnonymously()
        .then(start);
    }

    window.MonsterOrderLifecycle = {
        inferPlayerCount:inferPlayerCount,
        inferTimeRule:inferTimeRule,
        hasAdmission:hasAdmission,
        expectedExitTimestamp:
        expectedExitTimestamp
    };

    boot();

})();
