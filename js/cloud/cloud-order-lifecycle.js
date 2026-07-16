// =========================================
// 小怪獸售票機 V7 Phase 3C-1 Fix
// 訂單生命週期／每日叫號初始化
// 修正：非入場商品、早鳥與寒暑假固定離場時間
// =========================================
(function(){

    "use strict";

    var ROOT = "monsterTicket/v1";
    var ordersRef = null;

    function pad(value,width){
        var text = String(value || 0);
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

    function isNonAdmissionItem(item){

        var id =
        String(item.id || "");

        var title =
        String(item.title || "");

        return (
            id === "token10" ||
            id === "token25" ||
            id === "powerbank" ||
            title.indexOf("代幣") !== -1 ||
            title.indexOf("行動電源") !== -1
        );
    }

    function isGuardianItem(item){

        var id =
        String(item.id || "");

        var title =
        String(item.title || "");

        return (
            id === "parent" ||
            title.indexOf("陪同") !== -1
        );
    }

    function admissionItems(order){

        return (
            Array.isArray(order.items)
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

    function fixedExitRule(order){

        var items =
        admissionItems(order);

        var result = "";

        items.forEach(function(item){

            var title =
            String(item.title || "");

            if(
                title.indexOf("早鳥") !== -1
            ){
                result = "18:00";
            }

            if(
                title.indexOf("暑假") !== -1 ||
                title.indexOf("寒假") !== -1 ||
                title.indexOf("寒暑假") !== -1
            ){
                result = "16:00";
            }
        });

        return result;
    }

    function inferMinutes(order){

        var items =
        admissionItems(order);

        var maxMinutes = 0;

        items.forEach(function(item){

            var minutes =
            Number(item.playMinutes || 0);

            if(!minutes && item.hour){
                minutes =
                Number(item.hour) * 60;
            }

            if(!minutes){

                var title =
                String(item.title || "");

                if(/3H/i.test(title)){
                    minutes = 180;
                }else if(/2H/i.test(title)){
                    minutes = 120;
                }else if(
                    title.indexOf("幼幼") !== -1
                ){
                    minutes = 120;
                }
            }

            if(minutes > maxMinutes){
                maxMinutes = minutes;
            }
        });

        return maxMinutes || 120;
    }

    function inferPlayerCount(order){

        var players = 0;
        var guardians = 0;

        (
            Array.isArray(order.items)
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

    function assignQueue(orderId,order){

        var dateKey =
        order.queueDateKey ||
        dayKey();

        var ref =
        firebase.database()
        .ref(
            ROOT +
            "/queueCounters/" +
            dateKey
        );

        ref.transaction(function(current){

            return Number(current || 0) + 1;

        },function(error,committed,snapshot){

            if(error || !committed){
                return;
            }

            var number =
            "A" + pad(snapshot.val(),3);

            ordersRef.child(orderId)
            .update({
                queueNumber:number,
                queueDateKey:dateKey,
                updatedAt:Date.now()
            });
        });
    }

    function initializeOrder(orderId,order){

        if(!order || order.deleted){
            return;
        }

        var inferred =
        inferPlayerCount(order);

        if(!hasAdmission(order)){

            var nonAdmissionUpdates = {
                admissionRequired:false,
                playStatus:"not_required",
                playerCount:0,
                guardianCount:0,
                playMinutes:0,
                fixedExitTime:"",
                updatedAt:Date.now()
            };

            if(
                order.queueNumber
            ){
                nonAdmissionUpdates.queueNumber = null;
            }

            ordersRef
            .child(orderId)
            .update(nonAdmissionUpdates);

            return;
        }

        var updates = {
            admissionRequired:true
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

        if(!order.playMinutes){
            updates.playMinutes =
            inferMinutes(order);
        }

        var fixed =
        fixedExitRule(order);

        if(fixed){
            updates.fixedExitTime = fixed;
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

        if(Object.keys(updates).length > 0){

            updates.updatedAt = Date.now();

            ordersRef
            .child(orderId)
            .update(updates);
        }
    }

    function expectedExitTimestamp(
        entryTime,
        playMinutes,
        fixedExitTime
    ){

        if(fixedExitTime){

            var parts =
            String(fixedExitTime)
            .split(":");

            var date =
            new Date(entryTime);

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
                    order.admissionRequired === undefined
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
        inferMinutes:inferMinutes,
        inferPlayerCount:inferPlayerCount,
        hasAdmission:hasAdmission,
        fixedExitRule:fixedExitRule,
        expectedExitTimestamp:
        expectedExitTimestamp
    };

    boot();

})();
