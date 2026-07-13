// =========================================
// 小怪獸售票機 V6.4C
// 會員完整整合
// =========================================

const MEMBER_KEY = "memberData";

const CONSUME_POINT_RATE = 100;
const TOY_POINT_GREEN = 1;
const TOY_POINT_RED = 2;

const MEMBER_LEVELS = [
    {name:"VIP會員", minSpend:30000},
    {name:"金卡會員", minSpend:15000},
    {name:"銀卡會員", minSpend:5000},
    {name:"一般會員", minSpend:0}
];

let memberData = loadMembers();
let currentMember = null;
let currentMemberHistoryId = "";

function loadMembers(){

    try{

        const data =
        JSON.parse(
            localStorage.getItem(MEMBER_KEY) || "[]"
        );

        return Array.isArray(data)
        ? data
        : [];

    }catch(error){

        console.error(error);

        return [];

    }

}


function normalizeMemberPointFields(){

    memberData.forEach(member=>{

        member.points =
        Number(member.points || 0);

        member.toyPoints =
        Number(member.toyPoints || 0);

        member.pointHistory =
        Array.isArray(member.pointHistory)
        ? member.pointHistory
        : [];

        member.toyPointHistory =
        Array.isArray(member.toyPointHistory)
        ? member.toyPointHistory
        : [];

    });

}

normalizeMemberPointFields();

function getMemberLevel(member){

    const spend =
    Number(member?.totalSpend || 0);

    return MEMBER_LEVELS.find(level=>
        spend >= level.minSpend
    ) || MEMBER_LEVELS[
        MEMBER_LEVELS.length - 1
    ];

}

function saveMembers(){

    localStorage.setItem(
        MEMBER_KEY,
        JSON.stringify(memberData)
    );

}

function memberPhone(value){

    return String(value || "")
    .replace(/\D/g,"");

}

function memberEsc(value){

    return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");

}

function memberMoney(value){

    return Number(value || 0)
    .toLocaleString("zh-TW");

}

function newMemberNo(){

    const now = new Date();

    const datePart =
    now.getFullYear().toString() +
    String(now.getMonth()+1).padStart(2,"0") +
    String(now.getDate()).padStart(2,"0");

    const randomPart =
    String(Date.now()).slice(-5);

    return "M" + datePart + randomPart;

}

// =========================================
// 會員訂單資料
// =========================================
function getMemberOrders(memberId){

    return (
        Array.isArray(salesHistory)
        ? salesHistory
        : []
    ).filter(order=>
        order.memberId === memberId
    );

}

function getNormalMemberOrders(memberId){

    return getMemberOrders(memberId)
    .filter(order=>
        order.status !== "cancel"
    );

}

function getMemberOrderCount(memberId){

    return getNormalMemberOrders(memberId)
    .length;

}

function getMemberLastPurchase(memberId){

    const order =
    getNormalMemberOrders(memberId)[0];

    if(!order){

        return "尚無消費";

    }

    return `${order.date || ""} ${order.time || ""}`.trim();

}

// =========================================
// 開啟會員管理
// =========================================
function openMemberManager(){

    renderMemberList();

    closeMemberEditor();

    showPage("memberManagerPage");

}

