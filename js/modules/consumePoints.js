// V7.8.3.3 FIX27B 消費點數：每 10 點折抵 NT$10
(function(){
  "use strict";
  var KEY = "consumePointSettings";
  var REDEEM_STEP = 10;
  var REDEEM_VALUE = 10;
  var redemption = { points:0, discount:0 };
  var defaults = { earnAmount:100, earnPoints:1, pointValue:1, redeemStep:REDEEM_STEP, redeemValue:REDEEM_VALUE, maxPercent:50, enabled:true };

  function num(v,f){ v=Number(v); return isFinite(v)?v:f; }
  function normalizeSettings(value){
    var normalized=Object.assign({},defaults,value||{});
    // FIX27B：折抵固定為 10 點折 10 元，舊本機或雲端設定不可改回逐點折抵。
    normalized.pointValue=1;
    normalized.redeemStep=REDEEM_STEP;
    normalized.redeemValue=REDEEM_VALUE;
    return normalized;
  }
  function load(){
    try { return normalizeSettings(JSON.parse(localStorage.getItem(KEY)||"{}")); }
    catch(e){ return normalizeSettings(); }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(normalizeSettings(s))); }
  function settings(){ return load(); }
  function earn(amount){ var s=load(); if(!s.enabled) return 0; return Math.floor(num(amount,0)/Math.max(1,num(s.earnAmount,100))) * Math.max(1,num(s.earnPoints,1)); }
  function maxRedeem(amount, member){
    var s=load();
    var byOrder=Math.floor(num(amount,0)*Math.max(0,Math.min(100,num(s.maxPercent,50)))/100);
    var byOrderStep=Math.floor(byOrder/REDEEM_VALUE)*REDEEM_VALUE;
    var balancePoints=Math.max(0,Math.floor(num(member&&member.points,0)));
    var byBalance=Math.floor(balancePoints/REDEEM_STEP)*REDEEM_VALUE;
    return Math.max(0,Math.min(byOrderStep,byBalance));
  }
  function calc(points, amount, member){
    if(!load().enabled)return {points:0,discount:0};
    points=Math.max(0,Math.floor(num(points,0)));
    points=Math.floor(points/REDEEM_STEP)*REDEEM_STEP;
    var maxByBalance=Math.floor(Math.max(0,num(member&&member.points,0))/REDEEM_STEP)*REDEEM_STEP;
    points=Math.min(points,maxByBalance);
    var cap=maxRedeem(amount,member);
    var maxPointsByCap=Math.floor(cap/REDEEM_VALUE)*REDEEM_STEP;
    points=Math.min(points,maxPointsByCap);
    var discount=Math.floor(points/REDEEM_STEP)*REDEEM_VALUE;
    return {points:points,discount:discount};
  }
  function reset(){ redemption={points:0,discount:0}; render(); }
  function current(){
    redemption=calc(redemption.points,selectedAmount(),window.currentMember||null);
    return {points:redemption.points,discount:redemption.discount};
  }
  function selectedAmount(){
    try{
      if(window.cart && cart.length) return cart.reduce(function(s,i){return s+num(i.price,0);},0);
      if(window.selectedTicket && window.ticketData && ticketData[selectedTicket]) return num(ticketData[selectedTicket].price,0);
    }catch(e){}
    return 0;
  }
  function cartAmount(){
    try{
      if(window.cart && cart.length) return cart.reduce(function(s,i){return s+num(i.price,0);},0);
    }catch(e){}
    return 0;
  }
  function render(){
    var member=window.currentMember||null, total=selectedAmount(), cartTotal=cartAmount(), s=load();
    redemption=member&&s.enabled ? calc(redemption.points,total,member) : {points:0,discount:0};
    document.querySelectorAll(".consume-point-box").forEach(function(box){
      if(!member || !s.enabled){ box.style.display="none"; return; }
      box.style.display="block";
      var balance=Math.max(0,Math.floor(num(member.points,0)));
      var usableDiscount=maxRedeem(total,member);
      var usablePoints=Math.floor(usableDiscount/REDEEM_VALUE)*REDEEM_STEP;
      var bal=box.querySelector("[data-point-balance]"); if(bal) bal.textContent=balance+" 點";
      var max=box.querySelector("[data-point-max]");
      if(max) max.textContent=balance<REDEEM_STEP ? "未滿 10 點，暫時無法折抵" : "本筆最多可用 "+usablePoints+" 點（折 NT$"+usableDiscount+"）";
      var input=box.querySelector("[data-point-input]");
      if(input){
        input.disabled=usablePoints<REDEEM_STEP;
        if(document.activeElement!==input) input.value=redemption.points||"";
      }
      var all=box.querySelector("[data-point-all]"); if(all) all.disabled=usablePoints<REDEEM_STEP;
      var paid=Math.max(0,total-redemption.discount);
      var result=box.querySelector("[data-point-result]");
      if(result) result.textContent=redemption.discount>0 ? "使用 "+redemption.points+" 點，折抵 NT$"+redemption.discount+"，實付 NT$"+paid : (balance<REDEEM_STEP ? "累積滿 10 點即可折抵 10 元" : "每 10 點折 10 元，未使用的零頭點數會保留");
    });
    var cartPrice=document.querySelector("#cartAmount .cartTotalPrice");
    if(cartPrice){
      var cartDiscount=Math.min(cartTotal,redemption.discount);
      var paidTotal=Math.max(0,cartTotal-cartDiscount);
      cartPrice.innerHTML=cartDiscount>0 ? '<small class="consume-original-total">原價 NT$'+cartTotal+'</small>NT$'+paidTotal+'<small class="consume-discount-total">點數折抵 -NT$'+cartDiscount+'</small>' : 'NT$'+cartTotal;
    }
    [["cartLineBtn","LINE Pay",cartTotal],["cartCashBtn","現金付款",cartTotal],["linePayBtn","LINE Pay",total],["cashBtn","現金付款",total]].forEach(function(row){
      var b=document.getElementById(row[0]); if(!b)return;
      var discount=Math.min(row[2],redemption.discount);
      b.textContent=discount>0 ? row[1]+" NT$"+Math.max(0,row[2]-discount) : row[1];
    });
    window.dispatchEvent(new CustomEvent("consume-points-changed",{detail:{originalAmount:total,usedPoints:redemption.points,discount:redemption.discount,paidAmount:Math.max(0,total-redemption.discount)}}));
  }
  function applyInput(input){
    var r=calc(input.value,selectedAmount(),window.currentMember||null); redemption=r; input.value=r.points||""; render();
  }
  function inject(){
    document.querySelectorAll(".selected-member-display").forEach(function(display){
      if(display.nextElementSibling && display.nextElementSibling.classList.contains("consume-point-box")) return;
      var box=document.createElement("div"); box.className="consume-point-box"; box.style.display="none";
      box.innerHTML='<div class="consume-point-head"><b>⭐ 消費點數折抵</b><span>餘額 <strong data-point-balance>0 點</strong></span></div><small class="consume-point-rule">每 10 點折抵 NT$10，未滿 10 點不能使用</small><div class="consume-point-row"><input data-point-input type="number" inputmode="numeric" min="10" step="10" placeholder="10、20、30…"><button type="button" data-point-all>使用最多</button><button type="button" data-point-clear>清除</button></div><small data-point-max>本筆最多可用 0 點</small><div class="consume-point-result" data-point-result>本次未使用點數</div>';
      display.insertAdjacentElement("afterend",box);
      var input=box.querySelector("[data-point-input]");
      input.addEventListener("input",function(){
        var raw=Math.max(0,Math.floor(num(input.value,0)));
        if(!input.value){redemption={points:0,discount:0};render();return;}
        if(raw>=REDEEM_STEP&&raw%REDEEM_STEP===0)applyInput(input);
      });
      input.addEventListener("change",function(){applyInput(input);});
      input.addEventListener("blur",function(){applyInput(input);});
      input.addEventListener("keydown",function(event){if(event&&event.key==="Enter"){applyInput(input);input.blur();}});
      box.querySelector("[data-point-all]").addEventListener("click",function(){ var cap=maxRedeem(selectedAmount(),window.currentMember||null); input.value=Math.floor(cap/REDEEM_VALUE)*REDEEM_STEP; applyInput(input); });
      box.querySelector("[data-point-clear]").addEventListener("click",function(){reset();});
    });
    render();
  }
  function syncCloud(){
    try{
      if(!window.firebase || !firebase.database) return;
      var root=(window.STAFF_CONFIG&&STAFF_CONFIG.firebaseRoot)||"monsterTicket/v1";
      firebase.database().ref(root+"/settings/consumePoints").on("value",function(snap){ if(snap.exists()){save(snap.val()); render();} });
    }catch(e){ console.warn("consume point settings sync",e); }
  }
  window.ConsumePoints={settings:settings,save:save,earn:earn,calculateRedemption:calc,current:current,reset:reset,render:render,maxRedeem:maxRedeem,redeemStep:REDEEM_STEP,redeemValue:REDEEM_VALUE};
  document.addEventListener("DOMContentLoaded",function(){inject();syncCloud();setInterval(render,1000);});
})();
