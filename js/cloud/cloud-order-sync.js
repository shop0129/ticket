// =========================================
// 小怪獸售票機 V7.3 Phase 3F Part 1 Fix 1
// 訂單／售票紀錄雲端同步
// Firebase Realtime Database + localStorage 離線備援
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var ORDER_PATH =
        "monsterTicket/v1/orders";

    var RESET_PATH =
        "monsterTicket/v1/system/orderResetAt";

    var orderRef = null;
    var resetRef = null;
    var globalResetAt = 0;
    var initialized = false;
    var applyingCloud = false;
    var pendingWrite = false;
    var writeTimer = null;
    var lastOrderMap = {};
    var lastCloudUpdateAt = 0;

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

    // 使用多路徑 update，只更新本機實際擁有的欄位。
    // 避免整個 orders 節點 set() 覆蓋其他裝置剛建立的訂單，
    // 也避免把生命週期模組補上的 queueNumber／playStatus 清掉。
    function mapToFieldUpdates(map){

        var updates = {};

        Object.keys(map || {})
        .forEach(function(id){

            var order = map[id];

            if(!order){
                return;
            }

            Object.keys(order)
            .forEach(function(field){

                if(order[field] !== undefined){
                    updates[
                        safeKey(id) + "/" + field
                    ] = cloneValue(order[field]);
                }
            });
        });

        return updates;
    }

    function notifyOrderUpdate(source,map){

        var detail = {
            source:source || "cloud",
            count:mapToArray(map || {}).length,
            updatedAt:Date.now()
        };

        try{
            window.dispatchEvent(
                new CustomEvent(
                    "monster:orders-updated",
                    {detail:detail}
                )
            );
        }catch(error){
            // 舊版 WebView 不支援 CustomEvent 建構式時略過通知。
        }
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
        lastCloudUpdateAt = Date.now();

        applyingCloud = false;

        refreshOrderScreens();
        notifyOrderUpdate("cloud",map);
    }


    function clearLocalAfterGlobalReset(resetAt){

        var stamp = Number(resetAt || 0);

        if(!stamp || stamp <= globalResetAt){
            return;
        }

        globalResetAt = stamp;

        if(writeTimer){
            clearTimeout(writeTimer);
            writeTimer = null;
        }

        pendingWrite = false;
        applyingCloud = true;

        salesHistory = [];
        window.salesHistory = salesHistory;
        lastOrderMap = {};

        try{
            localStorage.setItem("salesHistory","[]");
            localStorage.setItem("monsterTicketOrderResetAt",String(stamp));
            localStorage.removeItem("lastOrder");
            localStorage.removeItem("currentOrder");
            localStorage.removeItem("selectedOrder");
        }catch(error){}

        applyingCloud = false;

        refreshOrderScreens();
        notifyOrderUpdate("global-reset",{});

        setSyncStatus(
            "訂單已重置",
            "所有裝置已套用店長的訂單清除指令",
            "online"
        );
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

        var updates =
        mapToFieldUpdates(map);

        if(Object.keys(updates).length === 0){
            return;
        }

        orderRef
        .update(updates)
        .then(function(){

            lastCloudUpdateAt = Date.now();
            notifyOrderUpdate("local-upload",map);

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

    function scheduleUpload(delay){

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

        },Math.max(
            0,
            delay === undefined
            ? 80
            : Number(delay)
        ));
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

        resetRef =
        window.MonsterCloud.database
        .ref(RESET_PATH);

        function attachOrderListener(){
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

        var orderListenerAttached = false;

        function attachOrdersOnce(){
            if(orderListenerAttached){
                return;
            }
            orderListenerAttached = true;
            attachOrderListener();
        }

        resetRef.on(
            "value",
            function(resetSnapshot){
                clearLocalAfterGlobalReset(resetSnapshot.val());
                attachOrdersOnce();
            },
            function(){
                attachOrdersOnce();
            }
        );

        // 測試環境或極舊 Firebase mock 可能不會立即回呼 value。
        // 下一個事件迴圈仍啟動訂單監聽，正式 Firebase 通常會先收到 reset marker。
        setTimeout(attachOrdersOnce,0);
    }

    window.MonsterOrderCloud.onLocalSave =
    function(){

        if(applyingCloud){
            return;
        }

        // 新訂單優先傳送，讓其他裝置的 Staff／店長後台立即收到。
        scheduleUpload(40);
    };

    window.MonsterOrderCloud.forceSync =
    function(){
        scheduleUpload(0);
    };

    // Sprint 8：只清除店長明確選取的測試訂單。
    // 雲端保留最小 tombstone，讓其他已開啟的裝置不會把舊測試單重新上傳。
    window.MonsterOrderCloud.purgeTestOrders =
    function(orderIds,metadata){

        var ids = {};
        var updates = {};
        var now = Date.now();
        var actor = metadata && metadata.actorName || "店長";

        (orderIds || []).forEach(function(orderId){
            var value = String(orderId || "").trim();
            var key;
            if(!value){ return; }
            ids[value] = true;
            key = safeKey(value);
            updates[key] = {
                cloudId:key,
                orderNo:value,
                deleted:true,
                deletedReason:"test-data-cleanup",
                deletedAt:now,
                deletedBy:actor,
                updatedAt:now,
                updatedBy:(window.MonsterCloud && MonsterCloud.uid) || "kiosk"
            };
        });

        if(!Object.keys(ids).length){
            return Promise.resolve({removed:0,orderIds:[]});
        }
        if(!orderRef){
            return Promise.reject(new Error("Firebase 訂單同步尚未連線"));
        }

        applyingCloud = true;
        salesHistory = (Array.isArray(salesHistory) ? salesHistory : []).filter(function(order){
            return !ids[String(order && order.orderNo || "")];
        });
        window.salesHistory = salesHistory;
        localStorage.setItem("salesHistory",JSON.stringify(salesHistory));

        Object.keys(updates).forEach(function(key){
            lastOrderMap[key] = cloneValue(updates[key]);
        });
        applyingCloud = false;

        return orderRef.update(updates).then(function(){
            lastCloudUpdateAt = Date.now();
            refreshOrderScreens();
            notifyOrderUpdate("test-cleanup",lastOrderMap);
            setSyncStatus("測試訂單已清除","已從所有後台移除 " + Object.keys(ids).length + " 筆測試訂單","online");
            return {removed:Object.keys(ids).length,orderIds:Object.keys(ids)};
        });
    };

    window.MonsterOrderCloud.applyGlobalReset =
    function(resetAt){
        clearLocalAfterGlobalReset(resetAt || Date.now());
    };

    window.MonsterOrderCloud.getInfo =
    function(){

        return {
            initialized:initialized,
            pendingWrite:pendingWrite,
            lastCloudUpdateAt:lastCloudUpdateAt,
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
                scheduleUpload(0);
            }
        }
    );

})();