function renderMemberList(){

    const box =
    document.getElementById(
        "memberManagerList"
    );

    if(!box) return;

    const query =
    (
        document.getElementById(
            "memberSearchInput"
        )?.value || ""
    )
    .trim()
    .toLowerCase();

    const rows =
    memberData.filter(member=>

        !query ||

        [
            member.memberNo,
            member.name,
            member.phone,
            member.birthday,
            member.note
        ]
        .join(" ")
        .toLowerCase()
        .includes(query)

    );

    if(rows.length === 0){

        box.innerHTML = `

<div class="member-empty-card">

    <div class="member-empty-icon">
        👤
    </div>

    <div class="member-empty-title">
        找不到會員
    </div>

    <div class="member-empty-text">
        可新增會員或調整搜尋條件
    </div>

</div>

`;

        return;

    }

    box.innerHTML =
    rows.map(member=>{

        const orderCount =
        getMemberOrderCount(member.id);

        const lastPurchase =
        getMemberLastPurchase(member.id);

        return `

<div class="member-card">

    <div class="member-card-header">

        <div>

            <div class="member-card-name">
                ${memberEsc(member.name)}
            </div>

            <div class="member-card-number">
                ${memberEsc(member.memberNo)}
            </div>

        </div>

        <div class="member-card-phone">
            📱 ${memberEsc(member.phone)}
        </div>

    </div>

    <div class="member-card-grid">

        <div>
            <span>生日</span>
            <strong>${member.birthday || "未填寫"}</strong>
        </div>

        <div>
            <span>加入日期</span>
            <strong>${member.joinDate || ""}</strong>
        </div>

        <div>
            <span>累積消費</span>
            <strong>NT$${memberMoney(member.totalSpend)}</strong>
        </div>

        <div>
            <span>消費點數</span>
            <strong>${Number(member.points || 0)} 點</strong>
        </div>

        <div class="member-toy-point-box">
            <span>玩具點數</span>
            <strong>${Number(member.toyPoints || 0)} 點</strong>
        </div>

        <div>
            <span>會員等級</span>
            <strong>${getMemberLevel(member).name}</strong>
        </div>

        <div>
            <span>消費次數</span>
            <strong>${orderCount} 次</strong>
        </div>

        <div>
            <span>最近消費</span>
            <strong>${lastPurchase}</strong>
        </div>

    </div>

    ${
        member.note
        ? `
        <div class="member-card-note">
            備註：${memberEsc(member.note)}
        </div>
        `
        : ""
    }

    <div class="member-card-actions">

        <button
            class="member-toy-adjust-btn"
            onclick="adjustToyPoints('${member.id}')">
            玩具點數操作
        </button>

        <button
            class="member-history-btn"
            onclick="openMemberHistory('${member.id}')">
            消費紀錄
        </button>

        <button
            class="member-edit-btn member-admin-only"
            onclick="openMemberEditor('${member.id}')">
            編輯
        </button>

        <button
            class="member-delete-btn member-admin-only"
            onclick="deleteMember('${member.id}')">
            刪除
        </button>

    </div>

</div>

`;

    }).join("");

}

document
.getElementById("memberSearchInput")
?.addEventListener(
    "input",
    renderMemberList
);

// =========================================
// 會員消費紀錄
// =========================================
function openMemberHistory(memberId){

    playClick();

    currentMemberHistoryId =
    memberId;

    renderMemberHistory();

    showPage("memberHistoryPage");

}

function renderMemberHistory(){

    const content =
    document.getElementById(
        "memberHistoryContent"
    );

    if(!content) return;

    const member =
    memberData.find(item=>
        item.id === currentMemberHistoryId
    );

    if(!member){

        content.innerHTML =
        "找不到會員資料";

        return;

    }

    const orders =
    getMemberOrders(member.id);

    let orderHtml = "";

    if(orders.length === 0){

        orderHtml = `

<div class="member-history-empty">
    此會員目前沒有消費紀錄
</div>

`;

    }else{

        orderHtml =
        orders.map(order=>{

            const originalIndex =
            salesHistory.indexOf(order);

            const items =
            Array.isArray(order.items)
            ? order.items
            : [];

            const itemText =
            items.map(item=>
                item.title || item.id || "票券"
            ).join("、");

            const cancelled =
            order.status === "cancel";

            return `

<button
    type="button"
    class="member-history-order ${cancelled ? "cancelled" : ""}"
    onclick="playClick(); openOrderDetail(${originalIndex})">

    <div>

        <div class="member-history-order-date">
            ${order.date || ""} ${order.time || ""}
        </div>

        <div class="member-history-order-items">
            ${memberEsc(itemText)}
        </div>

        <div class="member-history-order-no">
            ${memberEsc(order.orderNo || "")}
        </div>

    </div>

    <div class="member-history-order-right">

        <strong>
            NT$${memberMoney(order.amount)}
        </strong>

        <span>
            ${cancelled ? "已作廢" : order.payment || ""}
        </span>

    </div>

</button>

`;

        }).join("");

    }

    content.innerHTML = `

<div class="member-history-summary">

    <div class="member-history-name">
        👤 ${memberEsc(member.name)}
    </div>

    <div class="member-history-phone">
        ${memberEsc(member.phone)}
    </div>

    <div class="member-history-summary-grid">

        <div>
            <span>會員編號</span>
            <strong>${memberEsc(member.memberNo)}</strong>
        </div>

        <div>
            <span>累積消費</span>
            <strong>NT$${memberMoney(member.totalSpend)}</strong>
        </div>

        <div>
            <span>正常交易</span>
            <strong>${getMemberOrderCount(member.id)} 次</strong>
        </div>

        <div>
            <span>消費點數</span>
            <strong>${Number(member.points || 0)} 點</strong>
        </div>

        <div>
            <span>玩具點數</span>
            <strong>${Number(member.toyPoints || 0)} 點</strong>
        </div>

        <div>
            <span>會員等級</span>
            <strong>${getMemberLevel(member).name}</strong>
        </div>

    </div>

</div>

${renderToyPointHistory(member)}

<div class="member-history-list">
    ${orderHtml}
</div>

`;

}


