// =========================================
// 小怪獸售票機 V7 Phase 2A-2
// 會員雲端同步
// Firebase Realtime Database + localStorage 備援
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var CLOUD_MEMBER_PATH =
        "monsterTicket/v1/members";

    var DELETE_QUEUE_KEY =
        "monsterMemberDeleteQueue";

    var memberRef = null;
    var initialized = false;
    var applyingCloud = false;
    var lastLocalMap = {};
    var writeTimer = null;
    var pendingWrite = false;

    window.MonsterMemberCloud =
        window.MonsterMemberCloud || {};

    function cloneValue(value){
        return JSON.parse(JSON.stringify(value));
    }

    function arrayToMap(list){

        var result = {};

        if(!Array.isArray(list)){
            return result;
        }

        list.forEach(function(member){

            if(!member || !member.id){
                return;
            }

            result[member.id] =
            cloneValue(member);
        });

        return result;
    }

    function mapToArray(map){

        var result = [];

        if(!map || typeof map !== "object"){
            return result;
        }

        Object.keys(map).forEach(function(id){

            var member = map[id];

            if(!member){
                return;
            }

            if(!member.id){
                member.id = id;
            }

            result.push(member);
        });

        result.sort(function(a,b){

            var aTime =
            Number(a.updatedAt || 0);

            var bTime =
            Number(b.updatedAt || 0);

            if(aTime !== bTime){
                return bTime - aTime;
            }

            return String(
                b.joinDate || ""
            ).localeCompare(
                String(a.joinDate || "")
            );
        });

        return result;
    }

    function comparableMember(member){

        var copy =
        cloneValue(member || {});

        delete copy.updatedAt;
        delete copy.updatedBy;

        return JSON.stringify(copy);
    }

    function loadDeleteQueue(){

        try{

            var data =
            JSON.parse(
                localStorage.getItem(
                    DELETE_QUEUE_KEY
                ) || "[]"
            );

            return Array.isArray(data)
            ? data
            : [];

        }catch(error){
            return [];
        }
    }

    function saveDeleteQueue(queue){

        localStorage.setItem(
            DELETE_QUEUE_KEY,
            JSON.stringify(queue)
        );
    }

    function addDeleteQueue(id){

        var queue =
        loadDeleteQueue();

        if(queue.indexOf(id) === -1){
            queue.push(id);
        }

        saveDeleteQueue(queue);
    }

    function removeDeleteQueue(id){

        saveDeleteQueue(
            loadDeleteQueue().filter(
                function(item){
                    return item !== id;
                }
            )
        );
    }

    function refreshMemberScreens(){

        if(
            typeof renderMemberList === "function" &&
            document.getElementById("memberManagerPage")
        ){
            renderMemberList();
        }

        if(
            typeof renderMemberHistory === "function" &&
            currentMemberHistoryId
        ){
            renderMemberHistory();
        }

        if(typeof renderSelectedMember === "function"){
            renderSelectedMember();
        }

        if(typeof renderAdminDashboard === "function"){
            renderAdminDashboard();
        }
    }

    function updateLocalMemberArray(list){

        applyingCloud = true;

        memberData = list;

        if(
            typeof normalizeMemberPointFields ===
            "function"
        ){
            normalizeMemberPointFields();
        }

        localStorage.setItem(
            MEMBER_KEY,
            JSON.stringify(memberData)
        );

        lastLocalMap =
        arrayToMap(memberData);

        applyingCloud = false;

        refreshMemberScreens();
    }

    function mergeMemberMaps(localMap,cloudMap){

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

            var localMember =
            localMap[id];

            var cloudMember =
            cloudMap[id];

            if(localMember && !cloudMember){
                merged[id] =
                cloneValue(localMember);
                return;
            }

            if(cloudMember && !localMember){
                merged[id] =
                cloneValue(cloudMember);
                return;
            }

            var localTime =
            Number(localMember.updatedAt || 0);

            var cloudTime =
            Number(cloudMember.updatedAt || 0);

            merged[id] =
            localTime > cloudTime
            ? cloneValue(localMember)
            : cloneValue(cloudMember);
        });

        return merged;
    }

    function stampChangedMembers(currentMap){

        var now = Date.now();

        var deviceId =
        window.MonsterCloud &&
        window.MonsterCloud.uid
        ? window.MonsterCloud.uid
        : "local";

        Object.keys(currentMap)
        .forEach(function(id){

            var current =
            currentMap[id];

            var previous =
            lastLocalMap[id];

            if(
                !previous ||
                comparableMember(current) !==
                comparableMember(previous)
            ){
                current.updatedAt = now;
                current.updatedBy = deviceId;
            }
        });

        Object.keys(lastLocalMap)
        .forEach(function(id){

            if(!currentMap[id]){
                addDeleteQueue(id);
            }
        });

        return currentMap;
    }

    function updateSyncStatus(text){

        if(
            window.MonsterCloud &&
            typeof window.MonsterCloud.setStatus ===
            "function"
        ){
            window.MonsterCloud.setStatus(
                "online",
                "會員已同步",
                text
            );
        }
    }

    function uploadMap(map){

        if(!memberRef){
            pendingWrite = true;
            return;
        }

        pendingWrite = false;

        memberRef
        .set(map)
        .then(function(){

            lastLocalMap =
            cloneValue(map);

            updateSyncStatus(
                "會員資料 " +
                Object.keys(map).length +
                " 筆，已同步至雲端"
            );
        })
        .catch(function(error){

            pendingWrite = true;

            console.error(
                "[MonsterMemberCloud] upload error:",
                error
            );

            if(
                window.MonsterCloud &&
                typeof window.MonsterCloud.setStatus ===
                "function"
            ){
                window.MonsterCloud.setStatus(
                    "warning",
                    "會員等待同步",
                    "本機資料已保存，網路恢復後會再次同步"
                );
            }
        });
    }

    function flushDeleteQueue(){

        if(!memberRef){
            return Promise.resolve();
        }

        var queue =
        loadDeleteQueue();

        if(queue.length === 0){
            return Promise.resolve();
        }

        return Promise.all(
            queue.map(function(id){

                return memberRef
                .child(id)
                .remove()
                .then(function(){
                    removeDeleteQueue(id);
                });
            })
        );
    }

    function scheduleUpload(){

        if(writeTimer){
            clearTimeout(writeTimer);
        }

        writeTimer =
        setTimeout(function(){

            var currentMap =
            stampChangedMembers(
                arrayToMap(memberData)
            );

            applyingCloud = true;

            memberData =
            mapToArray(currentMap);

            localStorage.setItem(
                MEMBER_KEY,
                JSON.stringify(memberData)
            );

            applyingCloud = false;

            flushDeleteQueue()
            .then(function(){
                uploadMap(currentMap);
            });
        },350);
    }

    function handleCloudValue(snapshot){

        var cloudMap =
        snapshot.val() || {};

        var localMap =
        arrayToMap(memberData);

        if(!initialized){

            initialized = true;

            if(
                Object.keys(cloudMap).length === 0 &&
                Object.keys(localMap).length > 0
            ){
                var firstUploadMap =
                stampChangedMembers(localMap);

                updateLocalMemberArray(
                    mapToArray(firstUploadMap)
                );

                uploadMap(firstUploadMap);
                return;
            }

            var merged =
            mergeMemberMaps(
                localMap,
                cloudMap
            );

            updateLocalMemberArray(
                mapToArray(merged)
            );

            if(
                JSON.stringify(merged) !==
                JSON.stringify(cloudMap)
            ){
                uploadMap(merged);
            }else{
                updateSyncStatus(
                    "已下載 " +
                    Object.keys(merged).length +
                    " 筆會員資料"
                );
            }

            return;
        }

        if(applyingCloud){
            return;
        }

        updateLocalMemberArray(
            mapToArray(cloudMap)
        );

        updateSyncStatus(
            "會員資料 " +
            Object.keys(cloudMap).length +
            " 筆，已即時更新"
        );
    }

    function startSync(){

        if(
            !window.MonsterCloud ||
            !window.MonsterCloud.database
        ){
            return;
        }

        memberRef =
        window.MonsterCloud.database
        .ref(CLOUD_MEMBER_PATH);

        memberRef.on(
            "value",
            handleCloudValue,
            function(error){

                console.error(
                    "[MonsterMemberCloud] read error:",
                    error
                );

                if(
                    window.MonsterCloud &&
                    typeof window.MonsterCloud.setStatus ===
                    "function"
                ){
                    window.MonsterCloud.setStatus(
                        "error",
                        "會員同步失敗",
                        error.code ||
                        error.message ||
                        "database read failed"
                    );
                }
            }
        );

        flushDeleteQueue();
    }

    window.MonsterMemberCloud.onLocalSave =
    function(){

        if(applyingCloud){
            return;
        }

        scheduleUpload();
    };

    window.MonsterMemberCloud.forceSync =
    function(){
        scheduleUpload();
    };

    window.MonsterMemberCloud.getInfo =
    function(){

        return {
            initialized:initialized,
            pendingWrite:pendingWrite,
            localCount:
            Array.isArray(memberData)
            ? memberData.length
            : 0,
            deleteQueue:
            loadDeleteQueue()
        };
    };

    lastLocalMap =
    arrayToMap(memberData);

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
