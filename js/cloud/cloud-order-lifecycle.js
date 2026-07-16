// =========================================
// 小怪獸售票機 V7 Phase 3C
// 訂單生命週期／每日叫號初始化
// =========================================
(function(){

    "use strict";

    var ROOT = "monsterTicket/v1";
    var ordersRef = null;
    var counterRef = null;

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

    function inferMinutes(order){

        var items =
        Array.isArray(order.items)
        ? order.items
        : [];

        var maxMinutes = 0;

        items.forEach(function(item){

            var minutes =
            Number(item.playMinutes || 0);

            if(!minutes && item.hour){
                minutes = Number(item.hour) * 60;
            }

            if(!minutes){

                var title =
                String(item.title || "");

                if(/3H/i.test(title)){
                    minutes = 180;
                }else if(/2H/i.test(title)){
                    minutes = 120;
                }else if(
                    title.indexOf("早鳥") !== -1 ||
                    title.indexOf("暑假") !== -1 ||
                    title.indexOf("寒假") !== -1
                ){
                    minutes = 240;
                }
            }

            if(minutes > maxMinutes){
                maxMinutes = minutes;
            }
        });

        return maxMinutes || 120;
    }

    function inferPlayerCount(order){

        var count = 0;
        var guardian = 0;

        (
            Array.isArray(order.items)
            ? order.items
            : []
        ).forEach(function(item){

            var title =
            String(item.title || "");

            if(
                title.indexOf("陪同") !== -1 ||
                item.id === "parent"
            ){
                guardian++;
                return;
            }

            if(
                title.indexOf("代幣") !== -1 ||
                title.indexOf("行動電源") !== -1 ||
                item.id === "token10" ||
                item.id === "token25" ||
                item.id === "powerbank"
            ){
                return;
            }

            count++;
        });

        return {
            players:count || 1,
            guardians:guardian
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

        var updates = {};

        if(!order.playStatus){
            updates.playStatus = "waiting";
        }

        if(!order.playerCount){
            updates.playerCount = inferred.players;
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
        inferPlayerCount:inferPlayerCount
    };

    boot();

})();