function renderToyPointHistory(member){

    const rows =
    Array.isArray(member.toyPointHistory)
    ? member.toyPointHistory.slice(0,20)
    : [];

    if(rows.length === 0){

        return `

<div class="toy-point-history-card">

    <div class="toy-point-history-title">
        🎁 玩具點數紀錄
    </div>

    <div class="toy-point-history-empty">
        尚無玩具點數紀錄
    </div>

</div>

`;

    }

    const html =
    rows.map(row=>{

        const amount =
        Number(row.amount || 0);

        return `

<div class="toy-point-history-row">

    <div>

        <strong>
            ${memberEsc(row.reason || "玩具點數調整")}
        </strong>

        <span>
            ${memberEsc(row.date || "")}
            ${row.orderNo ? `・${memberEsc(row.orderNo)}` : ""}
            ${row.operator ? `・${memberEsc(row.operator)}` : ""}
        </span>

        ${
            row.note
            ? `<small>${memberEsc(row.note)}</small>`
            : ""
        }

    </div>

    <div class="${amount >= 0 ? "toy-point-plus" : "toy-point-minus"}">

        ${amount >= 0 ? "+" : ""}${amount} 點

        <small>
            餘額 ${Number(row.balance || 0)}
        </small>

    </div>

</div>

`;

    }).join("");

    return `

<div class="toy-point-history-card">

    <div class="toy-point-history-title">
        🎁 玩具點數紀錄
    </div>

    ${html}

</div>

`;

}

// =========================================
// 新增／編輯會員
// =========================================
function openMemberEditor(id=""){

    playClick();

    const box =
    document.getElementById(
        "memberEditorPanel"
    );

    if(!box) return;

    const member =
    memberData.find(item=>
        item.id === id
    ) || {

        id:"",
        name:"",
        phone:"",
        birthday:"",
        joinDate:
        new Date().toLocaleDateString("zh-TW"),
        totalSpend:0,
        points:0,
        note:""

    };

    box.style.display = "block";

    box.innerHTML = `

<div class="member-editor-card">

    <div class="member-editor-title">
        ${member.id ? "編輯會員" : "新增會員"}
    </div>

    <input
        type="hidden"
        id="memberEditId"
        value="${memberEsc(member.id)}">

    <div class="member-editor-grid">

        <div class="member-form-field">

            <label>姓名 *</label>

            <input
                id="memberEditName"
                value="${memberEsc(member.name)}">

        </div>

        <div class="member-form-field">

            <label>手機 *</label>

            <input
                id="memberEditPhone"
                inputmode="tel"
                value="${memberEsc(member.phone)}">

        </div>

        <div class="member-form-field">

            <label>生日</label>

            <input
                id="memberEditBirthday"
                type="date"
                value="${memberEsc(member.birthday)}">

        </div>

        <div class="member-form-field">

            <label>加入日期</label>

            <input
                id="memberEditJoinDate"
                value="${memberEsc(member.joinDate)}">

        </div>

        <div class="member-form-field">

            <label>累積消費</label>

            <input
                id="memberEditSpend"
                type="number"
                min="0"
                value="${Number(member.totalSpend || 0)}">

        </div>

        <div class="member-form-field">

            <label>累積點數</label>

            <input
                id="memberEditPoints"
                type="number"
                min="0"
                value="${Number(member.points || 0)}">

        </div>

        <div class="member-form-field member-note-field">

            <label>備註</label>

            <textarea id="memberEditNote">${memberEsc(member.note)}</textarea>

        </div>

    </div>

    <div class="member-editor-actions">

        <button
            class="member-cancel-btn"
            onclick="closeMemberEditor()">
            取消
        </button>

        <button
            class="member-save-btn"
            onclick="saveMemberEditor()">
            儲存會員
        </button>

    </div>

</div>

`;

}

function closeMemberEditor(){

    const box =
    document.getElementById(
        "memberEditorPanel"
    );

    if(box){

        box.style.display = "none";
        box.innerHTML = "";

    }

}

