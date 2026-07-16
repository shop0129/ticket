// =========================================
// 小怪獸售票機 V7 Phase 3B
// Staff 會員中心＋玩具點數
// =========================================

(function(){

    "use strict";

    var config =
    window.MONSTER_STAFF_CONFIG || {};

    var currentRole = "";
    var dashboardCurrent = null;
    var membersMap = {};
    var selectedMemberId = "";
    var toyPointMode = "add";
    var cloudWatchStarted = false;

    var loginPage;
    var homePage;
    var accountInput;
    var passwordInput;
    var loginMessage;
    var roleBadge;
    var cloudBadge;

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

    function normalizePhone(value){

        return String(value || "")
        .replace(/\D/g,"");
    }

    function createMemberNo(){

        var now = new Date();

        function pad(value){
            return Number(value) < 10
            ? "0" + value
            : String(value);
        }

        return (
            "M" +
            now.getFullYear() +
            pad(now.getMonth() + 1) +
            pad(now.getDate()) +
            String(Date.now()).slice(-5)
        );
    }

    function getMemberLevel(member){

        var spend =
        Number(member.totalSpend || 0);

        if(spend >= 30000){
            return "VIP會員";
        }

        if(spend >= 15000){
            return "金卡會員";
        }

        if(spend >= 5000){
            return "銀卡會員";
        }

        return "一般會員";
    }

    function setCloudState(type,text){

        cloudBadge.className =
        "staff-cloud-badge staff-cloud-" + type;

        cloudBadge.innerHTML =
        '<span class="staff-cloud-dot"></span>' +
        '<span>' + escapeText(text) + '</span>';
    }

    function showLoginMessage(text,isError){

        loginMessage.textContent =
        text || "";

        loginMessage.className =
        isError
        ? "staff-login-message error"
        : "staff-login-message";
    }

    function currentActor(){
        if(window.MonsterAuth && MonsterAuth.getActor){
            return MonsterAuth.getActor("staff");
        }
        return {
            id:"",
            account:"",
            name:currentRole === "admin" ? "店長" : "員工",
            role:currentRole || "staff",
            source:"staff"
        };
    }

    function operatorName(){
        return currentActor().name;
    }

    function saveSession(role){

        var actor = currentActor();

        sessionStorage.setItem(
            config.sessionKey ||
            "monsterStaffSession",
            JSON.stringify({
                role:role,
                userId:actor.id || "",
                account:actor.account || "",
                name:actor.name || "",
                loginAt:Date.now()
            })
        );
    }

    function loadSession(){

        try{

            if(
                window.MonsterAuth &&
                MonsterAuth.restoreSession &&
                MonsterAuth.restoreSession()
            ){
                return MonsterAuth.getCurrentRole();
            }

            var data =
            JSON.parse(
                sessionStorage.getItem(
                    config.sessionKey ||
                    "monsterStaffSession"
                ) || "null"
            );

            return data &&
            (
                data.role === "staff" ||
                data.role === "admin"
            )
            ? data.role
            : "";

        }catch(error){

            return "";
        }
    }

    function applyRoleVisibility(){

        var adminElements =
        document.querySelectorAll(".admin-only");

        var i;

        for(i=0;i<adminElements.length;i++){

            adminElements[i].style.display =
            currentRole === "admin"
            ? ""
            : "none";
        }

        roleBadge.className =
        "staff-role-badge role-" +
        currentRole;

        roleBadge.textContent =
        (currentRole === "admin" ? "👑 " : "👤 ") +
        operatorName() +
        "｜" +
        (currentRole === "admin" ? "店長" : "員工");

        byId("staffHomeSubtitle").textContent =
        currentRole === "admin"
        ? "完整管理權限"
        : "日常店務操作";
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

        passwordInput.value = "";
        if(accountInput){
            accountInput.focus();
        }

        showLoginMessage("",false);
    }

    function login(){

        var account =
        accountInput.value.trim();

        var password =
        passwordInput.value;

        if(!account){
            showLoginMessage("請輸入員工帳號",true);
            accountInput.focus();
            return;
        }

        if(!window.MonsterAuth || !MonsterAuth.loginAsync){
            showLoginMessage("登入模組尚未載入",true);
            return;
        }

        byId("staffLoginButton").disabled = true;
        byId("staffLoginButton").textContent = "登入中…";

        MonsterAuth.loginAsync(account,password)
        .then(function(success){
            if(!success){
                throw {message:"帳號、密碼錯誤或帳號已停用"};
            }
            currentRole = MonsterAuth.getCurrentRole();
            saveSession(currentRole);
            showHome();
        })
        .catch(function(error){
            showLoginMessage(
                error && error.message ? error.message : "帳號、密碼錯誤或帳號已停用",
                true
            );
            passwordInput.select();
        })
        .then(function(){
            byId("staffLoginButton").disabled = false;
            byId("staffLoginButton").textContent = "登入";
        });
    }

    function logout(){

        if(window.MonsterAuth){
            MonsterAuth.logout();
        }

        sessionStorage.removeItem(
            config.sessionKey ||
            "monsterStaffSession"
        );

        closeMemberDetail();
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

        byId("staffDashboardDate").textContent =
        date + " 雲端即時概況";

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

    function memberArray(){

        var list = [];

        Object.keys(membersMap || {})
        .forEach(function(id){

            var member =
            membersMap[id];

            if(
                !member ||
                member.deleted
            ){
                return;
            }

            if(!member.id){
                member.id = id;
            }

            list.push(member);
        });

        return list;
    }

    function searchMembers(){

        var keyword =
        byId("staffMemberSearchInput")
        .value
        .trim()
        .toLowerCase();

        if(!keyword){

            byId("staffMemberSearchStatus")
            .textContent =
            "請輸入會員姓名、手機或會員編號";

            byId("staffMemberSearchResults")
            .innerHTML = "";

            return;
        }

        var results =
        memberArray()
        .filter(function(member){

            return [
                member.name,
                member.phone,
                member.memberNo
            ]
            .join(" ")
            .toLowerCase()
            .indexOf(keyword) !== -1;
        })
        .slice(0,30);

        renderSearchResults(results);
    }

    function renderSearchResults(results){

        var box =
        byId("staffMemberSearchResults");

        if(results.length === 0){

            byId("staffMemberSearchStatus")
            .textContent =
            "找不到符合條件的會員";

            box.innerHTML = `

<div class="staff-empty-card">
    找不到會員，可使用「快速新增」
</div>

`;
            return;
        }

        byId("staffMemberSearchStatus")
        .textContent =
        "找到 " + results.length + " 位會員";

        var html = "";

        results.forEach(function(member){

            html += `

<button
    type="button"
    class="staff-member-result"
    data-member-id="${escapeText(member.id)}">

    <div>

        <div class="staff-member-result-name">
            ${escapeText(member.name)}
        </div>

        <div class="staff-member-result-meta">
            ${escapeText(member.phone || "")}
            ・${escapeText(member.memberNo || "")}
        </div>

    </div>

    <div class="staff-member-result-points">

        <strong>
            🎁 ${Number(member.toyPoints || 0)} 點
        </strong>

        <span>
            ${getMemberLevel(member)}
        </span>

    </div>

</button>

`;
        });

        box.innerHTML = html;

        var buttons =
        box.querySelectorAll(
            "[data-member-id]"
        );

        var i;

        for(i=0;i<buttons.length;i++){

            buttons[i].addEventListener(
                "click",
                function(){

                    openMemberDetail(
                        this.getAttribute(
                            "data-member-id"
                        )
                    );
                }
            );
        }
    }

    function selectedMember(){

        return membersMap[
            selectedMemberId
        ] || null;
    }

    function openMemberDetail(memberId){

        selectedMemberId = memberId;

        renderMemberDetail();

        byId("staffMemberDetailSection")
        .style.display = "block";

        byId("staffMemberDetailSection")
        .scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
    }

    function closeMemberDetail(){

        selectedMemberId = "";

        byId("staffMemberDetailSection")
        .style.display = "none";

        byId("staffMemberDetailContent")
        .innerHTML = "";
    }

    function renderMemberDetail(){

        var member =
        selectedMember();

        if(!member){
            closeMemberDetail();
            return;
        }

        byId("staffMemberDetailSubtitle")
        .textContent =
        member.memberNo || "";

        var history =
        Array.isArray(member.toyPointHistory)
        ? member.toyPointHistory.slice(0,20)
        : [];

        var historyHtml = "";

        if(history.length === 0){

            historyHtml = `

<div class="staff-empty-card">
    尚無玩具點數紀錄
</div>

`;

        }else{

            history.forEach(function(row){

                var amount =
                Number(row.amount || 0);

                historyHtml += `

<div class="staff-point-history-row">

    <div>

        <strong>
            ${escapeText(row.reason || "點數調整")}
        </strong>

        <span>
            ${escapeText(row.date || "")}
            ${row.operator ? "・" + escapeText(row.operator) : ""}
        </span>

        ${
            row.note
            ? "<small>" + escapeText(row.note) + "</small>"
            : ""
        }

    </div>

    <div class="${amount >= 0 ? "point-plus" : "point-minus"}">

        ${amount >= 0 ? "+" : ""}${amount} 點

        <small>
            餘額 ${Number(row.balance || 0)}
        </small>

    </div>

</div>

`;
            });
        }

        var adminButtons =
        currentRole === "admin"
        ? `

<button
    id="staffEditMemberButton"
    class="staff-primary-button">
    編輯會員
</button>

<button
    id="staffDeleteMemberButton"
    class="staff-danger-button">
    刪除會員
</button>

`
        : "";

        byId("staffMemberDetailContent")
        .innerHTML = `

<div class="staff-member-profile">

    <div class="staff-member-profile-head">

        <div>

            <div class="staff-member-profile-name">
                ${escapeText(member.name)}
            </div>

            <div class="staff-member-profile-phone">
                📱 ${escapeText(member.phone || "")}
            </div>

        </div>

        <div class="staff-level-badge">
            ${getMemberLevel(member)}
        </div>

    </div>

    <div class="staff-profile-grid">

        <div>
            <span>累積消費</span>
            <strong>NT$${formatMoney(member.totalSpend)}</strong>
        </div>

        <div>
            <span>消費點數</span>
            <strong>${Number(member.points || 0)} 點</strong>
        </div>

        <div class="toy-highlight">
            <span>玩具點數</span>
            <strong>${Number(member.toyPoints || 0)} 點</strong>
        </div>

        <div>
            <span>生日</span>
            <strong>${escapeText(member.birthday || "未填寫")}</strong>
        </div>

        <div>
            <span>加入日期</span>
            <strong>${escapeText(member.joinDate || "")}</strong>
        </div>

        <div>
            <span>備註</span>
            <strong>${escapeText(member.note || "無")}</strong>
        </div>

    </div>

    <div class="staff-profile-actions">

        <button
            id="staffOpenToyPointButton"
            class="staff-success-button">
            🎁 玩具點數操作
        </button>

        ${adminButtons}

    </div>

</div>

<div class="staff-point-history-card">

    <div class="staff-subsection-title">
        🎁 玩具點數紀錄
    </div>

    ${historyHtml}

</div>

`;

        byId("staffOpenToyPointButton")
        .addEventListener(
            "click",
            openToyPointModal
        );

        if(currentRole === "admin"){

            byId("staffEditMemberButton")
            .addEventListener(
                "click",
                function(){
                    openMemberModal(member);
                }
            );

            byId("staffDeleteMemberButton")
            .addEventListener(
                "click",
                deleteSelectedMember
            );
        }
    }

    function openMemberModal(member){

        var isEdit =
        Boolean(member && member.id);

        byId("staffMemberModalTitle")
        .textContent =
        isEdit
        ? "編輯會員"
        : "快速新增會員";

        byId("staffEditMemberId").value =
        isEdit ? member.id : "";

        byId("staffEditMemberName").value =
        isEdit ? member.name || "" : "";

        byId("staffEditMemberPhone").value =
        isEdit ? member.phone || "" : "";

        byId("staffEditMemberBirthday").value =
        isEdit ? member.birthday || "" : "";

        byId("staffEditMemberNote").value =
        isEdit ? member.note || "" : "";

        byId("staffMemberModal")
        .style.display = "flex";
    }

    function closeMemberModal(){

        byId("staffMemberModal")
        .style.display = "none";
    }

    function saveMember(){

        var id =
        byId("staffEditMemberId")
        .value;

        var isNew = !id;

        var name =
        byId("staffEditMemberName")
        .value.trim();

        var phone =
        normalizePhone(
            byId("staffEditMemberPhone")
            .value
        );

        if(!name || !phone){

            alert(
                "姓名與手機不可空白"
            );

            return;
        }

        var duplicate = false;

        memberArray().forEach(function(member){

            if(
                member.phone === phone &&
                member.id !== id
            ){
                duplicate = true;
            }
        });

        if(duplicate){

            alert(
                "此手機已經是會員"
            );

            return;
        }

        var now =
        Date.now();

        var roleName = operatorName();

        var data;

        if(id){

            data =
            membersMap[id];

            if(!data){
                return;
            }

            data.name = name;
            data.phone = phone;
            data.birthday =
            byId("staffEditMemberBirthday")
            .value;

            data.note =
            byId("staffEditMemberNote")
            .value.trim();

            data.updatedAt = now;
            data.updatedBy = roleName;

        }else{

            id =
            "member_" + now;

            data = {
                id:id,
                memberNo:createMemberNo(),
                name:name,
                phone:phone,
                birthday:
                byId("staffEditMemberBirthday")
                .value,
                note:
                byId("staffEditMemberNote")
                .value.trim(),
                joinDate:
                new Date()
                .toLocaleDateString("zh-TW"),
                totalSpend:0,
                points:0,
                toyPoints:0,
                pointHistory:[],
                toyPointHistory:[],
                lastPurchaseDate:"",
                createdAt:now,
                updatedAt:now,
                updatedBy:roleName,
                deleted:false
            };
        }

        firebase.database()
        .ref(
            (config.firebaseRoot ||
            "monsterTicket/v1") +
            "/members/" + id
        )
        .set(data)
        .then(function(){

            if(window.MonsterAuth){
                MonsterAuth.audit(
                    isNew ? "member.create" : "member.update",
                    "會員：" + data.name,
                    {source:"staff",targetType:"member",targetId:id}
                );
            }

            closeMemberModal();

            alert(
                id === selectedMemberId
                ? "會員資料已更新"
                : "會員已建立"
            );

            byId("staffMemberSearchInput")
            .value = phone;

            searchMembers();
            openMemberDetail(id);
        })
        .catch(function(error){

            console.error(error);

            alert(
                "會員儲存失敗，請檢查網路"
            );
        });
    }

    function deleteSelectedMember(){

        if(
            window.MonsterPermission &&
            !MonsterPermission.requirePermission(
                "member.delete",
                "❌ 只有店長可以刪除會員"
            )
        ){
            return;
        }

        var member =
        selectedMember();

        if(
            !member ||
            currentRole !== "admin"
        ){
            return;
        }

        if(
            !confirm(
                "確定刪除會員「" +
                member.name +
                "」？"
            )
        ){
            return;
        }

        var update = {
            deleted:true,
            updatedAt:Date.now(),
            updatedBy:operatorName()
        };

        firebase.database()
        .ref(
            (config.firebaseRoot ||
            "monsterTicket/v1") +
            "/members/" + member.id
        )
        .update(update)
        .then(function(){

            if(window.MonsterAuth){
                MonsterAuth.audit(
                    "member.delete",
                    "刪除會員：" + member.name,
                    {source:"staff",targetType:"member",targetId:member.id}
                );
            }

            closeMemberDetail();
            searchMembers();

            alert(
                "會員已刪除"
            );
        });
    }

    function setToyPointMode(mode){

        toyPointMode = mode;

        byId("staffToyAddMode")
        .className =
        mode === "add"
        ? "active"
        : "";

        byId("staffToyDeductMode")
        .className =
        mode === "deduct"
        ? "active"
        : "";

        byId("staffToyPointSave")
        .textContent =
        mode === "add"
        ? "確認增加點數"
        : "確認扣除點數";

        byId("staffToyPointSave")
        .className =
        mode === "add"
        ? "staff-success-button"
        : "staff-danger-button";
    }

    function openToyPointModal(){

        var member =
        selectedMember();

        if(!member){
            return;
        }

        setToyPointMode("add");

        byId("staffToyPointMember")
        .textContent =
        member.name +
        "・" +
        (member.phone || "");

        byId("staffToyPointBalance")
        .textContent =
        Number(member.toyPoints || 0) +
        " 點";

        byId("staffToyPointAmount")
        .value = "1";

        byId("staffToyPointReason")
        .value = "";

        byId("staffToyPointNote")
        .value = "";

        byId("staffToyPointModal")
        .style.display = "flex";
    }

    function closeToyPointModal(){

        byId("staffToyPointModal")
        .style.display = "none";
    }

    function saveToyPointOperation(){

        var member =
        selectedMember();

        if(!member){
            return;
        }

        var amount =
        Number(
            byId("staffToyPointAmount")
            .value
        );

        var reason =
        byId("staffToyPointReason")
        .value.trim();

        var note =
        byId("staffToyPointNote")
        .value.trim();

        if(
            !Number.isInteger(amount) ||
            amount <= 0
        ){

            alert(
                "請輸入正確的整數點數"
            );

            return;
        }

        if(!reason){

            alert(
                "必須填寫原因"
            );

            return;
        }

        var current =
        Number(member.toyPoints || 0);

        var change =
        toyPointMode === "add"
        ? amount
        : -amount;

        var balance =
        current + change;

        if(balance < 0){

            alert(
                "玩具點數不足"
            );

            return;
        }

        if(
            !confirm(
                member.name +
                "\n目前：" +
                current +
                " 點\n本次：" +
                (change > 0 ? "+" : "") +
                change +
                " 點\n操作後：" +
                balance +
                " 點\n\n確定執行？"
            )
        ){
            return;
        }

        var history =
        Array.isArray(member.toyPointHistory)
        ? member.toyPointHistory.slice(0)
        : [];

        history.unshift({
            id:"toy_" + Date.now(),
            date:
            new Date()
            .toLocaleString("zh-TW"),
            amount:change,
            reason:reason,
            note:note,
            orderNo:"",
            operator:operatorName(),
            balance:balance
        });

        var updates = {
            toyPoints:balance,
            toyPointHistory:history,
            updatedAt:Date.now(),
            updatedBy:operatorName()
        };

        firebase.database()
        .ref(
            (config.firebaseRoot ||
            "monsterTicket/v1") +
            "/members/" +
            member.id
        )
        .update(updates)
        .then(function(){

            if(window.MonsterAuth){
                MonsterAuth.audit(
                    "member.toy_points",
                    member.name + "：" + (change > 0 ? "+" : "") + change + " 點",
                    {source:"staff",targetType:"member",targetId:member.id}
                );
            }

            closeToyPointModal();

            alert(
                "玩具點數已更新"
            );
        })
        .catch(function(error){

            console.error(error);

            alert(
                "點數更新失敗，請檢查網路"
            );
        });
    }

    function watchCloudData(){

        var root =
        config.firebaseRoot ||
        "monsterTicket/v1";

        firebase.database()
        .ref(root + "/dashboard/current")
        .on("value",function(snapshot){

            dashboardCurrent =
            snapshot.val();

            renderDashboard();
        });

        firebase.database()
        .ref(root + "/members")
        .on("value",function(snapshot){

            membersMap =
            snapshot.val() || {};

            if(selectedMemberId){

                if(
                    membersMap[selectedMemberId] &&
                    !membersMap[selectedMemberId].deleted
                ){
                    renderMemberDetail();
                }else{
                    closeMemberDetail();
                }
            }

            var keyword =
            byId("staffMemberSearchInput")
            .value.trim();

            if(keyword){
                searchMembers();
            }
        });
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

            firebase.auth().onAuthStateChanged(function(user){
                if(!user){
                    firebase.auth().signInAnonymously().catch(function(error){
                        console.error(error);
                        setCloudState("error","雲端登入失敗");
                    });
                    return;
                }

                setCloudState("online","雲端已連線");

                if(!cloudWatchStarted){
                    cloudWatchStarted = true;
                    watchCloudData();
                }
            },function(error){
                console.error(error);
                setCloudState("error","雲端登入失敗");
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
        .addEventListener("click",login);

        byId("staffLogoutButton")
        .addEventListener("click",logout);

        accountInput
        .addEventListener(
            "keydown",
            function(event){
                if(event.key === "Enter" || event.keyCode === 13){
                    passwordInput.focus();
                }
            }
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

        byId("staffMemberSearchButton")
        .addEventListener(
            "click",
            searchMembers
        );

        byId("staffMemberSearchInput")
        .addEventListener(
            "input",
            searchMembers
        );

        byId("staffQuickAddButton")
        .addEventListener(
            "click",
            function(){
                openMemberModal(null);
            }
        );

        byId("staffCloseDetailButton")
        .addEventListener(
            "click",
            closeMemberDetail
        );

        byId("staffMemberModalClose")
        .addEventListener(
            "click",
            closeMemberModal
        );

        byId("staffMemberModalCancel")
        .addEventListener(
            "click",
            closeMemberModal
        );

        byId("staffMemberModalSave")
        .addEventListener(
            "click",
            saveMember
        );

        byId("staffToyPointModalClose")
        .addEventListener(
            "click",
            closeToyPointModal
        );

        byId("staffToyPointCancel")
        .addEventListener(
            "click",
            closeToyPointModal
        );

        byId("staffToyPointSave")
        .addEventListener(
            "click",
            saveToyPointOperation
        );

        byId("staffToyAddMode")
        .addEventListener(
            "click",
            function(){
                setToyPointMode("add");
            }
        );

        byId("staffToyDeductMode")
        .addEventListener(
            "click",
            function(){
                setToyPointMode("deduct");
            }
        );

        var quickPointButtons =
        document.querySelectorAll(
            "[data-points]"
        );

        var i;

        for(i=0;i<quickPointButtons.length;i++){

            quickPointButtons[i]
            .addEventListener(
                "click",
                function(){

                    byId("staffToyPointAmount")
                    .value =
                    this.getAttribute(
                        "data-points"
                    );
                }
            );
        }

        var placeholders =
        document.querySelectorAll(
            "[data-placeholder]"
        );

        for(i=0;i<placeholders.length;i++){

            placeholders[i]
            .addEventListener(
                "click",
                function(){

                    alert(
                        this.getAttribute(
                            "data-placeholder"
                        ) +
                        "\n\n此功能會在下一階段接入。"
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

        accountInput =
        byId("staffAccount");

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

        showLogin();

        if(window.MonsterAuth && MonsterAuth.restoreSessionAsync){
            MonsterAuth.restoreSessionAsync().then(function(restored){
                var savedRole = restored ? MonsterAuth.getCurrentRole() : loadSession();
                if(savedRole){
                    currentRole = savedRole;
                    saveSession(currentRole);
                    showHome();
                }
            });
        }else{
            var savedRole = loadSession();
            if(savedRole){
                currentRole = savedRole;
                showHome();
            }
        }
    }

    window.addEventListener(
        "load",
        init
    );

})();
