// V7.4.8 消費點數完整系統
(function(){
  "use strict";
  var KEY = "consumePointSettings";
  var redemption = { points:0, discount:0 };
  var defaults = { earnAmount:100, earnPoints:1, pointValue:1, maxPercent:50, enabled:true };

  function num(v,f){ v=Number(v); return isFinite(v)?v:f; }
  function load(){
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY)||"{}")); }
    catch(e){ return Object.assign({}, defaults); }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(Object.assign({}, defaults,s||{}))); }
  function settings(){ return load(); }
  function earn(amount){ var s=load(); if(!s.enabled) return 0; return Math.floor(num(amount,0)/Math.max(1,num(s.earnAmount,100))) * Math.max(1,num(s.earnPoints,1)); }
  function maxRedeem(amount, member){
    var s=load();
    var byOrder=Math.floor(num(amount,0)*Math.max(0,Math.min(100,num(s.maxPercent,50)))/100);
    var byBalance=Math.floor(num(member&&member.points,0)*Math.max(0.01,num(s.pointValue,1)));
    return Math.max(0,Math.min(byOrder,byBalance));
  }
  function calc(points, amount, member){
    var s=load();
    points=Math.max(0,Math.floor(num(points,0)));
    var maxByBalance=Math.floor(num(member&&member.points,0));
    points=Math.min(points,maxByBalance);
    var discount=Math.floor(points*Math.max(0.01,num(s.pointValue,1)));
    var cap=maxRedeem(amount,member);
    if(discount>cap){ discount=cap; points=Math.floor(discount/Math.max(0.01,num(s.pointValue,1))); discount=Math.floor(points*Math.max(0.01,num(s.pointValue,1))); }
    return {points:points,discount:discount};
  }
  function reset(){ redemption={points:0,discount:0}; render(); }
  function current(){ return {points:redemption.points,discount:redemption.discount}; }
  function totalAmount(){
    try{
      if(window.cart && cart.length) return cart.reduce(function(s,i){return s+num(i.price,0);},0);
      if(window.selectedTicket && window.ticketData && ticketData[selectedTicket]) return num(ticketData[selectedTicket].price,0);
    }catch(e){}
    return 0;
  }
  function render(){
    var member=window.currentMember||null, total=totalAmount(), s=load();
    document.querySelectorAll(".consume-point-box").forEach(function(box){
      if(!member || !s.enabled){ box.style.display="none"; return; }
      box.style.display="block";
      var bal=box.querySelector("[data-point-balance]"); if(bal) bal.textContent=num(member.points,0)+" 點";
      var max=box.querySelector("[data-point-max]"); if(max) max.textContent="最高可折 NT$"+maxRedeem(total,member);
      var input=box.querySelector("[data-point-input]"); if(input && document.activeElement!==input) input.value=redemption.points||"";
      var paid=Math.max(0,total-redemption.discount);
      var result=box.querySelector("[data-point-result]"); if(result) result.textContent=redemption.discount>0 ? "本次折抵 NT$"+redemption.discount+"，實付 NT$"+paid : "本次未使用點數";
    });
    var cartPrice=document.querySelector("#cartAmount .cartTotalPrice");
    if(cartPrice){
      var paidTotal=Math.max(0,total-redemption.discount);
      cartPrice.innerHTML=redemption.discount>0 ? '<small class="consume-original-total">原價 NT$'+total+'</small>NT$'+paidTotal+'<small class="consume-discount-total">點數折抵 -NT$'+redemption.discount+'</small>' : 'NT$'+total;
    }
    [["cartLineBtn","LINE Pay"],["cartCashBtn","現金付款"],["linePayBtn","LINE Pay"],["cashBtn","現金付款"]].forEach(function(row){
      var b=document.getElementById(row[0]); if(!b)return;
      b.textContent=redemption.discount>0 ? row[1]+" NT$"+Math.max(0,total-redemption.discount) : row[1];
    });
    window.dispatchEvent(new CustomEvent("consume-points-changed",{detail:{originalAmount:total,usedPoints:redemption.points,discount:redemption.discount,paidAmount:Math.max(0,total-redemption.discount)}}));
  }
  function applyInput(input){
    var r=calc(input.value,totalAmount(),window.currentMember||null); redemption=r; input.value=r.points||""; render();
  }
  function inject(){
    document.querySelectorAll(".selected-member-display").forEach(function(display){
      if(display.nextElementSibling && display.nextElementSibling.classList.contains("consume-point-box")) return;
      var box=document.createElement("div"); box.className="consume-point-box"; box.style.display="none";
      box.innerHTML='<div class="consume-point-head"><b>⭐ 消費點數折抵</b><span>餘額 <strong data-point-balance>0 點</strong></span></div><div class="consume-point-row"><input data-point-input type="number" inputmode="numeric" min="0" placeholder="輸入使用點數"><button type="button" data-point-all>使用最多</button><button type="button" data-point-clear>清除</button></div><small data-point-max>最高可折 NT$0</small><div class="consume-point-result" data-point-result>本次未使用點數</div>';
      display.insertAdjacentElement("afterend",box);
      var input=box.querySelector("[data-point-input]");
      input.addEventListener("input",function(){applyInput(input);});
      box.querySelector("[data-point-all]").addEventListener("click",function(){ var s=load(), cap=maxRedeem(totalAmount(),window.currentMember||null); input.value=Math.floor(cap/Math.max(.01,num(s.pointValue,1))); applyInput(input); });
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
  window.ConsumePoints={settings:settings,save:save,earn:earn,calculateRedemption:calc,current:current,reset:reset,render:render,maxRedeem:maxRedeem};
  document.addEventListener("DOMContentLoaded",function(){inject();syncCloud();setInterval(render,1000);});
})();