function saveMemberEditor(){

    playClick();

    const id =
    document.getElementById(
        "memberEditId"
    ).value;

    const name =
    document.getElementById(
        "memberEditName"
    ).value.trim();

    const phone =
    memberPhone(
        document.getElementById(
            "memberEditPhone"
        ).value
    );

    if(!name || !phone){

        alert(
            "❌ 姓名與手機不可空白"
        );

        return;

    }

    if(
        memberData.some(member=>
            member.phone === phone &&
            member.id !== id
        )
    ){

        alert(
            "❌ 此手機已經是會員"
        );

        return;

    }

    const values = {

        name,
        phone,

        birthday:
        document.getElementById(
            "memberEditBirthday"
        ).value,

        joinDate:
        document.getElementById(
            "memberEditJoinDate"
        ).value.trim() ||
        new Date().toLocaleDateString("zh-TW"),

        totalSpend:
        Math.max(
            0,
            Number(
                document.getElementById(
                    "memberEditSpend"
                ).value
            ) || 0
        ),

        points:
        Math.max(
            0,
            Number(
                document.getElementById(
                    "memberEditPoints"
                ).value
            ) || 0
        ),

        note:
        document.getElementById(
            "memberEditNote"
        ).value.trim()

    };

    if(id){

        Object.assign(
            memberData.find(member=>
                member.id === id
            ),
            values
        );

    }else{

        memberData.unshift({

            id:"member_" + Date.now(),

            memberNo:
            newMemberNo(),

            ...values,

            lastPurchaseDate:"",

            toyPoints:0,

            pointHistory:[],

            toyPointHistory:[]

        });

    }

    saveMembers();

    closeMemberEditor();

    renderMemberList();

    alert(
        "✅ 會員資料已儲存"
    );

}

function deleteMember(id){

    playClick();

    const member =
    memberData.find(item=>
        item.id === id
    );

    if(
        !member ||
        !confirm(
            `確定刪除會員「${member.name}」？`
        )
    ){

        return;

    }

    memberData =
    memberData.filter(item=>
        item.id !== id
    );

    if(currentMember?.id === id){

        currentMember = null;

    }

    saveMembers();

    renderMemberList();

    renderSelectedMember();

}

// =========================================
// 前台快速會員
// =========================================
function toggleMemberQuickPanel(){

    playClick();

    const panel =
    document.getElementById(
        "memberQuickPanel"
    );

    if(!panel) return;

    panel.style.display =
    panel.style.display === "block"
    ? "none"
    : "block";

    document
    .getElementById("memberQuickPhone")
    ?.focus();

}

function findMemberByPhone(phoneValue){

    const phone =
    memberPhone(phoneValue);

    return memberData.find(member=>
        member.phone === phone
    ) || null;

}

function searchQuickMember(){

    playClick();

    const phone =
    memberPhone(
        document.getElementById(
            "memberQuickPhone"
        )?.value
    );

    if(!phone){

        alert(
            "請先輸入手機"
        );

        return;

    }

    const member =
    findMemberByPhone(phone);

    if(member){

        currentMember = member;

        renderQuickResult();

        renderSelectedMember();

    }else{

        renderQuickJoin(phone);

    }

}

function renderQuickJoin(phone){

    const box =
    document.getElementById(
        "memberQuickResult"
    );

    if(!box) return;

    box.innerHTML = `

<div class="quick-join-card">

    <div class="quick-join-title">
        找不到會員，可快速加入
    </div>

    <input
        id="quickJoinName"
        placeholder="會員姓名">

    <input
        id="quickJoinBirthday"
        type="date">

    <textarea
        id="quickJoinNote"
        placeholder="備註（可不填）"></textarea>

    <button
        onclick="createQuickMember('${phone}')">
        加入會員並套用
    </button>

</div>

`;

}

function createQuickMember(phone){

    playClick();

    const name =
    document.getElementById(
        "quickJoinName"
    ).value.trim();

    if(!name){

        alert(
            "請輸入會員姓名"
        );

        return;

    }

    const member = {

        id:"member_" + Date.now(),

        memberNo:
        newMemberNo(),

        name,

        phone:
        memberPhone(phone),

        birthday:
        document.getElementById(
            "quickJoinBirthday"
        ).value,

        joinDate:
        new Date().toLocaleDateString("zh-TW"),

        totalSpend:0,

        points:0,

        note:
        document.getElementById(
            "quickJoinNote"
        ).value.trim(),

        lastPurchaseDate:"",

        toyPoints:0,

        pointHistory:[],

        toyPointHistory:[]

    };

    memberData.unshift(member);

    saveMembers();

    currentMember = member;

    renderQuickResult();

    renderSelectedMember();

    alert(
        "✅ 已加入會員"
    );

}

