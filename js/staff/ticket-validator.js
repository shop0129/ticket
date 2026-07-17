// 小怪獸售票機 V7.5.2｜Ticket Validation Center
(function(){
'use strict';
var ROOT='monsterTicket/v1', currentFound=null, stream=null, scanTimer=null;
function byId(id){return document.getElementById(id);} 
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(v){return 'NT$'+Number(v||0).toLocaleString('zh-TW');}
function actor(){try{return (window.MonsterAuth&&MonsterAuth.getActor&&MonsterAuth.getActor('staff'))||{};}catch(e){return {};}}
function orders(){return window.MonsterOrderCenter&&MonsterOrderCenter.getOrders?MonsterOrderCenter.getOrders():{};}
function parseQr(value){return window.MonsterTicketValidation&&MonsterTicketValidation.parse?MonsterTicketValidation.parse(value):null;}
function findOrder(value){
 var raw=String(value||'').trim(), q=raw.toUpperCase(), parsed=parseQr(raw), map=orders(), found=null;
 Object.keys(map||{}).some(function(id){
   var o=map[id]||{};
   var idMatch=parsed?String(id)===String(parsed.orderKey)||String(o.orderNo||'')===String(parsed.orderKey):false;
   var tokenMatch=!parsed||String(o.qrToken||'')===String(parsed.token||'');
   var textMatch=String(o.shortCode||'').toUpperCase()===q||String(o.orderNo||'').toUpperCase()===q||String(id).toUpperCase()===q;
   if((idMatch&&tokenMatch)||textMatch){found={id:id,order:o,verified:parsed?tokenMatch:true};return true;}return false;
 });
 return found;
}
function statusText(o){var s=o.playStatus||o.validationStatus||'waiting';return s==='playing'?'遊玩中':s==='finished'?'已離場':s==='cancelled'||o.cancelled?'已作廢':'等待入場';}
function statusClass(o){var s=o.playStatus||o.validationStatus||'waiting';return ['playing','finished','cancelled'].indexOf(s)>=0?s:'waiting';}
function itemRows(o){return (o.items||[]).map(function(i){var q=Math.max(1,Number(i.qty||i.quantity||1));return '<div class="tvc-item"><span>'+esc(i.title||i.name||i.id||'票券')+(q>1?' × '+q:'')+'</span><b>'+money(Number(i.price||0)*q)+'</b></div>';}).join('')||'<div class="tvc-empty">沒有票券明細</div>';}
function ticketRows(o){var a=Array.isArray(o.ticketInstances)?o.ticketInstances:[];if(!a.length)return '';
 return '<div class="tvc-subtitle">入場票券</div>'+a.map(function(t){return '<div class="tvc-ticket"><span>'+esc(t.title||'票券')+'</span><em class="'+esc(t.status||'waiting')+'">'+(t.status==='playing'?'遊玩中':t.status==='finished'?'已離場':'等待入場')+'</em></div>';}).join('');
}
function showResult(found){
 var box=byId('staffQuickValidationResult');if(!box)return;currentFound=found;
 if(!found){box.innerHTML='<div class="tv-alert error">找不到此訂單，請確認訂單號碼或重新掃描。</div>';return;}
 var o=found.order, code=o.shortCode||String(o.orderNo||found.id).slice(-6), paid=o.paidAmount!=null?o.paidAmount:o.amount||0;
 box.innerHTML='<article class="tvc-card">'+
 '<header><div><small>訂單號碼</small><strong>'+esc(code)+'</strong></div><span class="tvc-status '+statusClass(o)+'">'+statusText(o)+'</span></header>'+
 '<div class="tvc-meta"><span>實付 <b>'+money(paid)+'</b></span><span>'+esc(o.date||'')+' '+esc(o.time||'')+'</span></div>'+
 '<div class="tvc-items">'+itemRows(o)+'</div>'+ticketRows(o)+
 '<div class="tvc-actions"><button id="tvcOpenButton" class="staff-primary-button">開啟驗票卡</button><button id="tvcFullButton" class="staff-secondary-button">查看完整訂單</button></div></article>';
 byId('tvcOpenButton').onclick=function(){openCenter(found);};
 byId('tvcFullButton').onclick=function(){openFullOrder(found.id);};
}
function ensureModal(){
 if(byId('ticketValidationCenterModal'))return;
 var wrap=document.createElement('div');wrap.id='ticketValidationCenterModal';wrap.className='staff-modal tvc-modal';wrap.style.display='none';
 wrap.innerHTML='<div class="staff-modal-card tvc-modal-card"><div class="staff-modal-header"><div class="staff-modal-title">⚡ 驗票中心</div><button id="tvcClose" class="staff-modal-close">×</button></div><div id="tvcModalContent"></div></div>';
 document.body.appendChild(wrap);byId('tvcClose').onclick=closeCenter;wrap.addEventListener('click',function(e){if(e.target===wrap)closeCenter();});
}
function openFullOrder(id){
 if(window.MonsterOrderCenter&&typeof MonsterOrderCenter.openOrderDetail==='function'){MonsterOrderCenter.openOrderDetail(id);return;}
 var input=byId('staffOrderSearchInput');if(input){var o=orders()[id]||{};input.value=o.shortCode||o.orderNo||id;input.dispatchEvent(new Event('input',{bubbles:true}));}
 alert('訂單已帶入搜尋，請從訂單中心開啟。');
}
function actionButton(o){var s=o.playStatus||'waiting';if(s==='waiting')return '<button data-tvc-action="enter" class="staff-success-button">▶ 確認全部入場</button>';if(s==='playing')return '<button data-tvc-action="exit" class="staff-danger-button">完成全部離場</button>';if(s==='finished')return '<div class="tvc-done">此訂單已完成離場</div>';return '<div class="tv-alert error">此訂單不可驗票</div>';}
function openCenter(found){ensureModal();currentFound=found;renderCenter();byId('ticketValidationCenterModal').style.display='flex';document.body.classList.add('tvc-open');}
function closeCenter(){var m=byId('ticketValidationCenterModal');if(m)m.style.display='none';document.body.classList.remove('tvc-open');}
function renderCenter(){
 if(!currentFound)return;var latest=orders()[currentFound.id];if(latest)currentFound.order=latest;var o=currentFound.order, code=o.shortCode||String(o.orderNo||currentFound.id).slice(-6), c=byId('tvcModalContent');
 c.innerHTML='<div class="tvc-hero"><div><small>訂單號碼</small><h2>'+esc(code)+'</h2></div><span class="tvc-status '+statusClass(o)+'">'+statusText(o)+'</span></div>'+
 '<div class="tvc-info-grid"><div><small>付款狀態</small><b>'+(o.cancelled?'已作廢':'付款完成')+'</b></div><div><small>實付金額</small><b>'+money(o.paidAmount!=null?o.paidAmount:o.amount||0)+'</b></div><div><small>遊玩人數</small><b>'+Number(o.playerCount||1)+' 人</b></div><div><small>陪同人數</small><b>'+Number(o.guardianCount||0)+' 人</b></div></div>'+
 '<div class="tvc-subtitle">購買內容</div><div class="tvc-items">'+itemRows(o)+'</div>'+ticketRows(o)+
 '<div class="tvc-main-actions">'+actionButton(o)+'<button data-tvc-action="full" class="staff-secondary-button">完整訂單資料</button></div><div id="tvcMessage"></div>';
 c.querySelectorAll('[data-tvc-action]').forEach(function(b){b.onclick=function(){var a=b.getAttribute('data-tvc-action');if(a==='full')openFullOrder(currentFound.id);else updateStatus(a);};});
}
function expectedExit(o,now){if(o.timeMode==='unlimited')return null;var mins=Math.max(10,Number(o.playMinutes||120));if(o.fixedExitTime){var p=String(o.fixedExitTime).split(':');var d=new Date(now);d.setHours(Number(p[0]||0),Number(p[1]||0),0,0);return d.getTime();}return now+mins*60000;}
function updateTicketInstances(list,action,now,who){return (list||[]).map(function(t){var n=Object.assign({},t);if(action==='enter'&&(n.status||'waiting')==='waiting'){n.status='playing';n.checkedInAt=now;n.checkedInBy=who;}if(action==='exit'&&n.status==='playing'){n.status='finished';n.checkedOutAt=now;n.checkedOutBy=who;}return n;});}
function updateStatus(action){
 var o=currentFound.order;if(o.cancelled||o.playStatus==='cancelled'){message('此訂單已作廢，不能操作',false);return;}
 var desired=action==='enter'?'playing':'finished', current=o.playStatus||'waiting';if(action==='enter'&&current!=='waiting'){message('此訂單不是等待入場狀態',false);return;}if(action==='exit'&&current!=='playing'){message('此訂單不是遊玩中狀態',false);return;}
 if(!confirm(action==='enter'?'確認此訂單全部入場？':'確認此訂單全部離場？'))return;
 var now=Date.now(), a=actor(), who=a.name||a.displayName||a.account||'staff', ref=firebase.database().ref(ROOT+'/orders/'+currentFound.id);
 var updates={playStatus:desired,validationStatus:desired,updatedAt:now,ticketInstances:updateTicketInstances(o.ticketInstances,action,now,who)};
 if(action==='enter'){updates.entryTime=now;updates.expectedExitTime=expectedExit(o,now);updates.entryOperator=who;updates.checkedInAt=now;updates.checkedInBy=who;}else{updates.exitTime=now;updates.exitOperator=who;updates.checkedOutAt=now;updates.checkedOutBy=who;}
 message('處理中…',true);
 ref.update(updates).then(function(){return firebase.database().ref(ROOT+'/auditLogs').push({action:action==='enter'?'ticket.checkIn':'ticket.checkOut',orderId:currentFound.id,shortCode:o.shortCode||'',operatorName:who,createdAt:now,fromStatus:current,toStatus:desired});}).then(function(){Object.assign(o,updates);message(action==='enter'?'已完成入場':'已完成離場',true);renderCenter();showResult(currentFound);}).catch(function(err){message('操作失敗：'+(err&&err.message?err.message:'請檢查網路'),false);});
}
function message(text,ok){var b=byId('tvcMessage');if(!b)return;b.innerHTML='<div class="tv-alert '+(ok?'success':'error')+'">'+esc(text)+'</div>';}
function lookup(value){var found=findOrder(value);showResult(found);if(found)openCenter(found);}
function stopScan(){if(scanTimer){clearInterval(scanTimer);scanTimer=null;}if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}var m=byId('tvcScannerModal');if(m)m.remove();}
function startScan(){
 if(!('BarcodeDetector' in window)||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){var v=prompt('此瀏覽器暫不支援相機掃描，請輸入收據上的訂單號碼：');if(v)lookup(v);return;}
 var detector=new BarcodeDetector({formats:['qr_code']}), wrap=document.createElement('div');wrap.id='tvcScannerModal';wrap.className='staff-modal tvc-scanner';wrap.style.display='flex';wrap.innerHTML='<div class="staff-modal-card tvc-scanner-card"><div class="staff-modal-header"><div class="staff-modal-title">📷 掃描收據 QR Code</div><button id="tvcScanClose" class="staff-modal-close">×</button></div><video id="tvcVideo" autoplay playsinline muted></video><p>將 QR Code 對準框內</p><div class="tvc-scan-frame"></div></div>';document.body.appendChild(wrap);byId('tvcScanClose').onclick=stopScan;
 navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}).then(function(s){stream=s;var video=byId('tvcVideo');video.srcObject=s;scanTimer=setInterval(function(){if(video.readyState<2)return;detector.detect(video).then(function(codes){if(codes&&codes[0]&&codes[0].rawValue){var raw=codes[0].rawValue;stopScan();lookup(raw);}}).catch(function(){});},350);}).catch(function(){stopScan();var v=prompt('無法開啟相機，請輸入訂單號碼：');if(v)lookup(v);});
}
function bind(){ensureModal();var b=byId('staffQuickLookupButton'),i=byId('staffQuickCodeInput'),s=byId('staffQrScanButton');if(b)b.onclick=function(){lookup(i&&i.value);};if(i)i.addEventListener('keydown',function(e){if(e.key==='Enter')lookup(i.value);});if(s)s.onclick=startScan;}
document.addEventListener('DOMContentLoaded',bind);
window.MonsterTicketValidator={findOrder:findOrder,lookup:lookup,openCenter:openCenter,closeCenter:closeCenter,startScan:startScan};
})();
