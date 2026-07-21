// =========================================
// 小怪獸售票機 V7 Phase 2A-3
// 票券與票卡圖片雲端同步
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var TICKET_PATH =
        "monsterTicket/v1/tickets";

    var IMAGE_PATH =
        "monsterTicket/v1/ticketImages";

    var FORCE_RESET_KEY =
        "monsterTicketForceLocalReset";

    var ticketRef = null;
    var imageRef = null;

    var ticketInitialized = false;
    var imageInitialized = false;

    var applyingTicketCloud = false;
    var applyingImageCloud = false;

    var lastTicketMap = {};
    var lastImageMap = {};

    var ticketTimer = null;
    var imageTimer = null;

    var pendingTicketWrite = false;
    var pendingImageWrite = false;

    window.MonsterTicketCloud =
        window.MonsterTicketCloud || {};

    function cloneValue(value){

        return JSON.parse(
            JSON.stringify(value)
        );
    }

    function comparable(value){

        var copy =
        cloneValue(value || {});

        delete copy.updatedAt;
        delete copy.updatedBy;

        return JSON.stringify(copy);
    }

    function currentDeviceId(){

        if(
            window.MonsterCloud &&
            window.MonsterCloud.uid
        ){
            return window.MonsterCloud.uid;
        }

        return "local";
    }

    function stampChangedMap(
        currentMap,
        previousMap
    ){

        var now = Date.now();
        var deviceId =
        currentDeviceId();

        Object.keys(currentMap)
        .forEach(function(id){

            var current =
            currentMap[id];

            var previous =
            previousMap[id];

            if(
                !previous ||
                comparable(current) !==
                comparable(previous)
            ){
                current.updatedAt = now;
                current.updatedBy = deviceId;
                current.deleted = false;
            }
        });

        Object.keys(previousMap)
        .forEach(function(id){

            if(!currentMap[id]){

                currentMap[id] = {
                    id:id,
                    deleted:true,
                    updatedAt:now,
                    updatedBy:deviceId
                };
            }
        });

        return currentMap;
    }

    function mergeMaps(localMap,cloudMap){

        var merged = {};
        var ids = {};

        Object.keys(localMap || {})
        .forEach(function(id){
            ids[id] = true;
        });

        Object.keys(cloudMap || {})
        .forEach(function(id){
            ids[id] = true;
        });

        Object.keys(ids)
        .forEach(function(id){

            var localItem =
            localMap[id];

            var cloudItem =
            cloudMap[id];

            if(localItem && !cloudItem){
                merged[id] =
                cloneValue(localItem);
                return;
            }

            if(cloudItem && !localItem){
                merged[id] =
                cloneValue(cloudItem);
                return;
            }

            var localTime =
            Number(localItem.updatedAt || 0);

            var cloudTime =
            Number(cloudItem.updatedAt || 0);

            merged[id] =
            localTime > cloudTime
            ? cloneValue(localItem)
            : cloneValue(cloudItem);
        });

        return merged;
    }

    function ticketObjectToCloudMap(data){

        var result = {};

        Object.keys(data || {})
        .forEach(function(id){

            var ticket =
            cloneValue(data[id]);

            ticket.id = id;

            result[id] = ticket;
        });

        return result;
    }

    function cloudMapToTicketObject(map){

        var result = {};

        Object.keys(map || {})
        .forEach(function(id){

            var ticket = map[id];

            if(
                !ticket ||
                ticket.deleted
            ){
                return;
            }

            var copy =
            cloneValue(ticket);

            delete copy.id;
            delete copy.deleted;

            result[id] = copy;
        });

        return result;
    }

    function imageArrayToMap(list){

        var result = {};

        if(!Array.isArray(list)){
            return result;
        }

        list.forEach(function(image){

            if(!image || !image.id){
                return;
            }

            result[image.id] =
            cloneValue(image);
        });

        return result;
    }

    function cloudMapToImageArray(map){

        var result = [];

        Object.keys(map || {})
        .forEach(function(id){

            var image = map[id];

            if(
                !image ||
                image.deleted
            ){
                return;
            }

            var copy =
            cloneValue(image);

            if(!copy.id){
                copy.id = id;
            }

            delete copy.deleted;

            result.push(copy);
        });

        result.sort(function(a,b){

            return Number(b.updatedAt || 0) -
                   Number(a.updatedAt || 0);
        });

        return result;
    }

    function refreshTicketScreens(){

        if(
            typeof renderTicketCatalog ===
            "function"
        ){
            renderTicketCatalog();
        }

        if(
            typeof updateTicketPrices ===
            "function"
        ){
            updateTicketPrices();
        }

        var managerPage =
        document.getElementById(
            "ticketManagerPage"
        );

        if(
            managerPage &&
            managerPage.classList.contains(
                "active"
            ) &&
            typeof renderTicketManager ===
            "function"
        ){
            renderTicketManager();
        }
    }

    function updateCloudStatus(text){

        if(
            window.MonsterCloud &&
            typeof window.MonsterCloud.setStatus ===
            "function"
        ){
            window.MonsterCloud.setStatus(
                "online",
                "票券已同步",
                text
            );
        }
    }

    function applyTicketMap(map){

        applyingTicketCloud = true;

        ticketData =
        cloudMapToTicketObject(map);

        localStorage.setItem(
            "ticketData",
            JSON.stringify(ticketData)
        );

        lastTicketMap =
        cloneValue(map);

        applyingTicketCloud = false;

        refreshTicketScreens();
    }

    function applyImageMap(map){

        applyingImageCloud = true;

        ticketImageLibrary =
        cloudMapToImageArray(map);

        localStorage.setItem(
            TICKET_IMAGE_LIBRARY_KEY,
            JSON.stringify(ticketImageLibrary)
        );

        lastImageMap =
        cloneValue(map);

        applyingImageCloud = false;

        refreshTicketScreens();
    }

    function uploadTicketMap(map){

        if(!ticketRef){
            pendingTicketWrite = true;
            return;
        }

        pendingTicketWrite = false;

        ticketRef
        .set(map)
        .then(function(){

            lastTicketMap =
            cloneValue(map);

            updateCloudStatus(
                "票券 " +
                Object.keys(
                    cloudMapToTicketObject(map)
                ).length +
                " 張，已同步"
            );
        })
        .catch(function(error){

            pendingTicketWrite = true;

            console.error(
                "[MonsterTicketCloud] ticket upload error:",
                error
            );

            if(
                window.MonsterCloud &&
                typeof window.MonsterCloud.setStatus ===
                "function"
            ){
                window.MonsterCloud.setStatus(
                    "warning",
                    "票券等待同步",
                    "本機票券已保存，連線恢復後會補同步"
                );
            }
        });
    }

    function uploadImageMap(map){

        if(!imageRef){
            pendingImageWrite = true;
            return;
        }

        pendingImageWrite = false;

        imageRef
        .set(map)
        .then(function(){

            lastImageMap =
            cloneValue(map);
        })
        .catch(function(error){

            pendingImageWrite = true;

            console.error(
                "[MonsterTicketCloud] image upload error:",
                error
            );
        });
    }

    function scheduleTicketUpload(){

        if(ticketTimer){
            clearTimeout(ticketTimer);
        }

        ticketTimer =
        setTimeout(function(){

            var map =
            stampChangedMap(
                ticketObjectToCloudMap(
                    ticketData
                ),
                lastTicketMap
            );

            applyingTicketCloud = true;

            ticketData =
            cloudMapToTicketObject(map);

            localStorage.setItem(
                "ticketData",
                JSON.stringify(ticketData)
            );

            applyingTicketCloud = false;

            uploadTicketMap(map);

        },350);
    }

    function scheduleImageUpload(){

        if(imageTimer){
            clearTimeout(imageTimer);
        }

        imageTimer =
        setTimeout(function(){

            var map =
            stampChangedMap(
                imageArrayToMap(
                    ticketImageLibrary
                ),
                lastImageMap
            );

            applyingImageCloud = true;

            ticketImageLibrary =
            cloudMapToImageArray(map);

            localStorage.setItem(
                TICKET_IMAGE_LIBRARY_KEY,
                JSON.stringify(ticketImageLibrary)
            );

            applyingImageCloud = false;

            uploadImageMap(map);

        },500);
    }

    function handleTicketValue(snapshot){

        var cloudMap =
        snapshot.val() || {};

        var localMap =
        ticketObjectToCloudMap(
            ticketData
        );

        if(!ticketInitialized){

            ticketInitialized = true;

            var forceReset =
            localStorage.getItem(
                FORCE_RESET_KEY
            ) === "1";

            if(forceReset){

                localStorage.removeItem(
                    FORCE_RESET_KEY
                );

                var resetMap =
                stampChangedMap(
                    localMap,
                    {}
                );

                applyTicketMap(resetMap);
                uploadTicketMap(resetMap);

                return;
            }

            if(
                Object.keys(cloudMap).length === 0 &&
                Object.keys(localMap).length > 0
            ){
                var firstMap =
                stampChangedMap(
                    localMap,
                    {}
                );

                applyTicketMap(firstMap);
                uploadTicketMap(firstMap);

                return;
            }

            var merged =
            mergeMaps(
                localMap,
                cloudMap
            );

            applyTicketMap(merged);

            if(
                JSON.stringify(merged) !==
                JSON.stringify(cloudMap)
            ){
                uploadTicketMap(merged);
            }else{
                updateCloudStatus(
                    "已下載 " +
                    Object.keys(
                        cloudMapToTicketObject(merged)
                    ).length +
                    " 張票券"
                );
            }

            return;
        }

        if(applyingTicketCloud){
            return;
        }

        applyTicketMap(cloudMap);

        updateCloudStatus(
            "票券資料已即時更新"
        );
    }

    function handleImageValue(snapshot){

        var cloudMap =
        snapshot.val() || {};

        var localMap =
        imageArrayToMap(
            ticketImageLibrary
        );

        if(!imageInitialized){

            imageInitialized = true;

            if(
                Object.keys(cloudMap).length === 0 &&
                Object.keys(localMap).length > 0
            ){
                var firstMap =
                stampChangedMap(
                    localMap,
                    {}
                );

                applyImageMap(firstMap);
                uploadImageMap(firstMap);

                return;
            }

            var merged =
            mergeMaps(
                localMap,
                cloudMap
            );

            applyImageMap(merged);

            if(
                JSON.stringify(merged) !==
                JSON.stringify(cloudMap)
            ){
                uploadImageMap(merged);
            }

            return;
        }

        if(applyingImageCloud){
            return;
        }

        applyImageMap(cloudMap);
    }

    function startSync(){

        if(
            !window.MonsterCloud ||
            !window.MonsterCloud.database
        ){
            return;
        }

        ticketRef =
        window.MonsterCloud.database
        .ref(TICKET_PATH);

        imageRef =
        window.MonsterCloud.database
        .ref(IMAGE_PATH);

        ticketRef.on(
            "value",
            handleTicketValue,
            function(error){

                console.error(
                    "[MonsterTicketCloud] ticket read error:",
                    error
                );

                if(
                    window.MonsterCloud &&
                    typeof window.MonsterCloud.setStatus ===
                    "function"
                ){
                    window.MonsterCloud.setStatus(
                        "error",
                        "票券同步失敗",
                        error.code ||
                        error.message ||
                        "database read failed"
                    );
                }
            }
        );

        imageRef.on(
            "value",
            handleImageValue,
            function(error){

                console.error(
                    "[MonsterTicketCloud] image read error:",
                    error
                );
            }
        );
    }

    window.MonsterTicketCloud.onLocalSave =
    function(){

        if(applyingTicketCloud){
            return;
        }

        scheduleTicketUpload();
    };

    window.MonsterTicketCloud.onImageLibrarySave =
    function(){

        if(applyingImageCloud){
            return;
        }

        scheduleImageUpload();
    };

    window.MonsterTicketCloud.forceSync =
    function(){

        scheduleTicketUpload();
        scheduleImageUpload();
    };

    window.MonsterTicketCloud.getInfo =
    function(){

        return {
            ticketInitialized:
            ticketInitialized,

            imageInitialized:
            imageInitialized,

            ticketCount:
            Object.keys(ticketData || {})
            .length,

            imageCount:
            Array.isArray(ticketImageLibrary)
            ? ticketImageLibrary.length
            : 0,

            pendingTicketWrite:
            pendingTicketWrite,

            pendingImageWrite:
            pendingImageWrite
        };
    };

    lastTicketMap =
    ticketObjectToCloudMap(
        ticketData
    );

    lastImageMap =
    imageArrayToMap(
        ticketImageLibrary
    );

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

                window.MonsterCloud.onReady(
                    startSync
                );
            }

        },500);
    }

    window.addEventListener(
        "online",
        function(){

            if(pendingTicketWrite){
                scheduleTicketUpload();
            }

            if(pendingImageWrite){
                scheduleImageUpload();
            }
        }
    );

})();