function renderQuickResult(){

    const box =
    document.getElementById(
        "memberQuickResult"
    );

    if(
        !box ||
        !currentMember
    ){

        return;

    }

    box.innerHTML = `

<div class="quick-member-found">

    <div>

        <strong>
            ${memberEsc(currentMember.name)}
        </strong>

        <span>
            ${memberEsc(currentMember.phone)}
        </span>

        <small>
            累積消費 NT$${memberMoney(currentMember.totalSpend)}
            ・消費 ${getMemberOrderCount(currentMember.id)} 次
        </small>

    </div>

    <button
        onclick="clearCurrentMember()">
        取消套用
    </button>

</div>

`;

}

function clearCurrentMember(){

    playClick();

    currentMember = null;

    const phone =
    document.getElementById(
        "memberQuickPhone"
    );

    const result =
    document.getElementById(
        "memberQuickResult"
    );

    if(phone){
        phone.value = "";
    }

    if(result){
        result.innerHTML = "";
    }

    renderSelectedMember();

}

function renderSelectedMember(){

    document
    .querySelectorAll(
        ".selected-member-display"
    )
    .forEach(element=>{

        if(currentMember){

            element.className =
            "selected-member-display active";

            element.innerHTML = `

<span>
    👤 ${memberEsc(currentMember.name)}
</span>

<strong>
    ${memberEsc(currentMember.phone)}
</strong>

<small>
    累積 NT$${memberMoney(currentMember.totalSpend)}
    ・${getMemberOrderCount(currentMember.id)} 次消費
</small>

`;

        }else{

            element.className =
            "selected-member-display";

            element.textContent =
            "目前為非會員交易";

        }

    });

}

function getCurrentMemberOrderInfo(){

    return currentMember
    ? {

        memberId:
        currentMember.id,

        memberNo:
        currentMember.memberNo,

        memberName:
        currentMember.name,

        memberPhone:
        currentMember.phone

    }
    : {

        memberId:"",
        memberNo:"",
        memberName:"",
        memberPhone:""

    };

}

function calculateConsumePoints(amount){

    return Math.floor(
        Number(amount || 0) /
        CONSUME_POINT_RATE
    );

}

function applyMemberPurchase(amount,order){

    if(!currentMember) return;

    const member =
    memberData.find(item=>
        item.id === currentMember.id
    );

    if(!member) return;

    const spend =
    Number(amount || 0);

    const earnedPoints =
    calculateConsumePoints(spend);

    member.totalSpend =
    Number(member.totalSpend || 0) +
    spend;

    member.points =
    Number(member.points || 0) +
    earnedPoints;

    member.lastPurchaseDate =
    new Date().toLocaleString("zh-TW");

    member.pointHistory.unshift({

        id:"point_" + Date.now(),

        date:
        new Date().toLocaleString("zh-TW"),

        amount:
        earnedPoints,

        reason:"消費累積",

        orderNo:
        order?.orderNo || "",

        balance:
        member.points

    });

    if(order){

        order.earnedPoints =
        earnedPoints;

        order.memberLevel =
        getMemberLevel(member).name;

        saveSalesHistory();

    }

    saveMembers();

}

function canRollbackMemberOrder(order){

    if(
        !order ||
        !order.memberId
    ){

        return true;

    }

    const member =
    memberData.find(item=>
        item.id === order.memberId
    );

    if(!member){

        return true;

    }

    const earnedPoints =
    Number(order.earnedPoints || 0);

    const toyPoints =
    Number(
        order.toyPointConversion?.points ||
        0
    );

    if(
        member.points < earnedPoints
    ){

        alert(
            "❌ 會員消費點數已被使用，無法直接作廢此訂單。請先由店長調整點數。"
        );

        return false;

    }

    if(
        member.toyPoints < toyPoints
    ){

        alert(
            "❌ 此訂單轉入的玩具點數已被使用，無法直接作廢。請先補足玩具點數。"
        );

        return false;

    }

    return true;

}

