// =========================================
// 小怪獸售票機 V7.8.3.3 FIX62
// 售票機訂單輕量同步：啟動只保留最近 30 筆、單筆增量上傳、完整紀錄按需載入
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
    var RECENT_ORDER_LIMIT = 30;
    var lightweightKioskMode = isLightweightKiosk();
    var fullHistoryLoaded = false;
    var orderListenerRef = null;

    window.MonsterOrderCloud =
        window.MonsterOrderCloud || {};

    function cloneValue(value){
        return JSON.parse(JSON.stringify(value));
    }

    function isLightweightKiosk(){

        var bodyApp =
        document.body &&
        document.body.getAttribute("data-pwa-app");

        return !!(
            bodyApp === "kiosk" ||
            window.MonsterNativeKiosk ||
            /(?:^|[?&])kioskLite=1(?:&|$)/.test(location.search || "")
        );
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

    function limitOrderMap(map,limit){

        var result = {};

        mapToArray(map || {})
        .slice(0,Math.max(1,Number(limit || RECENT_ORDER_LIMIT)))
        .forEach(function(order,index){

            var copy =
            ensureOrderIdentity(
                cloneValue(order),
                index
            );

            result[copy.cloudId] = copy;
        });

        return result;
    }

    function compactMapIfNeeded(map){

        if(
            lightweightKioskMode &&
            !fullHistoryLoaded
        ){
            return limitOrderMap(
                map,
                RECENT_ORDER_LIMIT
            );
        }

        return map || {};
    }

    function comparableOrder(order){

        var copy = cloneValue(order || {});

        delete copy.updatedAt;
        delete copy.updatedBy;

        return JSON.stringify(copy);
    }

    function changedOrderMap(nextMap,previousMap){

        var changes = {};

        Object.keys(nextMap || {})
        .forEach(function(id){

            var next = nextMap[id];
            var previous = previousMap && previousMap[id];

            if(
                !previous ||
                comparableOrder(next) !==
                comparableOrder(previous)
            ){
                changes[id] = cloneValue(next);
            }
        });

        return changes;
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

            // 已刪除的訂單不可被舊的本機副本復活。
            if(previous && previous.deleted){
                currentMap[id] = cloneValue(previous);
                return;
            }

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

            // 系統沒有「復原已刪除訂單」功能，因此刪除標記永遠優先。
            // 避免手機刪除後，售票機快取再次把作廢訂單補回 Dashboard。
            if(localOrder.deleted || cloudOrder.deleted){
                if(localOrder.deleted && cloudOrder.deleted){
                    result[id] = Number(localOrder.updatedAt || 0) > Number(cloudOrder.updatedAt || 0)
                    ? cloneValue(localOrder)
                    : cloneValue(cloudOrder);
                }else{
                    result[id] = cloneValue(localOrder.deleted ? localOrder : cloudOrder);
                }
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

        var salesPage =
        document.getElementById("salesHistoryPage");

        var memberPage =
        document.getElementById("memberManagerPage");

        if(
            typeof renderSalesHistory === "function" &&
            salesPage &&
            salesPage.classList.contains("active")
        ){
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
            memberPage &&
            memberPage.classList.contains("active")
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

        map = compactMapIfNeeded(map || {});

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

    function uploadMap(map,visibleCount){

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

            Object.keys(map || {})
            .forEach(function(id){
                lastOrderMap[id] =
                cloneValue(map[id]);
            });

            lastCloudUpdateAt = Date.now();
            notifyOrderUpdate("local-upload",map);

            setSyncStatus(
                "訂單已同步",
                "本次更新 " +
                Object.keys(map || {}).length +
                " 筆；售票機保留最近 " +
                Number(visibleCount || salesHistory.length || 0) +
                " 筆",
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

            var changes =
            changedOrderMap(
                map,
                lastOrderMap
            );

            var visibleMap =
            compactMapIfNeeded(map);

            applyingCloud = true;

            salesHistory =
            mapToArray(visibleMap);
            window.salesHistory = salesHistory;

            localStorage.setItem(
                "salesHistory",
                JSON.stringify(salesHistory)
            );

            applyingCloud = false;

            if(Object.keys(changes).length){
                uploadMap(
                    changes,
                    salesHistory.length
                );
            }else{
                pendingWrite = false;
            }

        },Math.max(
            0,
            delay === undefined
            ? 80
            : Number(delay)
        ));
    }

    function handleCloudValue(snapshot){

        var cloudMap = snapshot.val() || {};
        var localMap =
        arrayToMap(salesHistory);

        if(lightweightKioskMode){

            if(applyingCloud){
                return;
            }

            initialized = true;

            var lightweightMerged =
            mergeMaps(
                localMap,
                cloudMap
            );

            applyCloudMap(
                lightweightMerged
            );

            setSyncStatus(
                "訂單輕量同步",
                fullHistoryLoaded
                ? "完整售票紀錄已按需載入"
                : "只保留最近 " +
                  salesHistory.length +
                  " 筆，舊訂單不會刪除",
                "online"
            );

            return;
        }

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

            orderListenerRef =
            orderRef;

            if(
                lightweightKioskMode &&
                orderRef.orderByKey &&
                typeof orderRef.orderByKey === "function"
            ){
                orderListenerRef =
                orderRef
                .orderByKey()
                .limitToLast(
                    RECENT_ORDER_LIMIT
                );
            }

            orderListenerRef.on(
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

    function loadFullHistory(){

        if(
            !lightweightKioskMode ||
            fullHistoryLoaded
        ){
            return Promise.resolve(
                cloneValue(salesHistory || [])
            );
        }

        if(!orderRef){
            return Promise.reject({
                code:"orders/not-ready",
                message:"雲端訂單尚未連線，請稍後再試"
            });
        }

        fullHistoryLoaded = true;

        setSyncStatus(
            "正在載入完整紀錄",
            "只有開啟售票紀錄時才會下載舊訂單",
            "connecting"
        );

        return orderRef
        .once("value")
        .then(function(snapshot){

            var fullMap =
            snapshot.val() || {};

            applyCloudMap(fullMap);

            setSyncStatus(
                "完整紀錄已載入",
                "共 " +
                salesHistory.length +
                " 筆；返回 Dashboard 後會恢復輕量模式",
                "online"
            );

            return cloneValue(
                salesHistory
            );
        })
        .catch(function(error){

            fullHistoryLoaded = false;

            applyCloudMap(
                limitOrderMap(
                    arrayToMap(salesHistory),
                    RECENT_ORDER_LIMIT
                )
            );

            throw error;
        });
    }

    function releaseFullHistory(){

        if(
            !lightweightKioskMode ||
            !fullHistoryLoaded
        ){
            return;
        }

        fullHistoryLoaded = false;

        applyCloudMap(
            limitOrderMap(
                arrayToMap(salesHistory),
                RECENT_ORDER_LIMIT
            )
        );

        setSyncStatus(
            "訂單輕量同步",
            "售票機已恢復最近 " +
            salesHistory.length +
            " 筆；雲端舊訂單完整保留",
            "online"
        );
    }

    function installHistoryReleaseGuard(){

        var adminHome =
        document.getElementById("adminHomePage");

        if(
            !lightweightKioskMode ||
            !adminHome ||
            !window.MutationObserver
        ){
            return;
        }

        new MutationObserver(function(){

            if(
                fullHistoryLoaded &&
                adminHome.classList.contains("active")
            ){
                releaseFullHistory();
            }
        }).observe(
            adminHome,
            {
                attributes:true,
                attributeFilter:["class"]
            }
        );
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

    window.MonsterOrderCloud.deleteOrder =
    function(order){
        if(!order){ return Promise.resolve(false); }
        var copy = ensureOrderIdentity(cloneValue(order),0);
        var id = copy.cloudId;
        var tombstone = {
            cloudId:id,
            orderNo:copy.orderNo || id,
            deleted:true,
            status:"deleted",
            deletedAt:Date.now(),
            updatedAt:Date.now(),
            updatedBy:window.MonsterCloud && window.MonsterCloud.uid ? window.MonsterCloud.uid : "manager"
        };
        if(!orderRef){
            pendingWrite = true;
            return Promise.resolve(false);
        }
        return orderRef.child(safeKey(id)).update(tombstone).then(function(){ return true; });
    };

    window.MonsterOrderCloud.loadFullHistory =
    loadFullHistory;

    window.MonsterOrderCloud.releaseFullHistory =
    releaseFullHistory;

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
            lightweightKioskMode:lightweightKioskMode,
            recentOrderLimit:RECENT_ORDER_LIMIT,
            fullHistoryLoaded:fullHistoryLoaded,
            localCount:
            Array.isArray(salesHistory)
            ? salesHistory.length
            : 0
        };
    };

    if(lightweightKioskMode){

        salesHistory =
        mapToArray(
            limitOrderMap(
                arrayToMap(salesHistory),
                RECENT_ORDER_LIMIT
            )
        );

        window.salesHistory =
        salesHistory;

        try{
            localStorage.setItem(
                "salesHistory",
                JSON.stringify(salesHistory)
            );
        }catch(error){}
    }

    lastOrderMap =
    arrayToMap(salesHistory);

    if(document.readyState === "loading"){
        document.addEventListener(
            "DOMContentLoaded",
            installHistoryReleaseGuard
        );
    }else{
        installHistoryReleaseGuard();
    }

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
