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
  function resetAdjustButton(button){
    if(button){button.disabled=false;button.textContent="確認調整";}
  }
  function adjust(){
    if(!manager()||!selected)return;
    var amount=Math.trunc(n(byId("cpAdjustAmount").value,0));
    var reason=(byId("cpAdjustReason").value||"").trim();
    var note=(byId("cpAdjustNote").value||"").trim();
    if(!amount){alert("請輸入非 0 整數");return;}
    if(!reason){alert("請填寫調整原因");return;}
    if(n(selected.points,0)+amount<0){alert("會員點數不足");return;}
    if(!(window.firebase&&firebase.database)){alert("無法連接資料庫，請檢查網路");return;}

    var button=byId("cpAdjustSave");
    if(button&&button.disabled)return;
    if(button){button.disabled=true;button.textContent="調整中…";}

    var memberId=selected.id;
    var memberName=selected.name||"";
    var rowId="point_"+Date.now()+"_"+Math.floor(Math.random()*10000);
    var memberRef=firebase.database().ref(root+"/members/"+memberId);

    // 只把 Firebase transaction 本身視為成敗依據。
    // 成功後的畫面重繪、提示、稽核若有任何例外，都不能反過來顯示「調整失敗」。
    memberRef.transaction(function(current){
      if(!current)return current;
      var currentPoints=n(current.points,0);
      var next=currentPoints+amount;
      if(next<0)return;
      var row={id:rowId,date:new Date().toLocaleString("zh-TW"),amount:amount,reason:reason,note:note,operator:actor(),balance:next};
      current.points=next;
      current.pointHistory=Array.isArray(current.pointHistory)?current.pointHistory:[];
      current.pointHistory.unshift(row);
      current.updatedAt=Date.now();
      current.updatedBy=actor();
      return current;
    }).then(function(result){
      if(!result||!result.committed){
        var notCommitted=new Error("POINT_TRANSACTION_NOT_COMMITTED");
        notCommitted.code="POINT_TRANSACTION_NOT_COMMITTED";
        throw notCommitted;
      }

      var saved=(result.snapshot&&result.snapshot.val)?(result.snapshot.val()||{}):{};
      saved.id=saved.id||memberId;
      members[memberId]=saved;
      selected=saved;

      // 交易已成功，先立刻告知成功；後面的 UI 更新全部採容錯處理。
      toast("✅ 點數已調整");

      try{ if(byId("cpAdjustAmount"))byId("cpAdjustAmount").value=""; }catch(e){console.warn(e);}
      try{ if(byId("cpAdjustReason"))byId("cpAdjustReason").value=""; }catch(e){console.warn(e);}
      try{ if(byId("cpAdjustNote"))byId("cpAdjustNote").value=""; }catch(e){console.warn(e);}
      try{ select(memberId); }catch(e){ console.warn("Point UI refresh failed",e); }

      try{
        if(window.MonsterAuth&&typeof MonsterAuth.audit==="function"){
          var auditResult=MonsterAuth.audit("member.points.adjust","會員 "+memberName+" 消費點數 "+(amount>0?"+":"")+amount,{source:"staff",targetType:"member",targetId:memberId});
          if(auditResult&&typeof auditResult.catch==="function")auditResult.catch(function(e){console.warn("Point audit failed",e);});
        }
      }catch(e){console.warn("Point audit failed",e);}
    },function(error){
      console.error("Point transaction failed",error);
      alert(error&&(error.code==="POINT_TRANSACTION_NOT_COMMITTED"||error.message==="POINT_TRANSACTION_NOT_COMMITTED")?"調整未完成，請重新讀取會員資料後再試":"調整失敗，請檢查網路");
    }).then(function(){
      resetAdjustButton(button);
    },function(error){
      // 防止成功後的非必要 UI 程式錯誤造成按鈕永久鎖住；不再誤報網路失敗。
      console.warn("Point adjustment post-process warning",error);
      resetAdjustButton(button);
    });
  }
  document.addEventListener("DOMContentLoaded",inject);
})();