function rollbackMemberPurchase(order){

    if(
        !order ||
        !order.memberId
    ){

        return;

    }

    const member =
    memberData.find(item=>
        item.id === order.memberId
    );

    if(!member) return;

    const earnedPoints =
    Number(order.earnedPoints || 0);

    const toyPoints =
    Number(
        order.toyPointConversion?.points ||
        0
    );

    member.totalSpend =
    Math.max(
        0,
        Number(member.totalSpend || 0) -
        Number(order.amount || 0)
    );

    member.points =
    Math.max(
        0,
        Number(member.points || 0) -
        earnedPoints
    );

    member.toyPoints =
    Math.max(
        0,
        Number(member.toyPoints || 0) -
        toyPoints
    );

    if(earnedPoints > 0){

        member.pointHistory.unshift({

            id:"point_" + Date.now(),

            date:
            new Date().toLocaleString("zh-TW"),

            amount:
            -earnedPoints,

            reason:"訂單作廢扣回",

            orderNo:
            order.orderNo || "",

            balance:
            member.points

        });

    }

    if(toyPoints > 0){

        member.toyPointHistory.unshift({

            id:"toy_" + Date.now(),

            date:
            new Date().toLocaleString("zh-TW"),

            amount:
            -toyPoints,

            reason:"訂單作廢扣回",

            orderNo:
            order.orderNo || "",

            operator:
            currentUserRole === "staff"
            ? "員工"
            : "店長",

            balance:
            member.toyPoints

        });

    }

    saveMembers();

}

// =========================================
// 玩具點數手動調整
// =========================================
function adjustToyPoints(memberId){

    playClick();

    const member =
    memberData.find(item=>
        item.id === memberId
    );

    if(!member) return;

    const rawAmount =
    prompt(
        `目前玩具點數：${member.toyPoints} 點\n\n增加請輸入正數，兌換扣除請輸入負數：`
    );

    if(rawAmount === null) return;

    const amount =
    Number(rawAmount);

    if(
        !Number.isInteger(amount) ||
        amount === 0
    ){

        alert(
            "❌ 請輸入非 0 的整數點數"
        );

        return;

    }

    if(
        amount < 0 &&
        member.toyPoints < Math.abs(amount)
    ){

        alert(
            "❌ 玩具點數不足"
        );

        return;

    }

    const reason =
    prompt(
        amount > 0
        ? "請輸入增加點數原因："
        : "請輸入兌換獎品名稱或扣點原因："
    );

    if(
        reason === null ||
        !reason.trim()
    ){

        alert(
            "❌ 必須填寫原因"
        );

        return;

    }

    const note =
    prompt(
        "備註（可留空）："
    );

    const newBalance =
    Number(member.toyPoints || 0) +
    amount;

    if(
        !confirm(
            `會員：${member.name}\n目前：${member.toyPoints} 點\n本次：${amount > 0 ? "+" : ""}${amount} 點\n操作後：${newBalance} 點\n\n確定執行？`
        )
    ){

        return;

    }

    member.toyPoints =
    newBalance;

    member.toyPointHistory.unshift({

        id:"toy_" + Date.now(),

        date:
        new Date().toLocaleString("zh-TW"),

        amount,

        reason:
        reason.trim(),

        note:
        (note || "").trim(),

        orderNo:"",

        operator:
        currentUserRole === "staff"
        ? "員工"
        : "店長",

        balance:
        member.toyPoints

    });

    saveMembers();

    renderMemberList();

    if(
        currentMemberHistoryId ===
        member.id
    ){

        renderMemberHistory();

    }

    alert(
        "✅ 玩具點數已更新"
    );

}

// =========================================
// 訂單玩具轉點與離場補綁會員
// =========================================
function getOrderToyCounts(order){

    const result = {
        green:0,
        red:0
    };

    (
        Array.isArray(order?.items)
        ? order.items
        : []
    ).forEach(item=>{

        if(item.toy === "green"){
            result.green++;
        }

        if(item.toy === "red"){
            result.red++;
        }

    });

    return result;

}

