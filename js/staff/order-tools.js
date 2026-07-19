// =========================================
// 小怪獸售票機 V7.2
// 訂單中心進階工具
// =========================================
(function(){

    "use strict";

    var config =
    window.MONSTER_STAFF_CONFIG || {};

    var ROOT =
    config.firebaseRoot ||
    "monsterTicket/v1";

    var membersMap = {};
    var selectedOrderId = "";
    var selectedOrder = null;
    var selectedRole = "";

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

    function operatorName(){
        if(window.MonsterAuth){
            return MonsterAuth.getActor("staff").name;
        }
        return selectedRole === "admin" ? "店長" : "員工";
    }

    function currentActor(){
        if(window.MonsterAuth){
            return MonsterAuth.getActor("staff");
        }
        return {id:"",role:selectedRole || "staff",name:operatorName()};
    }

    function orderRef(){
        return firebase.database()
        .ref(ROOT + "/orders/" + selectedOrderId);
    }

    function logAction(type,detail){

        var data = {
            type:type,
            detail:detail || "",
            orderId:selectedOrderId,
            queueNumber:
            selectedOrder &&
            selectedOrder.queueNumber || "",
            operator:operatorName(),
            operatorId:currentActor().id || "",
            role:currentActor().role || selectedRole,
            createdAt:Date.now(),
            date:
            new Date()
            .toLocaleString("zh-TW")
        };

        firebase.database()
        .ref(ROOT + "/logs")
        .push(data);

        orderRef()
        .child("operationLogs")
        .push(data);

        if(window.MonsterAuth){
            MonsterAuth.audit(
                "order." + type,
                detail || "",
                {source:"staff",targetType:"order",targetId:selectedOrderId}
            );
        }
    }

    function memberList(){

        var list = [];

        Object.keys(membersMap || {})
        .forEach(function(id){

            var member = membersMap[id];

            if(
                member &&
                !member.deleted
            ){
                member.__id = id;
                list.push(member);
            }
        });

        return list;
    }

    function findMember(keyword){

        keyword =
        String(keyword || "")
        .trim()
        .toLowerCase();

        return memberList()
        .filter(function(member){

            return [
                member.name,
                member.phone,
                member.memberNo
            ]
            .join(" ")
            .toLowerCase()
            .indexOf(keyword) !== -1;
        });
    }

    function bindMember(){

        var keyword =
        prompt(
            "請輸入會員手機、姓名或會員編號"
        );

        if(!keyword){
            return;
        }

        var matches =
        findMember(keyword);

        if(matches.length === 0){

            alert("找不到會員");
            return;
        }

        var member = matches[0];

        if(
            matches.length > 1
        ){
            var message =
            "找到多位會員，將綁定第一位：\n\n" +
            matches.slice(0,5)
            .map(function(row,index){
                return (
                    (index+1) + ". " +
                    row.name + " " +
                    (row.phone || "")
                );
            }).join("\n");

            if(!confirm(message)){
                return;
            }
        }

        orderRef()
        .update({
            memberId:
            member.id || member.__id,
            memberName:
            member.name || "",
            memberPhone:
            member.phone || "",
            updatedAt:Date.now()
        })
        .then(function(){

            logAction(
                "bind_member",
                "補綁會員：" +
                member.name +
                " " +
                (member.phone || "")
            );

            alert(
                "已補綁會員：" +
                member.name
            );
        });
    }

    function totalToyCounts(order){

        var result = {
            green:0,
            red:0,
            total:0,
            points:0
        };

        (
            Array.isArray(order.items)
            ? order.items
            : []
        ).forEach(function(item){

            if(item.toy === "green"){
                result.green++;
                result.total++;
                result.points += 1;
            }

            if(item.toy === "red"){
                result.red++;
                result.total++;
                result.points += 2;
            }
        });

        return result;
    }

    function toyRewardStatus(order){

        if(order.toyRewardStatus){
            return order.toyRewardStatus;
        }

        if(
            order.toyPointConversion &&
            Number(
                order.toyPointConversion.points ||
                0
            ) > 0
        ){
            return "converted";
        }

        if(order.toyClaimedAt){
            return "claimed";
        }

        return "none";
    }

    function toyRewardStatusText(order){

        var status =
        toyRewardStatus(order);

        if(status === "claimed"){
            return "已領取玩具";
        }

        if(status === "converted"){
            return "已轉玩具點數";
        }

        if(status === "pending"){
            return "等待領取";
        }

        return "尚未處理";
    }

    function eligibleToyCounts(order){

        var status =
        toyRewardStatus(order);

        if(
            status === "claimed" ||
            status === "converted"
        ){
            return {
                green:0,
                red:0
            };
        }

        var counts =
        totalToyCounts(order);

        return {
            green:counts.green,
            red:counts.red
        };
    }

    function requireActiveOrder(actionLabel){
        if(window.MonsterVoidProtection){
            return MonsterVoidProtection.assertActive(selectedOrder, actionLabel);
        }
        if(selectedOrder && (selectedOrder.status === "cancel" || selectedOrder.playStatus === "cancelled" || selectedOrder.cancelled)){
            alert("此訂單已作廢，無法" + actionLabel);
            return false;
        }
        return true;
    }

    function convertToyPoints(){

        if(!requireActiveOrder("轉換玩具點數")){
            return;
        }

        if(!selectedOrder.memberId){

            alert(
                "請先補綁會員，才能轉成玩具點數"
            );
            return;
        }

        var status =
        toyRewardStatus(selectedOrder);

        if(status === "claimed"){

            alert(
                "此訂單的玩具已經領取，不能再轉成玩具點數"
            );
            return;
        }

        if(status === "converted"){

            alert(
                "此訂單已經轉成玩具點數"
            );
            return;
        }

        var counts =
        totalToyCounts(selectedOrder);

        if(counts.total <= 0){

            alert(
                "此訂單沒有可處理的玩具"
            );
            return;
        }

        if(
            !confirm(
                "確定放棄本訂單全部玩具，轉成玩具點數？\n\n" +
                "綠標 " + counts.green +
                " 個＝" + counts.green + " 點\n" +
                "紅標 " + counts.red +
                " 個＝" + (counts.red*2) + " 點\n\n" +
                "合計 " + counts.points +
                " 點\n\n轉換後不能再領取玩具。"
            )
        ){
            return;
        }

        var orderTransactionRef =
        firebase.database()
        .ref(ROOT + "/orders/" + selectedOrderId);

        var reserved = false;

        orderTransactionRef.transaction(
            function(order){

                if(!order){
                    return;
                }

                if(window.MonsterVoidProtection && MonsterVoidProtection.isVoided(order)){
                    return;
                }

                var currentStatus =
                toyRewardStatus(order);

                if(
                    currentStatus === "claimed" ||
                    currentStatus === "converted"
                ){
                    return;
                }

                order.toyRewardStatus =
                "converted";

                order.toyPointConversion = {
                    greenCount:counts.green,
                    redCount:counts.red,
                    points:counts.points,
                    convertedAt:Date.now(),
                    convertedBy:operatorName()
                };

                order.toyConvertedPoints =
                counts.points;

                order.toyConvertedAt =
                Date.now();

                order.toyConvertedBy =
                operatorName();

                order.updatedAt =
                Date.now();

                reserved = true;

                return order;
            },
            function(error,committed){

                if(error || !committed || !reserved){

                    alert(
                        "玩具已被其他裝置處理，請重新整理"
                    );
                    return;
                }

                var memberRef =
                firebase.database()
                .ref(
                    ROOT +
                    "/members/" +
                    selectedOrder.memberId
                );

                memberRef.transaction(
                    function(member){

                        if(!member){
                            return;
                        }

                        var current =
                        Number(
                            member.toyPoints || 0
                        );

                        var balance =
                        current + counts.points;

                        var history =
                        Array.isArray(
                            member.toyPointHistory
                        )
                        ? member.toyPointHistory
                        : [];

                        history.unshift({
                            id:
                            "toy_" + Date.now(),
                            date:
                            new Date()
                            .toLocaleString("zh-TW"),
                            amount:
                            counts.points,
                            reason:
                            "訂單玩具轉點",
                            note:
                            "綠標 " +
                            counts.green +
                            "、紅標 " +
                            counts.red,
                            orderNo:
                            selectedOrder.orderNo ||
                            "",
                            operator:
                            operatorName(),
                            balance:balance
                        });

                        member.toyPoints =
                        balance;

                        member.toyPointHistory =
                        history.slice(0,100);

                        member.updatedAt =
                        Date.now();

                        member.updatedBy =
                        operatorName();

                        return member;
                    },
                    function(memberError,memberCommitted){

                        if(
                            memberError ||
                            !memberCommitted
                        ){

                            orderTransactionRef
                            .update({
                                toyRewardStatus:"none",
                                toyPointConversion:null,
                                toyConvertedPoints:null,
                                toyConvertedAt:null,
                                toyConvertedBy:null,
                                updatedAt:Date.now()
                            });

                            alert(
                                "會員玩具點數更新失敗，訂單已恢復為未處理"
                            );
                            return;
                        }

                        logAction(
                            "toy_conversion",
                            "全部玩具轉點 +" +
                            counts.points +
                            "（綠 " +
                            counts.green +
                            "、紅 " +
                            counts.red +
                            "）"
                        );

                        alert(
                            "已轉入 " +
                            counts.points +
                            " 點玩具點數"
                        );
                    }
                );
            }
        );
    }

    function claimToy(){

        if(!requireActiveOrder("領取玩具")){
            return;
        }

        var status =
        toyRewardStatus(selectedOrder);

        if(status === "converted"){

            alert(
                "此訂單已轉成玩具點數，不能再領取玩具"
            );
            return;
        }

        if(status === "claimed"){

            alert(
                "此訂單玩具已經領取"
            );
            return;
        }

        var counts =
        totalToyCounts(selectedOrder);

        if(counts.total <= 0){

            alert(
                "此訂單沒有玩具可領取"
            );
            return;
        }

        if(
            !confirm(
                "確認已交付本訂單全部玩具？\n\n" +
                "綠標 " + counts.green +
                " 個\n紅標 " + counts.red +
                " 個\n\n領取後不能再轉成玩具點數。"
            )
        ){
            return;
        }

        var committedClaim = false;

        orderRef()
        .transaction(
            function(order){

                if(!order){
                    return;
                }

                if(window.MonsterVoidProtection && MonsterVoidProtection.isVoided(order)){
                    return;
                }

                var currentStatus =
                toyRewardStatus(order);

                if(
                    currentStatus === "claimed" ||
                    currentStatus === "converted"
                ){
                    return;
                }

                order.toyRewardStatus =
                "claimed";

                order.toyClaimedAt =
                Date.now();

                order.toyClaimedBy =
                operatorName();

                order.toyClaimedGreen =
                counts.green;

                order.toyClaimedRed =
                counts.red;

                order.updatedAt =
                Date.now();

                committedClaim = true;

                return order;
            },
            function(error,committed){

                if(
                    error ||
                    !committed ||
                    !committedClaim
                ){
                    alert(
                        "玩具已被其他裝置處理，請重新整理"
                    );
                    return;
                }

                logAction(
                    "toy_claimed",
                    "已領取玩具（綠 " +
                    counts.green +
                    "、紅 " +
                    counts.red +
                    "）"
                );

                alert(
                    "玩具領取已完成"
                );
            }
        );
    }

    function markToyPending(){

        if(!requireActiveOrder("設定等待領取")){
            return;
        }

        var status =
        toyRewardStatus(selectedOrder);

        if(
            status === "claimed" ||
            status === "converted"
        ){

            alert(
                "此訂單的玩具已完成處理，不能改為等待領取"
            );
            return;
        }

        var reason =
        prompt(
            "請輸入等待領取原因",
            "玩具暫缺，等待補貨"
        );

        if(reason === null){
            return;
        }

        orderRef()
        .update({
            toyRewardStatus:"pending",
            toyPendingReason:
            reason || "等待領取",
            toyPendingAt:
            Date.now(),
            toyPendingBy:
            operatorName(),
            updatedAt:Date.now()
        })
        .then(function(){

            logAction(
                "toy_pending",
                "玩具等待領取：" +
                (reason || "未填原因")
            );
        });
    }

    function callQueue(){

        if(!selectedOrder.queueNumber){
            alert("此訂單尚未取得叫號");
            return;
        }

        var callout = {
            orderId:selectedOrderId,
            queueNumber:
            selectedOrder.queueNumber,
            playerCount:
            Number(
                selectedOrder.playerCount || 1
            ),
            createdAt:Date.now(),
            expiresAt:
            Date.now() + 15000,
            operator:operatorName()
        };

        firebase.database()
        .ref(ROOT + "/venue/callout")
        .set(callout)
        .then(function(){

            logAction(
                "call_queue",
                selectedOrder.queueNumber +
                " 請入場"
            );
        });
    }

    function requestReprint(){

        var reason =
        prompt(
            "請輸入補印原因",
            "票券遺失"
        );

        if(reason === null){
            return;
        }

        orderRef()
        .transaction(function(order){

            if(!order){
                return;
            }

            order.reprintCount =
            Number(order.reprintCount || 0) + 1;

            order.lastReprintAt =
            Date.now();

            order.lastReprintBy =
            operatorName();

            order.lastReprintReason =
            reason || "未填";

            order.updatedAt =
            Date.now();

            return order;
        })
        .then(function(){

            logAction(
                "reprint_request",
                "補印紀錄：" +
                (reason || "未填")
            );

            alert(
                "已記錄補印需求\n\n目前手機端只記錄補印，實際列印仍需由點餐機或之後的 App 執行。"
            );
        });
    }

    function extendTime(){

        if(
            selectedOrder.playStatus !==
            "playing"
        ){
            alert("只有遊玩中的訂單可延長時間");
            return;
        }

        if(
            selectedOrder.timeMode ===
            "unlimited"
        ){
            alert("此訂單為不限時間");
            return;
        }

        var text =
        prompt(
            "請輸入延長分鐘數",
            "30"
        );

        if(text === null){
            return;
        }

        var minutes =
        Number(text || 0);

        if(
            !Number.isFinite(minutes) ||
            minutes <= 0
        ){
            alert("請輸入正確分鐘數");
            return;
        }

        var base =
        Number(
            selectedOrder.expectedExitTime ||
            Date.now()
        );

        orderRef()
        .update({
            expectedExitTime:
            base + minutes * 60000,
            extendedMinutes:
            Number(
                selectedOrder.extendedMinutes ||
                0
            ) + minutes,
            updatedAt:Date.now()
        })
        .then(function(){

            logAction(
                "extend_time",
                "延長 " +
                minutes +
                " 分鐘"
            );
        });
    }

    function editEntryTime(){

        if(
            selectedOrder.playStatus !==
            "playing"
        ){
            alert("只有遊玩中的訂單可修改入場時間");
            return;
        }

        var current =
        new Date(
            Number(
                selectedOrder.entryTime ||
                Date.now()
            )
        );

        var defaultText =
        String(current.getHours())
        .padStart
        ? (
            String(current.getHours())
            .padStart(2,"0") +
            ":" +
            String(current.getMinutes())
            .padStart(2,"0")
        )
        : (
            (current.getHours()<10?"0":"") +
            current.getHours() +
            ":" +
            (current.getMinutes()<10?"0":"") +
            current.getMinutes()
        );

        var text =
        prompt(
            "請輸入新的入場時間（HH:MM）",
            defaultText
        );

        if(!text){
            return;
        }

        var match =
        /^(\d{1,2}):(\d{2})$/
        .exec(text);

        if(!match){
            alert("時間格式錯誤");
            return;
        }

        var entry =
        new Date();

        entry.setHours(
            Number(match[1]),
            Number(match[2]),
            0,
            0
        );

        var expected =
        window.MonsterOrderLifecycle
        .expectedExitTimestamp(
            entry.getTime(),
            Number(
                selectedOrder.playMinutes ||
                120
            ),
            selectedOrder.fixedExitTime ||
            "",
            selectedOrder.timeMode ||
            "duration"
        );

        orderRef()
        .update({
            entryTime:
            entry.getTime(),
            expectedExitTime:
            expected,
            entryTimeAdjustedAt:
            Date.now(),
            entryTimeAdjustedBy:
            operatorName(),
            updatedAt:Date.now()
        })
        .then(function(){

            logAction(
                "edit_entry_time",
                "修改入場時間為 " +
                text
            );
        });
    }

    function releaseVenueCapacity(){

        return Promise.resolve();
    }

    function cancelOrder(){

        if(
            window.MonsterPermission &&
            !MonsterPermission.requirePermission("order.cancel","❌ 只有店長可以作廢訂單")
        ){
            return;
        }

        var reason =
        prompt(
            "請輸入作廢原因"
        );

        if(!reason){
            return;
        }

        if(
            !confirm(
                "確定作廢 " +
                (selectedOrder.queueNumber || "") +
                "？"
            )
        ){
            return;
        }

        releaseVenueCapacity(
            selectedOrderId,
            selectedOrder
        )
        .then(function(){

            var actor = currentActor();
            var patch = window.MonsterVoidProtection
                ? MonsterVoidProtection.stamp(reason,{name:operatorName(),id:actor.id || "",role:actor.role || selectedRole})
                : {status:"cancel",playStatus:"cancelled",validationStatus:"cancelled",cancelled:true,voided:true,cancelReason:reason,cancelledAt:Date.now(),cancelledBy:operatorName(),cancelledById:actor.id || "",cancelledByRole:actor.role || selectedRole,updatedAt:Date.now()};
            return orderRef().update(patch);
        })
        .then(function(){

            logAction(
                "cancel_order",
                "作廢原因：" +
                reason
            );

            alert("訂單已作廢");
        });
    }

    function forceEnter(){

        if(
            window.MonsterPermission &&
            !MonsterPermission.requirePermission("capacity.update","❌ 只有店長可以強制入場")
        ){
            return;
        }

        if(
            selectedOrder.playStatus !==
            "waiting"
        ){
            return;
        }

        if(
            !confirm(
                "此操作會略過容量限制。\n確定由店長強制入場？"
            )
        ){
            return;
        }

        orderRef()
        .transaction(
            function(current){

                if(
                    !current ||
                    current.deleted ||
                    current.playStatus !==
                    "waiting"
                ){
                    return;
                }

                var now = Date.now();

                var expected =
                window.MonsterOrderLifecycle
                .expectedExitTimestamp(
                    now,
                    Number(
                        current.playMinutes ||
                        120
                    ),
                    current.fixedExitTime ||
                    "",
                    current.timeMode ||
                    "duration"
                );

                current.playStatus =
                "playing";

                current.entryTime =
                now;

                current.expectedExitTime =
                expected;

                current.exitTime =
                null;

                current.forcedEntry =
                true;

                current.enteredBy =
                "店長";

                current.updatedAt =
                now;

                return current;
            },
            function(error,committed){

                if(error || !committed){
                    alert(
                        "強制入場失敗，訂單狀態可能已變更"
                    );
                    return;
                }

                logAction(
                    "force_entry",
                    "店長強制入場"
                );
            }
        );
    }

    function historyHtml(order){

        var logs =
        order.operationLogs || {};

        var list = [];

        Object.keys(logs)
        .forEach(function(id){
            list.push(logs[id]);
        });

        list.sort(function(a,b){
            return Number(b.createdAt||0) -
                   Number(a.createdAt||0);
        });

        if(list.length === 0){
            return '<div class="staff-empty-card">尚無操作紀錄</div>';
        }

        return list.slice(0,20)
        .map(function(row){

            return `

<div class="staff-order-log-row">

    <div>
        <strong>${esc(row.detail || row.type || "操作")}</strong>
        <span>${esc(row.date || "")}・${esc(row.operator || "")}</span>
    </div>

</div>

`;
        }).join("");
    }

    function render(
        orderId,
        order,
        role
    ){

        selectedOrderId = orderId;
        selectedOrder = order;
        selectedRole = role;

        var card =
        byId("staffOrderDetailContent");

        if(!card){
            return;
        }

        var old =
        byId("staffOrderToolsSection");

        if(old){
            old.parentNode.removeChild(old);
        }

        var eligible =
        eligibleToyCounts(order);

        var rewardStatus =
        toyRewardStatus(order);

        var rewardCounts =
        totalToyCounts(order);

        var isVoidedOrder = window.MonsterVoidProtection
            ? MonsterVoidProtection.isVoided(order)
            : (order.status === "cancel" || order.playStatus === "cancelled" || order.cancelled);

        var tools =
        document.createElement("div");

        tools.id =
        "staffOrderToolsSection";

        tools.className =
        "staff-order-tools-section";

        tools.innerHTML = `

<div class="staff-subsection-title">
    ⚡ 訂單進階操作
</div>

<div class="staff-toy-reward-status reward-${rewardStatus}">

    <span>玩具處理狀態</span>

    <strong>
        ${toyRewardStatusText(order)}
    </strong>

    ${
        rewardStatus === "claimed"
        ? "<small>領取時間：" +
          esc(
              order.toyClaimedAt
              ? new Date(order.toyClaimedAt)
                .toLocaleString("zh-TW")
              : ""
          ) +
          "・" +
          esc(order.toyClaimedBy || "") +
          "</small>"
        : ""
    }

    ${
        rewardStatus === "converted"
        ? "<small>已轉 " +
          Number(order.toyConvertedPoints || 0) +
          " 點・" +
          esc(order.toyConvertedBy || "") +
          "</small>"
        : ""
    }

    ${
        rewardStatus === "pending"
        ? "<small>" +
          esc(order.toyPendingReason || "等待領取") +
          "</small>"
        : ""
    }

</div>

${isVoidedOrder ? `<div class="staff-void-protection-banner">🚫 此訂單已作廢，玩具領取、玩具轉點與等待領取均已鎖定</div>` : ""}

<div class="staff-order-tool-grid">

    <button id="orderToolCall" class="staff-primary-button">
        📢 候位叫號
    </button>

    <button id="orderToolBindMember" class="staff-secondary-button">
        👤 補綁會員
    </button>

    <button
        id="orderToolToyClaim"
        class="staff-primary-button"
        ${
            isVoidedOrder ||
            rewardStatus === "converted" ||
            rewardStatus === "claimed"
            ? "disabled"
            : ""
        }>
        🧸 領取玩具
        <small>綠 ${rewardCounts.green}／紅 ${rewardCounts.red}</small>
    </button>

    <button
        id="orderToolToyPoint"
        class="staff-success-button"
        ${
            isVoidedOrder ||
            rewardStatus === "converted" ||
            rewardStatus === "claimed"
            ? "disabled"
            : ""
        }>
        🎁 轉玩具點數
        <small>共 ${rewardCounts.points} 點</small>
    </button>

    <button
        id="orderToolToyPending"
        class="staff-secondary-button"
        ${
            isVoidedOrder ||
            rewardStatus === "converted" ||
            rewardStatus === "claimed"
            ? "disabled"
            : ""
        }>
        📦 等待領取
    </button>

    <button id="orderToolReprint" class="staff-secondary-button">
        🖨 補印紀錄
        <small>${Number(order.reprintCount || 0)} 次</small>
    </button>

    ${
        order.playStatus === "playing"
        ? `
        <button id="orderToolExtend" class="staff-primary-button">
            ⏱ 延長時間
        </button>

        <button id="orderToolEditEntry" class="staff-secondary-button">
            🕒 修改入場時間
        </button>
        `
        : ""
    }

    ${
        role === "admin" &&
        order.playStatus === "waiting"
        ? `
        <button id="orderToolForceEntry" class="staff-danger-button">
            ⚠ 強制入場
        </button>
        `
        : ""
    }

    ${
        role === "admin" &&
        order.playStatus !== "cancelled"
        ? `
        <button id="orderToolCancel" class="staff-danger-button">
            ❌ 作廢訂單
        </button>
        `
        : ""
    }

</div>

<div class="staff-subsection-title">
    📋 操作紀錄
</div>

<div class="staff-order-log-list">
    ${historyHtml(order)}
</div>

`;

        card.appendChild(tools);

        byId("orderToolCall")
        .addEventListener(
            "click",
            callQueue
        );

        byId("orderToolBindMember")
        .addEventListener(
            "click",
            bindMember
        );

        byId("orderToolToyClaim")
        .addEventListener(
            "click",
            claimToy
        );

        byId("orderToolToyPoint")
        .addEventListener(
            "click",
            convertToyPoints
        );

        byId("orderToolToyPending")
        .addEventListener(
            "click",
            markToyPending
        );

        byId("orderToolReprint")
        .addEventListener(
            "click",
            requestReprint
        );

        if(byId("orderToolExtend")){
            byId("orderToolExtend")
            .addEventListener(
                "click",
                extendTime
            );
        }

        if(byId("orderToolEditEntry")){
            byId("orderToolEditEntry")
            .addEventListener(
                "click",
                editEntryTime
            );
        }

        if(byId("orderToolForceEntry")){
            byId("orderToolForceEntry")
            .addEventListener(
                "click",
                forceEnter
            );
        }

        if(byId("orderToolCancel")){
            byId("orderToolCancel")
            .addEventListener(
                "click",
                cancelOrder
            );
        }
    }

    function start(){

        firebase.database()
        .ref(ROOT + "/members")
        .on("value",function(snapshot){

            membersMap =
            snapshot.val() || {};
        });
    }

    function waitFirebase(){

        if(
            window.firebase &&
            firebase.apps &&
            firebase.apps.length
        ){
            start();
            return;
        }

        setTimeout(
            waitFirebase,
            500
        );
    }

    window.MonsterOrderTools = {
        render:render
    };

    window.addEventListener(
        "load",
        waitFirebase
    );

})();
