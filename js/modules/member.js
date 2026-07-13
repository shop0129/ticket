// =========================================
// 小怪獸售票機 V6.4A 會員系統
// =========================================
const MEMBER_KEY="memberData";
let memberData=loadMembers();
let currentMember=null;

function loadMembers(){
    try{
        const data=JSON.parse(localStorage.getItem(MEMBER_KEY)||"[]");
        return Array.isArray(data)?data:[];
    }catch(e){
        console.error(e);
        return [];
    }
}
function saveMembers(){localStorage.setItem(MEMBER_KEY,JSON.stringify(memberData));}
function memberPhone(v){return String(v||"").replace(/\D/g,"");}
function memberEsc(v){return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
function memberMoney(v){return Number(v||0).toLocaleString("zh-TW");}
function newMemberNo(){return "M"+Date.now();}

function openMemberManager(){renderMemberList();closeMemberEditor();showPage("memberManagerPage");}
function renderMemberList(){
    const box=document.getElementById("memberManagerList");
    if(!box)return;
    const q=(document.getElementById("memberSearchInput")?.value||"").trim().toLowerCase();
    const rows=memberData.filter(m=>!q||[m.memberNo,m.name,m.phone,m.birthday,m.note].join(" ").toLowerCase().includes(q));
    if(!rows.length){box.innerHTML='<div class="member-empty-card"><div class="member-empty-icon">👤</div><div class="member-empty-title">找不到會員</div><div class="member-empty-text">可新增會員或調整搜尋條件</div></div>';return;}
    box.innerHTML=rows.map(m=>`<div class="member-card"><div class="member-card-header"><div><div class="member-card-name">${memberEsc(m.name)}</div><div class="member-card-number">${memberEsc(m.memberNo)}</div></div><div class="member-card-phone">📱 ${memberEsc(m.phone)}</div></div><div class="member-card-grid"><div><span>生日</span><strong>${m.birthday||"未填寫"}</strong></div><div><span>加入日期</span><strong>${m.joinDate||""}</strong></div><div><span>累積消費</span><strong>NT$${memberMoney(m.totalSpend)}</strong></div><div><span>累積點數</span><strong>${Number(m.points||0)} 點</strong></div></div>${m.note?`<div class="member-card-note">備註：${memberEsc(m.note)}</div>`:""}<div class="member-card-actions"><button class="member-edit-btn" onclick="openMemberEditor('${m.id}')">編輯</button><button class="member-delete-btn" onclick="deleteMember('${m.id}')">刪除</button></div></div>`).join("");
}

document.getElementById("memberSearchInput")?.addEventListener("input",renderMemberList);

function openMemberEditor(id=""){
    playClick();
    const box=document.getElementById("memberEditorPanel"); if(!box)return;
    const m=memberData.find(x=>x.id===id)||{id:"",name:"",phone:"",birthday:"",joinDate:new Date().toLocaleDateString("zh-TW"),totalSpend:0,points:0,note:""};
    box.style.display="block";
    box.innerHTML=`<div class="member-editor-card"><div class="member-editor-title">${m.id?"編輯會員":"新增會員"}</div><input type="hidden" id="memberEditId" value="${memberEsc(m.id)}"><div class="member-editor-grid"><div class="member-form-field"><label>姓名 *</label><input id="memberEditName" value="${memberEsc(m.name)}"></div><div class="member-form-field"><label>手機 *</label><input id="memberEditPhone" inputmode="tel" value="${memberEsc(m.phone)}"></div><div class="member-form-field"><label>生日</label><input id="memberEditBirthday" type="date" value="${memberEsc(m.birthday)}"></div><div class="member-form-field"><label>加入日期</label><input id="memberEditJoinDate" value="${memberEsc(m.joinDate)}"></div><div class="member-form-field"><label>累積消費</label><input id="memberEditSpend" type="number" min="0" value="${Number(m.totalSpend||0)}"></div><div class="member-form-field"><label>累積點數</label><input id="memberEditPoints" type="number" min="0" value="${Number(m.points||0)}"></div><div class="member-form-field member-note-field"><label>備註</label><textarea id="memberEditNote">${memberEsc(m.note)}</textarea></div></div><div class="member-editor-actions"><button class="member-cancel-btn" onclick="closeMemberEditor()">取消</button><button class="member-save-btn" onclick="saveMemberEditor()">儲存會員</button></div></div>`;
}
function closeMemberEditor(){const box=document.getElementById("memberEditorPanel");if(box){box.style.display="none";box.innerHTML="";}}
function saveMemberEditor(){
    playClick();
    const id=document.getElementById("memberEditId").value;
    const name=document.getElementById("memberEditName").value.trim();
    const phone=memberPhone(document.getElementById("memberEditPhone").value);
    if(!name||!phone){alert("❌ 姓名與手機不可空白");return;}
    if(memberData.some(m=>m.phone===phone&&m.id!==id)){alert("❌ 此手機已經是會員");return;}
    const values={name,phone,birthday:document.getElementById("memberEditBirthday").value,joinDate:document.getElementById("memberEditJoinDate").value.trim()||new Date().toLocaleDateString("zh-TW"),totalSpend:Math.max(0,Number(document.getElementById("memberEditSpend").value)||0),points:Math.max(0,Number(document.getElementById("memberEditPoints").value)||0),note:document.getElementById("memberEditNote").value.trim()};
    if(id){Object.assign(memberData.find(m=>m.id===id),values);}else{memberData.unshift({id:"member_"+Date.now(),memberNo:newMemberNo(),...values,lastPurchaseDate:""});}
    saveMembers();closeMemberEditor();renderMemberList();alert("✅ 會員資料已儲存");
}
function deleteMember(id){playClick();const m=memberData.find(x=>x.id===id);if(!m||!confirm(`確定刪除會員「${m.name}」？`))return;memberData=memberData.filter(x=>x.id!==id);if(currentMember?.id===id)currentMember=null;saveMembers();renderMemberList();renderSelectedMember();}

function toggleMemberQuickPanel(){playClick();const p=document.getElementById("memberQuickPanel");if(!p)return;p.style.display=p.style.display==="block"?"none":"block";document.getElementById("memberQuickPhone")?.focus();}
function findMemberByPhone(p){const phone=memberPhone(p);return memberData.find(m=>m.phone===phone)||null;}
function searchQuickMember(){playClick();const phone=memberPhone(document.getElementById("memberQuickPhone")?.value);if(!phone){alert("請先輸入手機");return;}const m=findMemberByPhone(phone);if(m){currentMember=m;renderQuickResult();renderSelectedMember();}else{renderQuickJoin(phone);}}
function renderQuickJoin(phone){const box=document.getElementById("memberQuickResult");if(!box)return;box.innerHTML=`<div class="quick-join-card"><div class="quick-join-title">找不到會員，可快速加入</div><input id="quickJoinName" placeholder="會員姓名"><input id="quickJoinBirthday" type="date"><textarea id="quickJoinNote" placeholder="備註（可不填）"></textarea><button onclick="createQuickMember('${phone}')">加入會員並套用</button></div>`;}
function createQuickMember(phone){playClick();const name=document.getElementById("quickJoinName").value.trim();if(!name){alert("請輸入會員姓名");return;}const m={id:"member_"+Date.now(),memberNo:newMemberNo(),name,phone:memberPhone(phone),birthday:document.getElementById("quickJoinBirthday").value,joinDate:new Date().toLocaleDateString("zh-TW"),totalSpend:0,points:0,note:document.getElementById("quickJoinNote").value.trim(),lastPurchaseDate:""};memberData.unshift(m);saveMembers();currentMember=m;renderQuickResult();renderSelectedMember();alert("✅ 已加入會員");}
function renderQuickResult(){const box=document.getElementById("memberQuickResult");if(!box||!currentMember)return;box.innerHTML=`<div class="quick-member-found"><div><strong>${memberEsc(currentMember.name)}</strong><span>${memberEsc(currentMember.phone)}</span></div><button onclick="clearCurrentMember()">取消套用</button></div>`;}
function clearCurrentMember(){playClick();currentMember=null;document.getElementById("memberQuickPhone")&&(document.getElementById("memberQuickPhone").value="");document.getElementById("memberQuickResult")&&(document.getElementById("memberQuickResult").innerHTML="");renderSelectedMember();}
function renderSelectedMember(){document.querySelectorAll(".selected-member-display").forEach(el=>{if(currentMember){el.className="selected-member-display active";el.innerHTML=`<span>👤 ${memberEsc(currentMember.name)}</span><strong>${memberEsc(currentMember.phone)}</strong>`;}else{el.className="selected-member-display";el.textContent="目前為非會員交易";}});}
function getCurrentMemberOrderInfo(){return currentMember?{memberId:currentMember.id,memberNo:currentMember.memberNo,memberName:currentMember.name,memberPhone:currentMember.phone}:{memberId:"",memberNo:"",memberName:"",memberPhone:""};}
function applyMemberPurchase(amount){if(!currentMember)return;const m=memberData.find(x=>x.id===currentMember.id);if(!m)return;m.totalSpend=Number(m.totalSpend||0)+Number(amount||0);m.lastPurchaseDate=new Date().toLocaleString("zh-TW");saveMembers();}
function resetCurrentMemberSelection(){currentMember=null;const p=document.getElementById("memberQuickPanel");if(p)p.style.display="none";const i=document.getElementById("memberQuickPhone");if(i)i.value="";const r=document.getElementById("memberQuickResult");if(r)r.innerHTML="";renderSelectedMember();}

function exportMemberData(){playClick();const data={app:"小怪獸售票機",version:"V6.4A",exportedAt:new Date().toISOString(),members:memberData};downloadTextFile(`monster-members-${Date.now()}.json`,JSON.stringify(data,null,2),"application/json;charset=utf-8");}
function chooseMemberImportFile(){playClick();const i=document.getElementById("memberImportInput");if(i){i.value="";i.click();}}
async function importMemberFile(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.members))throw new Error();if(!confirm(`即將匯入 ${data.members.length} 筆會員資料，確定繼續？`))return;memberData=data.members;saveMembers();renderMemberList();alert("✅ 會員資料已匯入");}catch(e){alert("❌ 會員資料匯入失敗");}}
document.getElementById("memberImportInput")?.addEventListener("change",e=>importMemberFile(e.target.files[0]));
renderSelectedMember();