function renderToyPointOrderPanel(orderNo){

    const panel =
    document.getElementById(
        "toyPointOrderPanel"
    );

    if(!panel) return;

    const order =
    salesHistory.find(item=>
        item.orderNo === orderNo
    );

    if(!order){

        panel.innerHTML = "";
        return;

    }

    const counts =
    getOrderToyCounts(order);

    const converted =
    order.toyPointConversion || {

        greenQty:0,
        redQty:0,
        points:0

    };

    const greenRemaining =
    Math.max(
        0,
        counts.green -
        Number(converted.greenQty || 0)
    );

    const redRemaining =
    Math.max(
        0,
        counts.red -
        Number(converted.redQty || 0)
    );

    if(
        counts.green === 0 &&
        counts.red === 0
    ){

        panel.innerHTML = `

<div class="toy-order-card disabled">
    此訂單沒有贈送玩具
</div>

`;

        return;

    }

    if(order.status === "cancel"){

        panel.innerHTML = `

<div class="toy-order-card disabled">
    已作廢訂單不可轉換玩具點數
</div>

`;

        return;

    }

    if(!order.memberId){

        panel.innerHTML = `

<div class="toy-order-card">

    <div class="toy-order-title">
        🎁 離場補綁會員＋玩具轉點
    </div>

    <div class="toy-order-description">
        此訂單購票時未綁會員。輸入手機後，可綁定現有會員；找不到時可快速建立。
    </div>

    <div class="toy-order-bind-row">

        <input
            id="lateBindPhone"
            inputmode="tel"
            placeholder="輸入會員手機">

        <button
            onclick="lateBindOrderMember('${orderNo}')">
            搜尋／建立會員
        </button>

    </div>

</div>

`;

        return;

    }

    const member =
    memberData.find(item=>
        item.id === order.memberId
    );

    panel.innerHTML = `

<div class="toy-order-card">

    <div class="toy-order-title">
        🎁 玩具轉點
    </div>

    <div class="toy-order-member">
        會員：${memberEsc(order.memberName || member?.name || "")}
        ・玩具點數 ${Number(member?.toyPoints || 0)} 點
    </div>

    <div class="toy-order-rate">
        綠標 1 個 = ${TOY_POINT_GREEN} 點　
        紅標 1 個 = ${TOY_POINT_RED} 點
    </div>

    <div class="toy-order-grid">

        <label>

            <span>
                🟢 綠標可轉 ${greenRemaining} 個
            </span>

            <input
                id="convertGreenQty"
                type="number"
                min="0"
                max="${greenRemaining}"
                value="0"
                ${greenRemaining === 0 ? "disabled" : ""}>

        </label>

        <label>

            <span>
                🔴 紅標可轉 ${redRemaining} 個
            </span>

            <input
                id="convertRedQty"
                type="number"
                min="0"
                max="${redRemaining}"
                value="0"
                ${redRemaining === 0 ? "disabled" : ""}>

        </label>

    </div>

    ${
        converted.points > 0
        ? `
        <div class="toy-order-converted">
            此訂單已累積 ${converted.points} 玩具點
        </div>
        `
        : ""
    }

    ${
        greenRemaining > 0 ||
        redRemaining > 0
        ? `
        <button
            class="toy-order-convert-btn"
            onclick="convertOrderToysToPoints('${orderNo}')">
            確認放棄玩具並累積點數
        </button>
        `
        : `
        <div class="toy-order-complete">
            此訂單玩具已全部處理完成
        </div>
        `
    }

</div>

`;

}

function lateBindOrderMember(orderNo){

    playClick();

    const phoneInput =
    document.getElementById(
        "lateBindPhone"
    );

    const phone =
    memberPhone(
        phoneInput?.value
    );

    if(!phone){

        alert(
            "請輸入手機"
        );

        return;

    }

    let member =
    findMemberByPhone(phone);

    if(!member){

        if(
            !confirm(
                "此手機尚未加入會員，是否快速建立？"
            )
        ){

            return;

        }

        const name =
        prompt(
            "請輸入會員姓名："
        );

        if(
            name === null ||
            !name.trim()
        ){

            alert(
                "❌ 姓名不可空白"
            );

            return;

        }

        const birthday =
        prompt(
            "生日（可留空，例如 2020-05-10）："
        );

        member = {

            id:"member_" + Date.now(),

            memberNo:
            newMemberNo(),

            name:
            name.trim(),

            phone,

            birthday:
            (birthday || "").trim(),

            joinDate:
            new Date().toLocaleDateString("zh-TW"),

            totalSpend:0,

            points:0,

            toyPoints:0,

            note:"離場玩具轉點快速入會",

            lastPurchaseDate:"",

            pointHistory:[],

            toyPointHistory:[]

        };

        memberData.unshift(member);

        saveMembers();

    }

    const order =
    salesHistory.find(item=>
        item.orderNo === orderNo
    );

    if(!order) return;

    order.memberId =
    member.id;

    order.memberNo =
    member.memberNo;

    order.memberName =
    member.name;

    order.memberPhone =
    member.phone;

    order.memberBoundAt =
    new Date().toLocaleString("zh-TW");

    order.memberBoundType =
    "late-toy-only";

    saveSalesHistory();

    renderToyPointOrderPanel(orderNo);

    alert(
        "✅ 訂單已補綁會員\n此筆只可累積玩具點數，不補發消費點數與累積消費。"
    );

}

