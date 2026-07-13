// =========================================
// 小怪獸售票機 V6.4C
// 會員完整整合
// =========================================

const MEMBER_KEY = "memberData";

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
            <span>累積點數</span>
            <strong>${Number(member.points || 0)} 點</strong>
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
            class="member-history-btn"
            onclick="openMemberHistory('${member.id}')">
            消費紀錄
        </button>

        <button
            class="member-edit-btn"
            onclick="openMemberEditor('${member.id}')">
            編輯
        </button>

        <button
            class="member-delete-btn"
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
            <span>累積點數</span>
            <strong>${Number(member.points || 0)} 點</strong>
        </div>

    </div>

</div>

<div class="member-history-list">
    ${orderHtml}
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

            lastPurchaseDate:""

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

        lastPurchaseDate:""

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

function applyMemberPurchase(amount){

    if(!currentMember) return;

    const member =
    memberData.find(item=>
        item.id === currentMember.id
    );

    if(!member) return;

    member.totalSpend =
    Number(member.totalSpend || 0) +
    Number(amount || 0);

    member.lastPurchaseDate =
    new Date().toLocaleString("zh-TW");

    saveMembers();

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

    member.totalSpend =
    Math.max(
        0,
        Number(member.totalSpend || 0) -
        Number(order.amount || 0)
    );

    saveMembers();

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
