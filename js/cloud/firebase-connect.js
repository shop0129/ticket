// =========================================
// 小怪獸售票機 V7 Phase 2A-1
// Firebase 連線測試（不進行資料同步）
// Android WebView 61 相容版
// =========================================

(function(){

    "use strict";

    var statusElement = null;
    var statusTextElement = null;
    var detailElement = null;
    var connectedRef = null;
    var authReady = false;
    var connectionReady = false;
    var initFinished = false;
    var connectTimeout = null;

    window.MonsterCloud = window.MonsterCloud || {};

    function findStatusElements(){
        statusElement = document.getElementById("cloudSyncStatus");
        statusTextElement = document.getElementById("cloudSyncStatusText");
        detailElement = document.getElementById("cloudSyncStatusDetail");
    }

    function setStatus(type,text,detail){

        if(!statusElement){
            findStatusElements();
        }

        if(!statusElement){
            return;
        }

        statusElement.className = "cloud-sync-status cloud-sync-" + type;

        if(statusTextElement){
            statusTextElement.innerHTML = text;
        }

        if(detailElement){
            detailElement.innerHTML = detail || "";
        }

        statusElement.title = detail || text;

        window.MonsterCloud.status = type;
        window.MonsterCloud.statusText = text;
        window.MonsterCloud.statusDetail = detail || "";
    }

    function showStatusPanel(){

        if(!statusElement){
            findStatusElements();
        }

        if(statusElement){
            statusElement.style.display = "-webkit-flex";
            statusElement.style.display = "flex";
        }
    }

    function clearConnectTimeout(){
        if(connectTimeout){
            clearTimeout(connectTimeout);
            connectTimeout = null;
        }
    }

    function handleFirebaseError(error){

        clearConnectTimeout();

        var code = error && error.code ? error.code : "unknown";
        var message = error && error.message ? error.message : "Firebase 連線失敗";

        console.error("[MonsterCloud] Firebase error:",code,message);

        setStatus("error","雲端連線失敗",code + "：" + message);
    }

    function watchDatabaseConnection(){

        if(!window.firebase || !firebase.database){
            setStatus("error","資料庫 SDK 未載入","請確認網路與 Firebase Database SDK");
            return;
        }

        try{
            connectedRef = firebase.database().ref(".info/connected");

            connectedRef.on(
                "value",
                function(snapshot){
                    connectionReady = snapshot.val() === true;

                    if(connectionReady){
                        clearConnectTimeout();
                        setStatus("online","雲端已連線","Firebase 登入與 Realtime Database 連線正常");
                    }else if(navigator.onLine === false){
                        setStatus("offline","離線模式","目前沒有網路，售票機仍使用本機資料");
                    }else{
                        setStatus("connecting","雲端連線中","正在等待 Realtime Database 回應");
                    }
                },
                handleFirebaseError
            );
        }catch(error){
            handleFirebaseError(error);
        }
    }

    function signInAnonymously(){

        if(!window.firebase || !firebase.auth){
            setStatus("error","驗證 SDK 未載入","請確認網路與 Firebase Auth SDK");
            return;
        }

        firebase.auth().onAuthStateChanged(
            function(user){
                if(user){
                    authReady = true;
                    window.MonsterCloud.uid = user.uid;
                    watchDatabaseConnection();
                }else{
                    authReady = false;
                    firebase.auth().signInAnonymously().catch(handleFirebaseError);
                }
            },
            handleFirebaseError
        );
    }

    function initializeFirebase(){

        if(initFinished){
            return;
        }

        initFinished = true;
        showStatusPanel();

        if(navigator.onLine === false){
            setStatus("offline","離線模式","目前沒有網路，售票機仍可使用本機資料");
        }else{
            setStatus("connecting","雲端連線中","正在連接 Firebase");
        }

        if(window.MonsterFirebaseSdkFailed){
            setStatus("error","Firebase SDK 載入失敗","請檢查點餐機是否能連線至 www.gstatic.com");
            return;
        }

        if(!window.firebase || !window.MONSTER_FIREBASE_CONFIG){
            setStatus("error","Firebase 尚未載入","請確認 Firebase SDK 與設定檔");
            return;
        }

        try{
            if(!firebase.apps.length){
                firebase.initializeApp(window.MONSTER_FIREBASE_CONFIG);
            }

            window.MonsterCloud.app = firebase.app();
            window.MonsterCloud.auth = firebase.auth();
            window.MonsterCloud.database = firebase.database();

            connectTimeout = setTimeout(
                function(){
                    if(!connectionReady){
                        setStatus(
                            "warning",
                            "雲端連線逾時",
                            authReady ? "已登入，但資料庫尚未回應" : "Firebase 尚未完成匿名登入"
                        );
                    }
                },
                15000
            );

            signInAnonymously();
        }catch(error){
            handleFirebaseError(error);
        }
    }

    function handleBrowserOnline(){
        setStatus("connecting","雲端重新連線中","網路已恢復，正在重新連接 Firebase");

        if(window.firebase && firebase.database){
            try{
                firebase.database().goOnline();
            }catch(error){
                console.warn(error);
            }
        }
    }

    function handleBrowserOffline(){
        setStatus("offline","離線模式","目前沒有網路，售票機仍使用本機資料");
    }

    window.addEventListener("online",handleBrowserOnline);
    window.addEventListener("offline",handleBrowserOffline);

    window.MonsterCloud.getConnectionInfo = function(){
        return {
            status:window.MonsterCloud.status || "unknown",
            text:window.MonsterCloud.statusText || "",
            detail:window.MonsterCloud.statusDetail || "",
            uid:window.MonsterCloud.uid || "",
            authenticated:authReady,
            databaseConnected:connectionReady
        };
    };

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded",initializeFirebase);
    }else{
        initializeFirebase();
    }

})();