function convertOrderToysToPoints(orderNo){

    playClick();

    const order =
    salesHistory.find(item=>
        item.orderNo === orderNo
    );

    if(
        !order ||
        !order.memberId ||
        order.status === "cancel"
    ){

        return;

    }

    const member =
    memberData.find(item=>
        item.id === order.memberId
    );

    if(!member){

        alert(
            "❌ 找不到會員資料"
        );

        return;

    }

    const counts =
    getOrderToyCounts(order);

    const converted =
    order.toyPointConversion || {

        greenQty:0,
        redQty:0,
        points:0

    };

    const greenRemaining =
    Math.max(
        0,
        counts.green -
        Number(converted.greenQty || 0)
    );

    const redRemaining =
    Math.max(
        0,
        counts.red -
        Number(converted.redQty || 0)
    );

    const greenQty =
    Math.max(
        0,
        Number(
            document.getElementById(
                "convertGreenQty"
            )?.value || 0
        )
    );

    const redQty =
    Math.max(
        0,
        Number(
            document.getElementById(
                "convertRedQty"
            )?.value || 0
        )
    );

    if(
        !Number.isInteger(greenQty) ||
        !Number.isInteger(redQty) ||
        greenQty > greenRemaining ||
        redQty > redRemaining
    ){

        alert(
            "❌ 玩具數量不正確"
        );

        return;

    }

    const points =
    greenQty * TOY_POINT_GREEN +
    redQty * TOY_POINT_RED;

    if(points <= 0){

        alert(
            "請選擇要放棄的玩具數量"
        );

        return;

    }

    if(
        !confirm(
            `放棄綠標 ${greenQty} 個、紅標 ${redQty} 個\n本次增加 ${points} 玩具點\n\n確認後不可再次領取這些玩具，確定繼續？`
        )
    ){

        return;

    }

    member.toyPoints =
    Number(member.toyPoints || 0) +
    points;

    member.toyPointHistory.unshift({

        id:"toy_" + Date.now(),

        date:
        new Date().toLocaleString("zh-TW"),

        amount:
        points,

        reason:"放棄票券贈送玩具",

        note:
        `綠標 ${greenQty} 個、紅標 ${redQty} 個`,

        orderNo:
        order.orderNo || "",

        operator:
        currentUserRole === "staff"
        ? "員工"
        : "店長",

        balance:
        member.toyPoints

    });

    order.toyPointConversion = {

        greenQty:
        Number(converted.greenQty || 0) +
        greenQty,

        redQty:
        Number(converted.redQty || 0) +
        redQty,

        points:
        Number(converted.points || 0) +
        points,

        memberId:
        member.id,

        convertedAt:
        new Date().toLocaleString("zh-TW"),

        operator:
        currentUserRole === "staff"
        ? "員工"
        : "店長"

    };

    saveMembers();

    saveSalesHistory();

    renderToyPointOrderPanel(orderNo);

    alert(
        `✅ 已增加 ${points} 玩具點\n目前餘額：${member.toyPoints} 點`
    );

}

function resetCurrentMemberSelection(){

    currentMember = null;

    const panel =
    document.getElementById(
        "memberQuickPanel"
    );

    const phone =
    document.getElementById(
        "memberQuickPhone"
    );

    const result =
    document.getElementById(
        "memberQuickResult"
    );

    if(panel){
        panel.style.display = "none";
    }

    if(phone){
        phone.value = "";
    }

    if(result){
        result.innerHTML = "";
    }

    renderSelectedMember();

}

// =========================================
// 會員匯出／匯入
// =========================================
function exportMemberData(){

    playClick();

    const data = {

        app:"小怪獸售票機",

        version:"V6.4C",

        exportedAt:
        new Date().toISOString(),

        members:
        memberData

    };

    downloadTextFile(
        `monster-members-${Date.now()}.json`,
        JSON.stringify(data,null,2),
        "application/json;charset=utf-8"
    );

}

function chooseMemberImportFile(){

    playClick();

    const input =
    document.getElementById(
        "memberImportInput"
    );

    if(input){

        input.value = "";
        input.click();

    }

}

async function importMemberFile(file){

    if(!file) return;

    try{

        const data =
        JSON.parse(
            await file.text()
        );

        if(
            !Array.isArray(
                data.members
            )
        ){

            throw new Error();

        }

        if(
            !confirm(
                `即將匯入 ${data.members.length} 筆會員資料，確定繼續？`
            )
        ){

            return;

        }

        memberData =
        data.members;

        saveMembers();

        renderMemberList();

        alert(
            "✅ 會員資料已匯入"
        );

    }catch(error){

        alert(
            "❌ 會員資料匯入失敗"
        );

    }

}

document
.getElementById("memberImportInput")
?.addEventListener(
    "change",
    event=>
        importMemberFile(
            event.target.files[0]
        )
);

renderSelectedMember();
