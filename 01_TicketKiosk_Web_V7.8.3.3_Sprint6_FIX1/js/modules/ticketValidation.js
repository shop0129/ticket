// 小怪獸售票機 V7.6.2.6｜QR Parser Load Fix
(function(){
  'use strict';
  var PREFIX='MGV1';
  function pad(n,w){var s=String(n);while(s.length<w)s='0'+s;return s;}
  function randomToken(){
    var bytes=[];
    try{var a=new Uint8Array(12);crypto.getRandomValues(a);for(var i=0;i<a.length;i++)bytes.push(pad(a[i].toString(16),2));return bytes.join('');}
    catch(e){return String(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/gi,'').slice(0,24);}
  }
  function makeShortCode(orderNo){
    var source=String(orderNo||'').replace(/\D/g,'');
    var tail=(source.slice(-5)||String(Date.now()).slice(-5));
    return 'A'+pad(tail,5);
  }
  function itemQty(item){return Math.max(1,Number(item&&item.qty||item&&item.quantity||1));}
  function isAdmission(item){
    if(item && (item.canEnter === false || item.admissionRequired === false)) return false;
    if(item && (item.canEnter === true || item.admissionRequired === true)) return true;
    var id=String(item&&item.id||'');var title=String(item&&item.title||'');
    return !(id==='token10'||id==='token25'||id==='powerbank'||title.indexOf('代幣')>=0||title.indexOf('行動電源')>=0);
  }
  function buildTicketInstances(order){
    var out=[];(order.items||[]).forEach(function(item,itemIndex){if(!isAdmission(item))return;var q=itemQty(item);for(var i=0;i<q;i++)out.push({ticketInstanceId:(order.shortCode||'ORDER')+'-'+pad(itemIndex+1,2)+'-'+pad(i+1,2),ticketId:item.id||'',title:item.title||'票券',status:'waiting',checkedInAt:null,checkedOutAt:null,checkedInBy:null,checkedOutBy:null});});return out;
  }
  function decorate(order){
    if(!order)return order;
    order.shortCode=order.shortCode||makeShortCode(order.orderNo);
    order.qrToken=order.qrToken||randomToken();
    order.qrVersion=1;
    order.qrPayload=PREFIX+':'+String(order.cloudId||order.orderNo||'')+':'+order.qrToken;
    order.validationStatus=order.validationStatus||'waiting';
    order.ticketInstances=Array.isArray(order.ticketInstances)&&order.ticketInstances.length?order.ticketInstances:buildTicketInstances(order);
    return order;
  }
  function qrSvg(payload,size){
    size=size||180;
    if(typeof qrcode!=='function')return '';
    try{var qr=qrcode(0,'M');qr.addData(String(payload||''));qr.make();return qr.createSvgTag({cellSize:4,margin:2,scalable:true}).replace('<svg','<svg width="'+size+'" height="'+size+'"');}catch(e){console.error('[TicketValidation] QR error',e);return '';}
  }
  function receiptHtml(order){
    if(!order)return '';
    decorate(order);
    var rows=(order.items||[]).map(function(item){var q=itemQty(item);return '<div class="tv-receipt-row"><span>'+escapeHtml(item.title||item.id||'票券')+' × '+q+'</span><b>NT$'+Number(item.price||0)*q+'</b></div>';}).join('');
    var discount=Number(order.pointDiscount||0);
    var canonicalNo=String(order.orderNo||order.cloudId||order.shortCode||'').trim();
    var helperNo=String(order.shortCode||'').trim();
    var helper=(helperNo&&helperNo!==canonicalNo)?'<small class="tv-code-helper">快速碼：'+escapeHtml(helperNo)+'</small>':'';
    return '<section class="tv-receipt-preview"><h3>小怪獸放電所</h3><div class="tv-code">訂單號碼：<strong>'+escapeHtml(canonicalNo)+'</strong>'+helper+'</div>'+rows+(discount?'<div class="tv-receipt-row"><span>點數折抵</span><b>-NT$'+discount+'</b></div>':'')+'<div class="tv-receipt-total"><span>實付金額</span><b>NT$'+Number(order.paidAmount!=null?order.paidAmount:order.amount||0)+'</b></div><div class="tv-qr">'+qrSvg(order.qrPayload,170)+'</div><p>入場時請出示此 QR Code</p><small class="tv-receipt-help">掃描失敗請提供<br><b>訂單號 '+escapeHtml(canonicalNo)+'</b></small></section>';
  }
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  window.MonsterTicketValidation={decorateOrder:decorate,makeShortCode:makeShortCode,receiptHtml:receiptHtml,qrSvg:qrSvg,parse:function(text){var p=String(text||'').split(':');return p.length===3&&p[0]===PREFIX?{version:1,orderKey:p[1],token:p[2]}:null;}};
})();
