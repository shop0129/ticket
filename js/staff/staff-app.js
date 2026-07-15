// =========================================
// 小怪獸售票機 V7 Phase 3A
// Staff 員工版：登入＋權限系統
// Android / iPhone / iPad / Windows 相容
// =========================================

(function(){

    "use strict";

    var config =
    window.MONSTER_STAFF_CONFIG || {};

    var currentRole = "";
    var firebaseReady = false;
    var dashboardCurrent = null;

    var loginPage = null;
    var homePage = null;
    var passwordInput = null;
    var loginMessage = null;
    var roleBadge = null;
    var cloudBadge = null;

    function byId(id){
        return document.getElementById(id);
    }

    function escapeText(value){

        return String(value || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
    }

    function formatMoney(value){

        return Number(value || 0)
        .toLocaleString("zh-TW");
    }

    function setCloudState(type,text){

        if(!cloudBadge){
            cloudBadge = byId("staffCloudBadge");
        }

        if(!cloudBadge){
            return;
        }

        cloudBadge.className =
        "staff-cloud-badge staff-cloud-" + type;

        cloudBadge.innerHTML =
        '<span class="staff-cloud-dot"></span>' +
        '<span>' + escapeText(text) + '</span>';
    }

    function showLoginMessage(text,isError){

        if(!loginMessage){
            loginMessage = byId("staffLoginMessage");
        }

        if(!loginMessage){
            return;
        }

        loginMessage.textContent = text || "";

        loginMessage.className =
        isError
        ? "staff-login-message error"
        : "staff-login-message";
    }

    function saveSession(role){

        try{

            sessionStorage.setItem(
                config.sessionKey ||
                "monsterStaffSession",
                JSON.stringify({
                    role:role,
                    loginAt:Date.now()
                })
            );

        }catch(error){
            console.error(error);
        }
    }

    function loadSession(){

        try{

            var data =
            JSON.parse(
                sessionStorage.getItem(
                    config.sessionKey ||
                    "monsterStaffSession"
                ) || "null"
            );

            if(
                data &&
                (
                    data.role === "staff" ||
                    data.role === "admin"
                )
            ){
                return data.role;
            }

        }catch(error){
            console.error(error);
        }

        return "";
    }

    function clearSession(){

        try{
            sessionStorage.removeItem(
                config.sessionKey ||
                "monsterStaffSession"
            );
        }catch(error){
            console.error(error);
        }
    }

    function applyRoleVisibility(){

        var adminElements =
        document.querySelectorAll(
            ".admin-only"
        );

        var staffElements =
        document.querySelectorAll(
            ".staff-allowed"
        );

        var i;

        for(i=0;i<adminElements.length;i++){

            adminElements[i].style.display =
            currentRole === "admin"
            ? ""
            : "none";
        }

        for(i=0;i<staffElements.length;i++){

            staffElements[i].style.display =
            currentRole
            ? ""
            : "none";
        }

        if(roleBadge){

            roleBadge.className =
            "staff-role-badge role-" +
            currentRole;

            roleBadge.textContent =
            currentRole === "admin"
            ? "👑 店長模式"
            : "👤 員工模式";
        }

        var subtitle =
        byId("staffHomeSubtitle");

        if(subtitle){

            subtitle.textContent =
            currentRole === "admin"
            ? "完整管理權限"
            : "日常店務操作";
        }
    }

    function showHome(){

        loginPage.style.display = "none";
        homePage.style.display = "block";

        applyRoleVisibility();
        renderDashboard();
    }

    function showLogin(){

        currentRole = "";

        homePage.style.display = "none";
        loginPage.style.display = "flex";

        if(passwordInput){
            passwordInput.value = "";
            passwordInput.focus();
        }

        showLoginMessage("",false);
    }

    function login(){

        var password =
        passwordInput
        ? passwordInput.value
        : "";

        if(
            password ===
            String(config.adminPassword || "1234")
        ){

            currentRole = "admin";

        }else if(
            password ===
            String(config.staffPassword || "0000")
        ){

            currentRole = "staff";

        }else{

            showLoginMessage(
                "密碼錯誤，請重新輸入",
                true
            );

            if(passwordInput){
                passwordInput.select();
            }

            return;
        }

        saveSession(currentRole);
        showHome();
    }

    function logout(){

        clearSession();
        showLogin();
    }

    function renderDashboard(){

        var data =
        dashboardCurrent &&
        dashboardCurrent.summary
        ? dashboardCurrent.summary
        : {};

        var date =
        dashboardCurrent &&
        dashboardCurrent.date
        ? dashboardCurrent.date
        : new Date().toLocaleDateString("zh-TW");

        var dateElement =
        byId("staffDashboardDate");

        if(dateElement){
            dateElement.textContent =
            date + " 雲端即時概況";
        }

        var fields = {
            staffTodayIncome:
            "NT$" + formatMoney(data.income),

            staffTodayOrders:
            Number(data.normalOrders || 0) + " 筆",

            staffTodayTickets:
            Number(data.ticketCount || 0) + " 張",

            staffTodayMembers:
            Number(data.newMembers || 0) + " 人",

            staffMemberOrders:
            Number(data.memberOrders || 0) + " 筆",

            staffCancelledOrders:
            Number(data.cancelledOrders || 0) + " 筆"
        };

        Object.keys(fields)
        .forEach(function(id){

            var element = byId(id);

            if(element){
                element.textContent =
                fields[id];
            }
        });
    }

    function openFeature(title,detail,adminOnly){

        if(
            adminOnly &&
            currentRole !== "admin"
        ){

            alert(
                "🔒 此功能僅限店長使用"
            );

            return;
        }

        alert(
            title +
            "\n\n" +
            detail +
            "\n\n此入口已建立，下一階段會接上完整功能。"
        );
    }

    function watchDashboard(){

        if(
            !window.MonsterCloud ||
            !window.MonsterCloud.database
        ){
            return;
        }

        var root =
        config.firebaseRoot ||
        "monsterTicket/v1";

        window.MonsterCloud.database
        .ref(root + "/dashboard/current")
        .on(
            "value",
            function(snapshot){

                dashboardCurrent =
                snapshot.val();

                renderDashboard();
            },
            function(error){

                console.error(
                    "[Staff] dashboard error:",
                    error
                );
            }
        );
    }

    function startFirebase(){

        if(
            !window.firebase ||
            !window.MONSTER_FIREBASE_CONFIG
        ){

            setCloudState(
                "error",
                "雲端載入失敗"
            );

            return;
        }

        try{

            if(!firebase.apps.length){

                firebase.initializeApp(
                    window.MONSTER_FIREBASE_CONFIG
                );
            }

            window.MonsterCloud =
            window.MonsterCloud || {};

            window.MonsterCloud.database =
            firebase.database();

            firebase.auth()
            .signInAnonymously()
            .then(function(result){

                firebaseReady = true;

                window.MonsterCloud.uid =
                result.user
                ? result.user.uid
                : "";

                setCloudState(
                    "online",
                    "雲端已連線"
                );

                watchDashboard();
            })
            .catch(function(error){

                console.error(
                    "[Staff] Firebase auth error:",
                    error
                );

                setCloudState(
                    "error",
                    "雲端登入失敗"
                );
            });

            firebase.database()
            .ref(".info/connected")
            .on("value",function(snapshot){

                if(snapshot.val() === true){

                    setCloudState(
                        "online",
                        "雲端已連線"
                    );

                }else if(
                    navigator.onLine === false
                ){

                    setCloudState(
                        "offline",
                        "目前離線"
                    );

                }else{

                    setCloudState(
                        "connecting",
                        "雲端連線中"
                    );
                }
            });

        }catch(error){

            console.error(error);

            setCloudState(
                "error",
                "雲端啟動失敗"
            );
        }
    }

    function bindEvents(){

        byId("staffLoginButton")
        .addEventListener(
            "click",
            login
        );

        byId("staffLogoutButton")
        .addEventListener(
            "click",
            logout
        );

        passwordInput
        .addEventListener(
            "keydown",
            function(event){

                if(
                    event.key === "Enter" ||
                    event.keyCode === 13
                ){
                    login();
                }
            }
        );

        var buttons =
        document.querySelectorAll(
            "[data-feature]"
        );

        var i;

        for(i=0;i<buttons.length;i++){

            buttons[i]
            .addEventListener(
                "click",
                function(){

                    openFeature(
                        this.getAttribute(
                            "data-title"
                        ) || "功能",

                        this.getAttribute(
                            "data-detail"
                        ) || "",

                        this.getAttribute(
                            "data-admin-only"
                        ) === "true"
                    );
                }
            );
        }
    }

    function init(){

        loginPage =
        byId("staffLoginPage");

        homePage =
        byId("staffHomePage");

        passwordInput =
        byId("staffPassword");

        loginMessage =
        byId("staffLoginMessage");

        roleBadge =
        byId("staffRoleBadge");

        cloudBadge =
        byId("staffCloudBadge");

        bindEvents();
        startFirebase();

        var savedRole =
        loadSession();

        if(savedRole){

            currentRole = savedRole;
            showHome();

        }else{

            showLogin();
        }
    }

    window.addEventListener(
        "load",
        init
    );

})();
