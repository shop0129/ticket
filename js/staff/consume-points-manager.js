// V7.4.8 店長消費點數管理
(function(){
  "use strict";
  var root="monsterTicket/v1", selected=null, members={};
  function byId(id){return document.getElementById(id);} function n(v,f){v=Number(v);return isFinite(v)?v:f;}
  function manager(){
    try{
      var role="";
      if(window.MonsterRole&&MonsterRole.getCurrentRole) role=String(MonsterRole.getCurrentRole()||"").toLowerCase();
      if(!role&&window.MonsterAuth&&MonsterAuth.getActor) role=String((MonsterAuth.getActor("staff")||{}).role||"").toLowerCase();
      if(!role) role=String(window.currentUserRole||"").toLowerCase();
      return role==="admin"||role==="manager"||role==="店長";
    }catch(e){return false;}
  }
  function actor(){ try{return MonsterAuth.getActor("staff").name||"店長";}catch(e){return "店長";} }
  function toast(t){ if(window.enterpriseToast) enterpriseToast(t); else alert(t); }
  function settings(){ try{return Object.assign({earnAmount:100,earnPoints:1,pointValue:1,maxPercent:50,enabled:true},JSON.parse(localStorage.getItem("consumePointSettings")||"{}"));}catch(e){return {earnAmount:100,earnPoints:1,pointValue:1,maxPercent:50,enabled:true};} }
  function inject(){
    var area=document.querySelector(".enterprise-period"); if(area&&!byId("consumePointManageBtn")){ var b=document.createElement("button");b.id="consumePointManageBtn";b.textContent="⭐ 消費點數";b.onclick=open;area.appendChild(b); }
    var d=document.createElement("div"); d.id="consumePointManagerModal"; d.className="staff-modal consume-point-manager-modal"; d.style.display="none";
    d.innerHTML='<div class="staff-modal-card consume-manager-card"><div class="staff-modal-header"><div class="staff-modal-title">⭐ 消費點數管理</div><button id="consumePointClose" class="staff-modal-close">×</button></div><div class="consume-manager-section"><h3>點數規則</h3><label class="consume-enable"><input id="cpEnabled" type="checkbox"> 啟用消費點數</label><div class="consume-settings-grid"><label>每消費金額<input id="cpEarnAmount" type="number" min="1"></label><label>可獲得點數<input id="cpEarnPoints" type="number" min="1"></label><label>每 1 點折抵<input id="cpPointValue" type="number" min="0.01" step="0.01"></label><label>單筆最高折抵比例<input id="cpMaxPercent" type="number" min="0" max="100"></label></div><button id="cpSaveSettings" class="staff-primary-button">儲存點數規則</button></div><div class="consume-manager-section"><h3>會員點數調整</h3><div class="consume-search-row"><input id="cpMemberSearch" placeholder="輸入手機、姓名或會員編號"><button id="cpSearchBtn">搜尋</button></div><div id="cpSearchResults"></div><div id="cpAdjustPanel" style="display:none"><div id="cpSelectedMember" class="cp-selected"></div><div class="consume-settings-grid"><label>調整點數（增加正數／扣除負數）<input id="cpAdjustAmount" type="number"></label><label>原因<input id="cpAdjustReason" placeholder="必填"></label></div><textarea id="cpAdjustNote" placeholder="備註（選填）"></textarea><button id="cpAdjustSave" class="staff-success-button">確認調整</button><div id="cpPointHistory" class="cp-history"></div></div></div></div>';
    document.body.appendChild(d);
    byId("consumePointClose").onclick=close; byId("cpSaveSettings").onclick=saveSettings; byId("cpSearchBtn").onclick=search; byId("cpAdjustSave").onclick=adjust;
  }
  function open(){ if(!manager()){alert("❌ 只有店長可以管理消費點數");return;} if(!byId("consumePointManagerModal")){inject();} var s=settings(); byId("cpEnabled").checked=!!s.enabled;byId("cpEarnAmount").value=s.earnAmount;byId("cpEarnPoints").value=s.earnPoints;byId("cpPointValue").value=s.pointValue;byId("cpMaxPercent").value=s.maxPercent;byId("consumePointManagerModal").style.display="flex"; loadMembers(); }
  function close(){byId("consumePointManagerModal").style.display="none";}
  function saveSettings(){
    if(!manager())return; var s={enabled:byId("cpEnabled").checked,earnAmount:Math.max(1,n(byId("cpEarnAmount").value,100)),earnPoints:Math.max(1,Math.floor(n(byId("cpEarnPoints").value,1))),pointValue:Math.max(.01,n(byId("cpPointValue").value,1)),maxPercent:Math.max(0,Math.min(100,n(byId("cpMaxPercent").value,50))),updatedAt:Date.now(),updatedBy:actor()};
    localStorage.setItem("consumePointSettings",JSON.stringify(s));
    if(window.firebase&&firebase.database){ firebase.database().ref(root+"/settings/consumePoints").set(s).then(function(){toast("✅ 點數規則已同步");}).catch(function(){toast("⚠️ 已儲存在本機，雲端同步失敗");}); } else toast("✅ 點數規則已儲存");
  }
  function loadMembers(){ if(window.STAFF_CONFIG&&STAFF_CONFIG.firebaseRoot)root=STAFF_CONFIG.firebaseRoot; if(window.firebase&&firebase.database){firebase.database().ref(root+"/members").once("value").then(function(s){members=s.val()||{};});} }
  function search(){ var q=(byId("cpMemberSearch").value||"").trim().toLowerCase(); var list=Object.keys(members).map(function(k){var m=members[k]||{};m.id=m.id||k;return m;}).filter(function(m){return !m.deleted&&(!q||String(m.name||"").toLowerCase().indexOf(q)>=0||String(m.phone||"").indexOf(q)>=0||String(m.memberNo||"").toLowerCase().indexOf(q)>=0);}).slice(0,20); byId("cpSearchResults").innerHTML=list.length?list.map(function(m){return '<button class="cp-member-result" data-id="'+m.id+'"><b>'+esc(m.name||"未命名")+'</b><span>'+esc(m.phone||"")+' · '+n(m.points,0)+' 點</span></button>';}).join(""):"<p>查無會員</p>"; byId("cpSearchResults").querySelectorAll("button").forEach(function(b){b.onclick=function(){select(b.dataset.id);};}); }
  function esc(s){return String(s).replace(/[&<>\"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function select(id){selected=members[id]; if(!selected)return; selected.id=selected.id||id; byId("cpAdjustPanel").style.display="block";byId("cpSelectedMember").innerHTML='<b>'+esc(selected.name||"")+'</b><span>目前 '+n(selected.points,0)+' 點</span>'; renderHistory();}
  function renderHistory(){var h=(selected.pointHistory||[]).slice(0,20);byId("cpPointHistory").innerHTML='<h4>最近點數紀錄</h4>'+(h.length?h.map(function(x){return '<div><span>'+esc(x.date||"")+'<br>'+esc(x.reason||"")+'</span><b class="'+(n(x.amount,0)>=0?'plus':'minus')+'">'+(n(x.amount,0)>=0?'+':'')+n(x.amount,0)+' 點</b></div>';}).join(""):"<p>尚無紀錄</p>");}
  function adjust(){ if(!manager()||!selected)return; var amount=Math.trunc(n(byId("cpAdjustAmount").value,0)),reason=(byId("cpAdjustReason").value||"").trim(); if(!amount){alert("請輸入非 0 整數");return;} if(!reason){alert("請填寫調整原因");return;} if(n(selected.points,0)+amount<0){alert("會員點數不足");return;} var next=n(selected.points,0)+amount, row={id:"point_"+Date.now(),date:new Date().toLocaleString("zh-TW"),amount:amount,reason:reason,note:(byId("cpAdjustNote").value||"").trim(),operator:actor(),balance:next}; selected.points=next;selected.pointHistory=selected.pointHistory||[];selected.pointHistory.unshift(row);selected.updatedAt=Date.now();selected.updatedBy=actor(); firebase.database().ref(root+"/members/"+selected.id).set(selected).then(function(){ if(window.MonsterAuth)MonsterAuth.audit("member.points.adjust","會員 "+selected.name+" 消費點數 "+(amount>0?"+":"")+amount,{source:"staff",targetType:"member",targetId:selected.id}); byId("cpAdjustAmount").value="";byId("cpAdjustReason").value="";byId("cpAdjustNote").value="";members[selected.id]=selected;select(selected.id);toast("✅ 點數已調整"); }).catch(function(){alert("調整失敗，請檢查網路");}); }
  document.addEventListener("DOMContentLoaded",inject);
})();
