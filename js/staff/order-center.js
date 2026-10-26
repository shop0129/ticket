// =========================================
// 小怪獸售票機 V7.3 Phase 3F Part 1 Fix 1
// Staff 訂單中心＋入離場＋容量候位
// =========================================
(function(){

    "use strict";

    var config =
    window.MONSTER_STAFF_CONFIG || {};

    var ROOT =
    config.firebaseRoot ||
    "monsterTicket/v1";

    var ordersMap = {};
    var venueSettings = {
        maxPlayers:
        Number(config.defaultMaxPlayers || 40),
        countGuardians:
        Boolean(config.countGuardians)
    };

    var selectedOrderId = "";
    var currentRole = "";
    var started = false;
    var bound = false;
    var authWatchStarted = false;
    var ordersRootRef = null;
    var ordersRef = null;
    var settingsRef = null;
    var lastOrderUpdateAt = 0;
    var syncedTaipeiDay = "";
    var dayChangeTimer = null;

    function byId(id){
        return document.getElementById(id);
    }

    function esc(value){

        return String(value || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
    }

    function money(value){
        return Number(value || 0)
        .toLocaleString("zh-TW");
    }

    function pad(value){
        return Number(value) < 10
        ? "0" + value
        : String(value);
    }

    function taipeiDayKey(value){

        var date =
        new Date(
            Number(value || Date.now()) +
            8 * 60 * 60 * 1000
        );

        return (
            date.getUTCFullYear() +
            "-" +
            pad(date.getUTCMonth() + 1) +
            "-" +
            pad(date.getUTCDate())
        );
    }

    function taipeiDayStart(value){

        var date =
        new Date(
            Number(value || Date.now()) +
            8 * 60 * 60 * 1000
        );

        return (
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate()
            ) -
            8 * 60 * 60 * 1000
        );
    }

    function timeText(value){

        if(!value){
            return "--:--";
        }

        var date =
        typeof value === "number"
        ? new Date(value)
        : new Date(value);

        if(isNaN(date.getTime())){
            return String(value);
        }

        return (
            pad(date.getHours()) +
            ":" +
            pad(date.getMinutes())
        );
    }

    function orderTail(order){

        var text =
        String(order.orderNo || "");

        return text.slice(-4) || "----";
    }

    function getRole(){

        if(window.MonsterAuth){
            return MonsterAuth.getCurrentRole();
        }

        try{

            var session =
            JSON.parse(
                sessionStorage.getItem(
                    config.sessionKey ||
                    "monsterStaffSession"
                ) || "null"
            );

            return session
            ? session.role || ""
            : "";

        }catch(error){
            return "";
        }
    }

    function currentActor(){
        if(window.MonsterAuth){
            return MonsterAuth.getActor("staff");
        }
        return {
            id:"",
            name:getRole() === "admin" ? "店長" : "員工",
            role:getRole() || "staff"
        };
    }

    function operatorName(){
        return currentActor().name;
    }

    function updateLiveStatus(text,isError){

        var status =
        byId("staffOrderLiveStatus");

        if(!status){
            return;
        }

        status.className =
        "staff-order-live-status " +
        (isError ? "is-error" : "is-online");

        status.textContent = text || "";
    }

    function isCancelledForSummary(order){

        var status =
        String(
            order &&
            (order.status || order.orderStatus) ||
            ""
        ).toLowerCase();

        return (
            status === "cancel" ||
            status === "cancelled" ||
            (order && order.cancelled === true) ||
            (order && order.voided === true)
        );
    }

    function orderAmountForSummary(order){

        if(!order){
            return 0;
        }

        return Number(
            order.paidAmount != null
            ? order.paidAmount
            : (
                order.amount ||
                order.total ||
                order.totalAmount ||
                0
            )
        ) || 0;
    }

    function itemTicketCount(item){

        if(item && item.reportTicketCount != null){
            return Math.max(
                0,
                Number(item.reportTicketCount) || 0
            );
        }

        return Math.max(
            1,
            Number(
                item &&
                (item.qty || item.quantity) ||
                1
            ) || 1
        );
    }

    function calculateTodaySalesSummary(){

        var summary = {
            income:0,
            normalOrders:0,
            cancelledOrders:0,
            ticketCount:0,
            memberOrders:0
        };

        Object.keys(ordersMap || {})
        .forEach(function(id){

            var order = ordersMap[id];

            if(
                !order ||
                order.deleted ||
                order.excludeFromSalesReport === true ||
                order.prepaidRedemption === true
            ){
                return;
            }

            if(isCancelledForSummary(order)){
                summary.cancelledOrders++;
                return;
            }

            summary.income +=
            orderAmountForSummary(order);

            summary.normalOrders++;

            if(order.memberId){
                summary.memberOrders++;
            }

            if(Array.isArray(order.items)){
                summary.ticketCount +=
                order.items.reduce(function(total,item){
                    return total + itemTicketCount(item);
                },0);
            }else{
                summary.ticketCount +=
                Math.max(
                    0,
                    Number(
                        order.ticketCount ||
                        order.people ||
                        1
                    ) || 0
                );
            }
        });

        return summary;
    }

    function publishTodaySalesSummary(){

        var detail = {
            dateKey:taipeiDayKey(),
            summary:calculateTodaySalesSummary(),
            updatedAt:Date.now()
        };

        try{
            window.dispatchEvent(
                new CustomEvent(
                    "monster:today-orders-summary",
                    {detail:detail}
                )
            );
        }catch(error){

            var event =
            document.createEvent("CustomEvent");

            event.initCustomEvent(
                "monster:today-orders-summary",
                false,
                false,
                detail
            );

            window.dispatchEvent(event);
        }
    }

    function applyOrdersSnapshot(snapshot){

        ordersMap =
        snapshot.val() || {};

        lastOrderUpdateAt = Date.now();

        renderOrderList();
        updateCapacityCards();

        if(selectedOrderId){
            renderOrderDetail();
        }

        publishTodaySalesSummary();

        updateLiveStatus(
            "● 即時同步 " +
            new Date(lastOrderUpdateAt)
            .toLocaleTimeString("zh-TW") +
            "｜今日 " +
            Object.keys(ordersMap).length +
            " 筆訂單",
            false
        );
    }

    function attachTodayOrders(){

        if(!ordersRootRef){
            return;
        }

        var today = taipeiDayKey();

        if(ordersRef && syncedTaipeiDay === today){
            return;
        }

        if(ordersRef){
            ordersRef.off(
                "value",
                applyOrdersSnapshot
            );
        }

        syncedTaipeiDay = today;
        ordersMap = {};

        ordersRef =
        ordersRootRef
        .orderByChild("createdAt")
        .startAt(taipeiDayStart());

        updateLiveStatus(
            "● 正在同步今日訂單…",
            false
        );

        ordersRef.on(
            "value",
            applyOrdersSnapshot,
            handleOrderReadError
        );
    }

    // Firebase transaction 完成後先把最新單筆訂單套用到手機畫面，
    // 不必等待整個 orders 節點的下一次 value 快照。
    function applyOrderUpdate(orderId,latestOrder){

        if(!orderId || !latestOrder){
            return;
        }

        ordersMap[orderId] = latestOrder;
        lastOrderUpdateAt = Date.now();

        renderOrderList();
        updateCapacityCards();

        if(selectedOrderId === orderId){
            renderOrderDetail();
        }

        publishTodaySalesSummary();

        updateLiveStatus(
            "● 入場狀態已立即更新｜" +
            new Date(lastOrderUpdateAt)
            .toLocaleTimeString("zh-TW"),
            false
        );
    }

    function handleOrderReadError(error){

        console.error(
            "[MonsterOrderCenter] orders read error:",
            error
        );

        updateLiveStatus(
            "● 訂單同步失敗，請確認網路後按重新整理",
            true
        );
    }

    function getOrderStatus(order){

        if(window.MonsterTicketStatusEngine){
            return MonsterTicketStatusEngine.getOrderStatus(order);
        }

        return (order && (order.playStatus || order.validationStatus)) || "waiting";
    }

    function statusLabel(order){

        var status =
        getOrderStatus(order);

        if(status === "playing"){
            return "遊玩中";
        }

        if(status === "finished"){
            return "已離場";
        }

        if(status === "cancelled"){
            return "已作廢";
        }

        return "等待入場";
    }

    function listOrders(){

        var list = [];

        Object.keys(ordersMap || {})
        .forEach(function(id){

            var order =
            ordersMap[id];

            if(
                !order ||
                order.deleted ||
                order.admissionRequired === false ||
                getOrderStatus(order) === "not_required"
            ){
                return;
            }

            order.__id = id;
            list.push(order);
        });

        list.sort(function(a,b){

            return Number(
                b.createdAt ||
                b.updatedAt ||
                b.waitingSince ||
                0
            ) -
            Number(
                a.createdAt ||
                a.updatedAt ||
                a.waitingSince ||
                0
            );
        });

        return list;
    }

    function orderCapacityCount(order){

        if(
            !order ||
            order.deleted ||
            getOrderStatus(order) !== "playing"
        ){
            return 0;
        }

        return (
            Number(order.playerCount || 0) +
            (
                venueSettings.countGuardians
                ? Number(order.guardianCount || 0)
                : 0
            )
        );
    }

    function calculateCurrentPlayers(orderMap){

        var map =
        orderMap || ordersMap || {};

        var total = 0;

        Object.keys(map)
        .forEach(function(id){

            total +=
            orderCapacityCount(map[id]);
        });

        return total;
    }

    function updateCapacityCards(){

        var max =
        Number(
            venueSettings.maxPlayers ||
            config.defaultMaxPlayers ||
            40
        );

        var current =
        calculateCurrentPlayers();

        var waiting =
        listOrders().filter(function(order){
            return (
                getOrderStatus(order)
            ) === "waiting";
        }).length;

        var playing =
        listOrders().filter(function(order){
            return getOrderStatus(order) === "playing";
        }).length;

        var values = {
            staffVenueCurrent:
            current + " / " + max,

            staffVenueRemaining:
            Math.max(0,max-current) + " 人",

            staffVenueWaiting:
            waiting + " 組",

            staffVenuePlaying:
            playing + " 組"
        };

        Object.keys(values)
        .forEach(function(id){

            if(byId(id)){
                byId(id).textContent =
                values[id];
            }
        });

        if(byId("staffMaxPlayersInput")){
            byId("staffMaxPlayersInput")
            .value = max;
        }

        if(byId("staffCountGuardiansInput")){
            byId("staffCountGuardiansInput")
            .checked =
            Boolean(
                venueSettings.countGuardians
            );
        }
    }

    function renderOrderList(){

        var keyword =
        (
            byId("staffOrderSearchInput")
            ? byId("staffOrderSearchInput").value
            : ""
        )
        .trim()
        .toLowerCase();

        var filter =
        byId("staffOrderStatusFilter")
        ? byId("staffOrderStatusFilter").value
        : "active";

        var rows =
        listOrders().filter(function(order){

            var status =
            getOrderStatus(order);

            if(
                filter === "active" &&
                (
                    status === "finished" ||
                    status === "cancelled"
                )
            ){
                return false;
            }

            if(
                filter !== "all" &&
                filter !== "active" &&
                status !== filter
            ){
                return false;
            }

            if(!keyword){
                return true;
            }

            return [
                order.queueNumber,
                order.orderNo,
                order.memberName,
                order.memberPhone,
                order.date,
                order.time
            ]
            .join(" ")
            .toLowerCase()
            .indexOf(keyword) !== -1;
        });

        var box =
        byId("staffOrderResults");

        if(!box){
            return;
        }

        if(rows.length === 0){

            box.innerHTML = `

<div class="staff-empty-card">
    找不到符合條件的訂單
</div>

`;
            return;
        }

        box.innerHTML =
        rows.map(function(order){

            var status =
            getOrderStatus(order);

            var itemTitles =
            (
                Array.isArray(order.items)
                ? order.items
                : []
            ).map(function(item){
                return item.title || "票券";
            }).join("、");

            return `

<button
    type="button"
    class="staff-order-card status-${esc(status)}"
    data-order-id="${esc(order.__id)}">

    <div class="staff-order-main">

        <div class="staff-order-number">
            ${esc(order.queueNumber || "排號中")}
            <span>尾號 ${esc(orderTail(order))}</span>
        </div>

        <div class="staff-order-items">
            ${esc(itemTitles)}
        </div>

        <div class="staff-order-meta">
            ${esc(order.date || "")}
            ${esc(order.time || "")}
            ・${Number(order.playerCount || 1)} 位
        </div>

    </div>

    <div class="staff-order-right">

        <strong>
            NT$${money(order.paidAmount != null ? order.paidAmount : order.amount)}
        </strong>

        <span class="staff-order-status">
            ${statusLabel(order)}
        </span>

    </div>

</button>

`;
        }).join("");

        var buttons =
        box.querySelectorAll(
            "[data-order-id]"
        );

        var i;

        for(i=0;i<buttons.length;i++){

            buttons[i].addEventListener(
                "click",
                function(){

                    openOrderDetail(
                        this.getAttribute(
                            "data-order-id"
                        )
                    );
                }
            );
        }
    }

    function selectedOrder(){
        return ordersMap[selectedOrderId] || null;
    }

    function renderOrderDetail(){

        var order =
        selectedOrder();

        if(!order){
            closeOrderDetail();
            return;
        }

        var status =
        getOrderStatus(order);

        var itemHtml =
        (
            Array.isArray(order.items)
            ? order.items
            : []
        ).map(function(item){

            return `

<div class="staff-order-item-row">

    <span>${esc(item.title || "票券")}</span>
    <strong>NT$${money(item.price)}</strong>

</div>

`;
        }).join("");

        var buttons = "";

        if(status === "waiting"){

            buttons += `

<button
    id="staffEnterOrderButton"
    class="staff-success-button">
    ▶ 確認入場
</button>

`;
        }

        if(status === "playing"){

            buttons += `

<button
    id="staffExitOrderButton"
    class="staff-danger-button">
    完成離場
</button>

`;
        }

        if(currentRole === "admin"){

            buttons += `

<button
    id="staffResetWaitingButton"
    class="staff-secondary-button">
    重設為等待
</button>

`;
        }

        var expected =
        Number(order.expectedExitTime || 0);

        var fixedRuleText =
        order.timeMode === "unlimited"
        ? "不限時間"
        : (
            order.fixedExitTime
            ? "固定至 " + order.fixedExitTime
            : ""
        );

        var remainingText = "--";

        if(
            status === "playing" &&
            order.timeMode === "unlimited"
        ){
            remainingText = "不限時間";
        }else if(
            status === "playing" &&
            expected
        ){

            var diff =
            Math.floor(
                (expected-Date.now())/60000
            );

            remainingText =
            diff >= 0
            ? "剩餘 " + diff + " 分鐘"
            : "超時 " + Math.abs(diff) + " 分鐘";
        }

        byId("staffOrderDetailContent")
        .innerHTML = `

<div class="staff-order-detail-card">

    <div class="staff-order-detail-head">

        <div>

            <div class="staff-order-detail-number">
                ${esc(order.queueNumber || "排號中")}
            </div>

            <div class="staff-order-detail-tail">
                訂單尾號 ${esc(orderTail(order))}
            </div>

        </div>

        <div class="staff-order-detail-status status-${esc(status)}">
            ${statusLabel(order)}
        </div>

    </div>

    <div class="staff-order-info-grid">

        <div>
            <span>遊玩人數</span>
            <strong>${Number(order.playerCount || 1)} 人</strong>
        </div>

        <div>
            <span>陪同人數</span>
            <strong>${Number(order.guardianCount || 0)} 人</strong>
        </div>

        <div>
            <span>遊玩時間</span>
            <strong>
                ${
                    fixedRuleText
                    ? esc(fixedRuleText)
                    : Number(order.playMinutes || 120) + " 分鐘"
                }
            </strong>
        </div>

        <div>
            <span>入場時間</span>
            <strong>${timeText(order.entryTime)}</strong>
        </div>

        <div>
            <span>預計離場</span>
            <strong>${timeText(order.expectedExitTime)}</strong>
        </div>

        <div>
            <span>時間狀態</span>
            <strong>${esc(remainingText)}</strong>
        </div>

    </div>

    <div class="staff-order-edit-grid">

        <label>
            <span>遊玩人數</span>
            <input
                id="staffOrderPlayerCount"
                type="number"
                min="1"
                value="${Number(order.playerCount || 1)}"
                ${status === "playing" ? "disabled" : ""}>
        </label>

        <label>
            <span>陪同人數</span>
            <input
                id="staffOrderGuardianCount"
                type="number"
                min="0"
                value="${Number(order.guardianCount || 0)}"
                ${status === "playing" ? "disabled" : ""}>
        </label>

        <label>
            <span>遊玩分鐘</span>
            <input
                id="staffOrderPlayMinutes"
                type="number"
                min="10"
                value="${
                    order.timeMode === "unlimited"
                    ? 0
                    : Number(order.playMinutes || 120)
                }"
                ${
                    status === "playing" ||
                    order.timeMode === "unlimited"
                    ? "disabled"
                    : ""
                }>
        </label>

        <label class="staff-form-full">
            <span>訂單備註</span>
            <textarea id="staffOrderRemark">${esc(order.remark || "")}</textarea>
        </label>

    </div>

    <button
        id="staffSaveOrderInfoButton"
        class="staff-primary-button">
        儲存訂單資料
    </button>

    <div class="staff-subsection-title">
        購買內容
    </div>

    <div class="staff-order-items-box">
        ${itemHtml}
    </div>

    <div class="staff-order-actions">
        ${buttons}
    </div>

</div>

`;

        byId("staffSaveOrderInfoButton")
        .addEventListener(
            "click",
            saveOrderInfo
        );

        if(byId("staffEnterOrderButton")){
            byId("staffEnterOrderButton")
            .addEventListener(
                "click",
                enterSelectedOrder
            );
        }

        if(byId("staffExitOrderButton")){
            byId("staffExitOrderButton")
            .addEventListener(
                "click",
                exitSelectedOrder
            );
        }

        if(byId("staffResetWaitingButton")){
            byId("staffResetWaitingButton")
            .addEventListener(
                "click",
                resetSelectedOrder
            );
        }

        if(
            window.MonsterOrderTools &&
            typeof window.MonsterOrderTools.render ===
            "function"
        ){
            window.MonsterOrderTools.render(
                selectedOrderId,
                order,
                currentRole
            );
        }
    }

    function openOrderDetail(orderId){

        selectedOrderId = orderId;
        currentRole = getRole();

        renderOrderDetail();

        byId("staffOrderDetailModal")
        .style.display = "flex";
    }

    function closeOrderDetail(){

        selectedOrderId = "";

        if(byId("staffOrderDetailModal")){
            byId("staffOrderDetailModal")
            .style.display = "none";
        }
    }

    function saveOrderInfo(){

        var order =
        selectedOrder();

        if(!order){
            return;
        }

        var updates = {
            remark:
            byId("staffOrderRemark")
            .value.trim(),
            updatedAt:Date.now()
        };

        if(
            (getOrderStatus(order)) !==
            "playing"
        ){
            updates.playerCount =
            Math.max(
                1,
                Number(
                    byId("staffOrderPlayerCount")
                    .value
                ) || 1
            );

            updates.guardianCount =
            Math.max(
                0,
                Number(
                    byId("staffOrderGuardianCount")
                    .value
                ) || 0
            );

            if(order.timeMode !== "unlimited"){

                updates.playMinutes =
                Math.max(
                    10,
                    Number(
                        byId("staffOrderPlayMinutes")
                        .value
                    ) || 120
                );
            }
        }

        firebase.database()
        .ref(ROOT + "/orders/" + selectedOrderId)
        .update(updates);
    }

    function enterSelectedOrder(){

        if(window.MonsterAttendanceGate && !MonsterAttendanceGate.requireClockIn()){
            return;
        }

        var order = selectedOrder();

        if(!order){
            return;
        }

        currentRole = getRole();

        var players = Math.max(
            1,
            Number(byId("staffOrderPlayerCount").value) || 1
        );

        var guardians = Math.max(
            0,
            Number(byId("staffOrderGuardianCount").value) || 0
        );

        var minutes =
            order.timeMode === "unlimited"
            ? 0
            : Math.max(
                10,
                Number(byId("staffOrderPlayMinutes").value) || 120
            );

        var enteringCount =
            players +
            (
                venueSettings.countGuardians
                ? guardians
                : 0
            );

        var maxPlayers = Number(
            venueSettings.maxPlayers ||
            config.defaultMaxPlayers ||
            40
        );

        var currentPlayers = calculateCurrentPlayers();
        var exceedsCapacity =
            currentPlayers + enteringCount > maxPlayers;
        var canForce =
            currentRole === "admin" ||
            currentRole === "manager";
        var forceCapacity = false;

        if(exceedsCapacity){
            if(!canForce){
                alert(
                    "目前場內 " + currentPlayers +
                    " 人\n此訂單需 " + enteringCount +
                    " 個名額\n上限 " + maxPlayers +
                    " 人\n\n場內人數已滿，請由店長處理。"
                );
                return;
            }

            if(!confirm(
                "目前場內 " + currentPlayers +
                " 人\n此訂單需 " + enteringCount +
                " 個名額\n上限 " + maxPlayers +
                " 人\n\n確定由店長強制入場？"
            )){
                return;
            }

            forceCapacity = true;
        }

        var button = byId("staffEnterOrderButton");
        if(button){
            button.disabled = true;
            button.textContent =
                forceCapacity
                ? "強制入場處理中…"
                : "入場處理中…";
        }

        var now = Date.now();
        var blockedReason = "";
        var orderRef = firebase.database()
            .ref(ROOT + "/orders/" + selectedOrderId);

        orderRef.transaction(
            function(currentOrder){
                if(!currentOrder || currentOrder.deleted){
                    blockedReason = "missing";
                    return;
                }

                var status = getOrderStatus(currentOrder);

                if(status === "playing"){
                    blockedReason = "already";
                    return;
                }

                if(status !== "waiting"){
                    blockedReason = "status";
                    return;
                }

                var expectedExit =
                    window.MonsterOrderLifecycle &&
                    typeof window.MonsterOrderLifecycle
                    .expectedExitTimestamp === "function"
                    ? window.MonsterOrderLifecycle
                    .expectedExitTimestamp(
                        now,
                        minutes,
                        currentOrder.fixedExitTime || "",
                        currentOrder.timeMode || "duration"
                    )
                    : (
                        currentOrder.timeMode === "unlimited"
                        ? null
                        : now + minutes * 60000
                    );

                if(window.MonsterTicketStatusEngine){
                    currentOrder = MonsterTicketStatusEngine.transitionOrder(
                        currentOrder,
                        "playing",
                        {
                            now:now,
                            actor:operatorName(),
                            expectedExitTime:expectedExit
                        }
                    );
                }else{
                    currentOrder.playStatus = "playing";
                    currentOrder.validationStatus = "playing";
                    currentOrder.ticketStatus = "playing";
                    currentOrder.ticketInstances =
                    (
                        Array.isArray(currentOrder.ticketInstances)
                        ? currentOrder.ticketInstances
                        : []
                    ).map(function(ticket){
                        var nextTicket =
                        Object.assign({},ticket || {});
                        nextTicket.status = "playing";
                        nextTicket.playStatus = "playing";
                        nextTicket.validationStatus = "playing";
                        nextTicket.checkedInAt = now;
                        nextTicket.checkedInBy = operatorName();
                        return nextTicket;
                    });
                }

                currentOrder.playerCount = players;
                currentOrder.guardianCount = guardians;
                currentOrder.playMinutes = minutes;
                currentOrder.entryTime = now;
                currentOrder.expectedExitTime = expectedExit;
                currentOrder.exitTime = null;
                currentOrder.enteredBy = operatorName();
                currentOrder.enteredById = currentActor().id || "";
                currentOrder.enteredByRole = currentActor().role || currentRole;
                currentOrder.updatedAt = now;

                if(forceCapacity){
                    currentOrder.capacityOverride = {
                        forced:true,
                        currentPlayers:currentPlayers,
                        enteringCount:enteringCount,
                        maxPlayers:maxPlayers,
                        overBy:Math.max(
                            0,
                            currentPlayers + enteringCount - maxPlayers
                        ),
                        operator:operatorName(),
                        operatorId:currentActor().id || "",
                        createdAt:now
                    };
                }

                return currentOrder;
            },
            function(error,committed,snapshot){
                if(button && document.body.contains(button)){
                    button.disabled = false;
                    button.textContent = "▶ 確認入場";
                }

                if(error){
                    alert(
                        "入場失敗：" +
                        (error.message || "請檢查網路")
                    );
                    return;
                }

                if(!committed){
                    if(blockedReason === "already"){
                        alert("此訂單已經入場，不會重複計算。");
                    }else if(blockedReason === "status"){
                        alert("此訂單已不是等待入場狀態，請重新整理。");
                    }else{
                        alert("找不到這筆訂單，請重新整理。");
                    }
                    return;
                }

                var latest =
                    snapshot && snapshot.val
                    ? snapshot.val()
                    : order;

                applyOrderUpdate(
                    selectedOrderId,
                    latest
                );

                if(window.MonsterAuth){
                    MonsterAuth.audit(
                        forceCapacity
                        ? "order.force_enter"
                        : "order.enter",
                        (
                            forceCapacity
                            ? "店長強制入場："
                            : "確認入場："
                        ) +
                        (
                            latest.queueNumber ||
                            latest.orderNo ||
                            ""
                        ),
                        {
                            source:"staff",
                            targetType:"order",
                            targetId:selectedOrderId,
                            forced:forceCapacity,
                            currentPlayers:currentPlayers,
                            enteringCount:enteringCount,
                            maxPlayers:maxPlayers
                        }
                    );
                }

                if(forceCapacity){
                    alert(
                        "✅ 店長強制入場完成\n" +
                        "入場後場內共 " +
                        (currentPlayers + enteringCount) +
                        " 人"
                    );
                }
            }
        );
    }

    function exitSelectedOrder(){

        if(window.MonsterAttendanceGate && !MonsterAttendanceGate.requireClockIn()){
            return;
        }

        var order =
        selectedOrder();

        if(!order){
            return;
        }

        if(
            !confirm(
                "確定完成 " +
                (order.queueNumber || "") +
                " 離場？"
            )
        ){
            return;
        }

        firebase.database()
        .ref(
            ROOT +
            "/orders/" +
            selectedOrderId
        )
        .transaction(
            function(current){

                if(
                    !current ||
                    current.deleted ||
                    getOrderStatus(current) !==
                    "playing"
                ){
                    return;
                }

                var exitNow = Date.now();

                if(window.MonsterTicketStatusEngine){
                    current = MonsterTicketStatusEngine.transitionOrder(
                        current,
                        "finished",
                        {
                            now:exitNow,
                            actor:operatorName(),
                            exitTime:exitNow
                        }
                    );
                }else{
                    current.playStatus = "finished";
                    current.validationStatus = "finished";
                    current.ticketStatus = "finished";
                    current.ticketInstances =
                    (
                        Array.isArray(current.ticketInstances)
                        ? current.ticketInstances
                        : []
                    ).map(function(ticket){
                        var nextTicket =
                        Object.assign({},ticket || {});
                        nextTicket.status = "finished";
                        nextTicket.playStatus = "finished";
                        nextTicket.validationStatus = "finished";
                        nextTicket.checkedOutAt = exitNow;
                        nextTicket.checkedOutBy = operatorName();
                        return nextTicket;
                    });
                    current.exitTime = exitNow;
                }

                current.exitedBy =
                operatorName();

                current.exitedById =
                currentActor().id || "";

                current.exitedByRole =
                currentActor().role || currentRole;

                current.updatedAt =
                Date.now();

                return current;
            },
            function(error,committed){

                if(error || !committed){
                    alert(
                        "離場更新失敗，請重新整理"
                    );
                    return;
                }

                if(window.MonsterAuth){
                    MonsterAuth.audit(
                        "order.exit",
                        "完成離場：" + (order.queueNumber || order.orderNo || ""),
                        {source:"staff",targetType:"order",targetId:selectedOrderId}
                    );
                }
            }
        );
    }

    function resetSelectedOrder(){

        if(
            window.MonsterPermission &&
            !MonsterPermission.requirePermission("order.cancel","❌ 只有店長可以重設訂單狀態")
        ){
            return;
        }

        firebase.database()
        .ref(
            ROOT +
            "/orders/" +
            selectedOrderId
        )
        .transaction(function(current){

            if(!current || current.deleted){
                return;
            }

            var resetAt = Date.now();

            if(window.MonsterTicketStatusEngine){
                current =
                MonsterTicketStatusEngine.transitionOrder(
                    current,
                    "waiting",
                    {
                        now:resetAt,
                        actor:operatorName()
                    }
                );
            }else{
                current.playStatus = "waiting";
                current.validationStatus = "waiting";
                current.ticketStatus = "waiting";
                current.ticketInstances =
                (
                    Array.isArray(current.ticketInstances)
                    ? current.ticketInstances
                    : []
                ).map(function(ticket){
                    var nextTicket =
                    Object.assign({},ticket || {});
                    nextTicket.status = "waiting";
                    nextTicket.playStatus = "waiting";
                    nextTicket.validationStatus = "waiting";
                    nextTicket.checkedInAt = null;
                    nextTicket.checkedInBy = null;
                    nextTicket.checkedOutAt = null;
                    nextTicket.checkedOutBy = null;
                    return nextTicket;
                });
                current.entryTime = null;
                current.expectedExitTime = null;
                current.exitTime = null;
            }

            current.updatedAt = resetAt;
            current.updatedBy = operatorName();

            return current;
        })
        .then(function(){
            if(window.MonsterAuth){
                MonsterAuth.audit(
                    "order.reset_waiting",
                    "重設訂單為等待狀態",
                    {source:"staff",targetType:"order",targetId:selectedOrderId}
                );
            }
        });
    }

    function saveCapacity(){

        if(
            window.MonsterPermission &&
            !MonsterPermission.requirePermission("capacity.update","❌ 只有店長可以修改人數上限")
        ){
            return;
        }

        var max =
        Math.max(
            1,
            Number(
                byId("staffMaxPlayersInput")
                .value
            ) || 40
        );

        firebase.database()
        .ref(ROOT + "/venue/settings")
        .update({
            maxPlayers:max,
            countGuardians:
            Boolean(
                byId("staffCountGuardiansInput")
                .checked
            ),
            updatedAt:Date.now(),
            updatedBy:operatorName()
        })
        .then(function(){
            if(window.MonsterAuth){
                MonsterAuth.audit(
                    "capacity.update",
                    "場內人數上限：" + max,
                    {source:"staff",targetType:"venue",targetId:"settings"}
                );
            }
        });
    }

    function getRole(){

        if(window.MonsterAuth){
            return MonsterAuth.getCurrentRole();
        }

        try{

            var value =
            JSON.parse(
                sessionStorage.getItem(
                    config.sessionKey ||
                    "monsterStaffSession"
                ) || "null"
            );

            return value
            ? value.role || ""
            : "";

        }catch(error){
            return "";
        }
    }

    function bind(){

        if(bound){
            return;
        }

        bound = true;

        byId("staffOrderSearchInput")
        .addEventListener(
            "input",
            renderOrderList
        );

        byId("staffOrderStatusFilter")
        .addEventListener(
            "change",
            renderOrderList
        );

        byId("staffOrderRefreshButton")
        .addEventListener(
            "click",
            refreshOrdersNow
        );

        byId("staffOrderDetailClose")
        .addEventListener(
            "click",
            closeOrderDetail
        );

        byId("staffSaveCapacityButton")
        .addEventListener(
            "click",
            saveCapacity
        );
    }

    function refreshOrdersNow(){

        var button =
        byId("staffOrderRefreshButton");

        attachTodayOrders();

        if(!ordersRef){
            updateLiveStatus(
                "● Firebase 尚未完成登入，正在重試",
                true
            );
            waitFirebase();
            return Promise.resolve(false);
        }

        if(button){
            button.disabled = true;
            button.textContent = "同步中…";
        }

        return ordersRef
        .once("value")
        .then(function(snapshot){
            applyOrdersSnapshot(snapshot);
        })
        .catch(handleOrderReadError)
        .then(function(){
            if(button){
                button.disabled = false;
                button.textContent = "重新整理";
            }
        });
    }

    function start(){

        if(started){
            return;
        }

        started = true;

        currentRole = getRole();

        settingsRef =
        firebase.database()
        .ref(ROOT + "/venue/settings");

        settingsRef.on(
            "value",
            function(snapshot){

                var value =
                snapshot.val();

                if(!value){

                    value = {
                        maxPlayers:
                        Number(
                            config.defaultMaxPlayers ||
                            40
                        ),
                        countGuardians:
                        Boolean(
                            config.countGuardians
                        ),
                        updatedAt:
                        Date.now()
                    };

                    settingsRef.set(value);
                }

                venueSettings =
                value || venueSettings;

                updateCapacityCards();
            }
        );

        ordersRootRef =
        firebase.database()
        .ref(ROOT + "/orders");

        attachTodayOrders();

        if(!dayChangeTimer){
            dayChangeTimer = setInterval(
                attachTodayOrders,
                60 * 1000
            );
        }

        bind();
    }

    function waitFirebase(){

        if(
            window.firebase &&
            firebase.apps &&
            firebase.apps.length
        ){

            if(
                firebase.auth &&
                firebase.auth().currentUser
            ){
                start();
                return;
            }

            if(
                firebase.auth &&
                !authWatchStarted
            ){
                authWatchStarted = true;
                firebase.auth()
                .onAuthStateChanged(function(user){
                    if(user){
                        start();
                    }
                });
            }

            return;
        }

        setTimeout(
            waitFirebase,
            500
        );
    }

    window.MonsterOrderCenter = {
        getSelectedOrderId:function(){
            return selectedOrderId;
        },
        getSelectedOrder:function(){
            return selectedOrder();
        },
        getOrders:function(){
            return ordersMap;
        },
        getTodaySalesSummary:
        calculateTodaySalesSummary,
        applyOrderUpdate:applyOrderUpdate,
        refresh:refreshOrdersNow,
        getSyncInfo:function(){
            return {
                started:started,
                lastOrderUpdateAt:
                lastOrderUpdateAt,
                orderCount:
                Object.keys(ordersMap).length
            };
        },
        getVenueState:function(){
            return {
                maxPlayers:
                Number(
                    venueSettings.maxPlayers ||
                    40
                ),
                countGuardians:
                Boolean(
                    venueSettings.countGuardians
                ),
                currentPlayers:
                calculateCurrentPlayers()
            };
        },
        getRole:getRole,
        rerender:function(){
            renderOrderList();
            renderOrderDetail();
            updateCapacityCards();
        },
        closeDetail:closeOrderDetail,
        openOrderDetail:openOrderDetail
    };

    window.addEventListener(
        "load",
        waitFirebase
    );

})();

