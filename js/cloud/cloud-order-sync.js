// =========================================
// 小怪獸售票機 V7 Phase 2B
// 訂單／售票紀錄雲端同步
// Firebase Realtime Database + localStorage 離線備援
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var ORDER_PATH =
        "monsterTicket/v1/orders";

    var orderRef = null;
    var initialized = false;
    var applyingCloud = false;
    var pendingWrite = false;
    var writeTimer = null;
    var lastOrderMap = {};

    window.MonsterOrderCloud =
        window.MonsterOrderCloud || {};

    function cloneValue(value){
        return JSON.parse(JSON.stringify(value));
    }

    function safeKey(value){
        return String(value || "")
        .replace(/[.#$\[\]\/]/g,"_");
    }

    function ensureOrderIdentity(order,index){

        if(!order.orderNo){
            order.orderNo =
            "LEGACY_" +
            String(order.date || "") + "_" +
            String(order.time || "") + "_" +
            String(index || 0);
        }

        if(!order.cloudId){
            order.cloudId =
            safeKey(order.orderNo);
        }

        return order;
    }

    function arrayToMap(list){

        var result = {};

        if(!Array.isArray(list)){
            return result;
        }

        list.forEach(function(order,index){

            if(!order){
                return;
            }

            var copy =
            ensureOrderIdentity(
                cloneValue(order),
                index
            );

            result[copy.cloudId] = copy;
        });

        return result;
    }

    function mapToArray(map){

        var result = [];

        Object.keys(map || {})
        .forEach(function(id){

            var order = map[id];

            if(!order || order.deleted){
                return;
            }

            var copy = cloneValue(order);

            if(!copy.cloudId){
                copy.cloudId = id;
            }

            result.push(copy);
        });

        result.sort(function(a,b){

            var aTime =
            Number(a.updatedAt || a.createdAt || 0);

            var bTime =
            Number(b.updatedAt || b.createdAt || 0);

            if(aTime !== bTime){
                return bTime - aTime;
            }

            return String(b.orderNo || "")
            .localeCompare(
                String(a.orderNo || "")
            );
        });

        return result;
    }

    function comparableOrder(order){

        var copy = cloneValue(order || {});

        delete copy.updatedAt;
        delete copy.updatedBy;

        return JSON.stringify(copy);
    }

    function stampLocalChanges(currentMap){

        var now = Date.now();
        var deviceId =
        window.MonsterCloud &&
        window.MonsterCloud.uid
        ? window.MonsterCloud.uid
        : "local";

        Object.keys(currentMap)
        .forEach(function(id){

            var current = currentMap[id];
            var previous = lastOrderMap[id];

            if(!current.createdAt){
                current.createdAt = now;
            }

            if(
                !previous ||
                comparableOrder(current) !==
                comparableOrder(previous)
            ){
                current.updatedAt = now;
                current.updatedBy = deviceId;
                current.deleted = false;
            }
        });

        Object.keys(lastOrderMap)
        .forEach(function(id){

            if(!currentMap[id]){
                currentMap[id] = {
                    cloudId:id,
                    orderNo:
                    lastOrderMap[id].orderNo || id,
                    deleted:true,
                    updatedAt:now,
                    updatedBy:deviceId
                };
            }
        });

        return currentMap;
    }

    function mergeMaps(localMap,cloudMap){

        var result = {};
        var ids = {};

        Object.keys(localMap || {})
        .forEach(function(id){ ids[id] = true; });

        Object.keys(cloudMap || {})
        .forEach(function(id){ ids[id] = true; });

        Object.keys(ids)
        .forEach(function(id){

            var localOrder = localMap[id];
            var cloudOrder = cloudMap[id];

            if(localOrder && !cloudOrder){
                result[id] = cloneValue(localOrder);
                return;
            }

            if(cloudOrder && !localOrder){
                result[id] = cloneValue(cloudOrder);
                return;
            }

            var localTime =
            Number(localOrder.updatedAt || 0);

            var cloudTime =
            Number(cloudOrder.updatedAt || 0);

            result[id] =
            localTime > cloudTime
            ? cloneValue(localOrder)
            : cloneValue(cloudOrder);
        });

        return result;
    }

    function refreshOrderScreens(){

        if(typeof renderSalesHistory === "function"){
            renderSalesHistory();
        }

        if(typeof renderAdminDashboard === "function"){
            renderAdminDashboard();
        }

        if(typeof renderShiftReport === "function"){
            var page =
            document.getElementById("shiftReportPage");

            if(
                page &&
                page.classList.contains("active")
            ){
                renderShiftReport();
            }
        }

        if(
            typeof renderMemberList === "function" &&
            document.getElementById("memberManagerPage")
        ){
            renderMemberList();
        }

        if(
            typeof renderMemberHistory === "function" &&
            typeof currentMemberHistoryId !== "undefined" &&
            currentMemberHistoryId
        ){
            renderMemberHistory();
        }
    }

    function applyCloudMap(map){

        applyingCloud = true;

        salesHistory = mapToArray(map);
        window.salesHistory = salesHistory;

        localStorage.setItem(
            "salesHistory",
            JSON.stringify(salesHistory)
        );

        lastOrderMap = cloneValue(map);

        applyingCloud = false;

        refreshOrderScreens();
    }

    function setSyncStatus(title,detail,state){

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

    function uploadMap(map){

        if(!orderRef){
            pendingWrite = true;
            return;
        }

        pendingWrite = false;

        orderRef
        .set(map)
        .then(function(){

            lastOrderMap = cloneValue(map);

            setSyncStatus(
                "訂單已同步",
                "售票紀錄 " +
                mapToArray(map).length +
                " 筆，已保存至雲端",
                "online"
            );
        })
        .catch(function(error){

            pendingWrite = true;

            console.error(
                "[MonsterOrderCloud] upload error:",
                error
            );

            setSyncStatus(
                "訂單等待同步",
                "本機售票紀錄已保存，網路恢復後會補傳",
                "warning"
            );
        });
    }

    function scheduleUpload(){

        if(writeTimer){
            clearTimeout(writeTimer);
        }

        writeTimer = setTimeout(function(){

            var map = stampLocalChanges(
                arrayToMap(salesHistory)
            );

            applyingCloud = true;

            salesHistory = mapToArray(map);
            window.salesHistory = salesHistory;

            localStorage.setItem(
                "salesHistory",
                JSON.stringify(salesHistory)
            );

            applyingCloud = false;

            uploadMap(map);

        },300);
    }

    function handleCloudValue(snapshot){

        var cloudMap = snapshot.val() || {};
        var localMap = arrayToMap(salesHistory);

        if(!initialized){

            initialized = true;

            if(
                Object.keys(cloudMap).length === 0 &&
                Object.keys(localMap).length > 0
            ){
                var firstMap =
                stampLocalChanges(localMap);

                applyCloudMap(firstMap);
                uploadMap(firstMap);
                return;
            }

            var merged =
            mergeMaps(localMap,cloudMap);

            applyCloudMap(merged);

            if(
                JSON.stringify(merged) !==
                JSON.stringify(cloudMap)
            ){
                uploadMap(merged);
            }else{
                setSyncStatus(
                    "訂單已同步",
                    "已下載 " +
                    mapToArray(merged).length +
                    " 筆售票紀錄",
                    "online"
                );
            }

            return;
        }

        if(applyingCloud){
            return;
        }

        var currentLocalMap =
        arrayToMap(salesHistory);

        var mergedLive =
        mergeMaps(currentLocalMap,cloudMap);

        applyCloudMap(mergedLive);

        if(
            JSON.stringify(mergedLive) !==
            JSON.stringify(cloudMap)
        ){
            uploadMap(mergedLive);
        }else{
            setSyncStatus(
                "訂單已同步",
                "售票紀錄已即時更新",
                "online"
            );
        }
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

        orderRef.on(
            "value",
            handleCloudValue,
            function(error){

                console.error(
                    "[MonsterOrderCloud] read error:",
                    error
                );

                setSyncStatus(
                    "訂單同步失敗",
                    error.code ||
                    error.message ||
                    "database read failed",
                    "error"
                );
            }
        );
    }

    window.MonsterOrderCloud.onLocalSave =
    function(){

        if(applyingCloud){
            return;
        }

        scheduleUpload();
    };

    window.MonsterOrderCloud.forceSync =
    function(){
        scheduleUpload();
    };

    window.MonsterOrderCloud.getInfo =
    function(){

        return {
            initialized:initialized,
            pendingWrite:pendingWrite,
            localCount:
            Array.isArray(salesHistory)
            ? salesHistory.length
            : 0
        };
    };

    lastOrderMap =
    arrayToMap(salesHistory);

    if(
        window.MonsterCloud &&
        typeof window.MonsterCloud.onReady ===
        "function"
    ){
        window.MonsterCloud.onReady(startSync);
    }else{

        var waitTimer =
        setInterval(function(){

            if(
                window.MonsterCloud &&
                typeof window.MonsterCloud.onReady ===
                "function"
            ){
                clearInterval(waitTimer);
                window.MonsterCloud.onReady(startSync);
            }
        },500);
    }

    window.addEventListener(
        "online",
        function(){

            if(pendingWrite){
                scheduleUpload();
            }
        }
    );

})();
