// 小怪獸售票機 V7.8.3.3 Sprint9｜QR Scanner FIX1
(function(){
'use strict';
var ROOT='monsterTicket/v1', currentFound=null, stream=null, scanTimer=null, html5Scanner=null, activeFilter='playing', unsubscribeTimer=null, lastAlertSignature='', scanLocked=false, scanAudioContext=null;
function byId(id){return document.getElementById(id);} 
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(v){return 'NT$'+Number(v||0).toLocaleString('zh-TW');}
function actor(){try{return (window.MonsterAuth&&MonsterAuth.getActor&&MonsterAuth.getActor('staff'))||{};}catch(e){return {};}}
function orders(){return window.MonsterOrderCenter&&MonsterOrderCenter.getOrders?MonsterOrderCenter.getOrders():{};}
function parseQr(value){
 var text=String(value||'').trim();
 if(window.MonsterTicketValidation&&MonsterTicketValidation.parse){
   var parsed=MonsterTicketValidation.parse(text);
   if(parsed)return parsed;
 }
 var match=text.match(/^MGV1:([^:]+):([^:]+)$/i);
 return match?{version:1,orderKey:match[1],token:match[2]}:null;
}
function normalizeOrderCode(value){return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function candidateCodes(id,o){
 return [id,o.orderNo,o.shortCode,o.queueNumber,o.qrOrderNo,o.receiptNo,o.orderCode]
 .map(normalizeOrderCode).filter(Boolean);
}
function codeMatches(target,candidate){
 if(!target||!candidate)return false;
 if(target===candidate)return true;
 // 收據常只顯示短單號；至少 5 碼才允許尾碼比對，避免誤抓其他訂單。
 return target.length>=5&&candidate.length>=5&&(candidate.endsWith(target)||target.endsWith(candidate));
}
function findOrder(value){
 var raw=String(value||'').trim(), parsed=parseQr(raw), map=orders(), found=null;
 var target=normalizeOrderCode(parsed?parsed.orderKey:raw);
 var incomingToken=parsed?String(parsed.token||'').trim():'';
 // QR token 是每筆訂單唯一識別。舊版收據的短碼可能與後來的正式單號不同，
 // 因此掃描 QR 時先用 token 找訂單，再以單號作為手動輸入與舊 QR 的備援。
 if(incomingToken){
   Object.keys(map||{}).some(function(id){
     var o=map[id]||{}, expected=String(o.qrToken||'').trim();
     if(expected&&expected===incomingToken){found={id:id,order:o,verified:true};return true;}
     return false;
   });
   if(found)return found;
 }
 Object.keys(map||{}).some(function(id){
   var o=map[id]||{}, codes=candidateCodes(id,o);
   var codeMatch=codes.some(function(code){return codeMatches(target,code);});
   if(!codeMatch)return false;
   var expected=String(o.qrToken||'').trim();
   var tokenOk=!parsed||!expected||expected===incomingToken;
   if(tokenOk){found={id:id,order:o,verified:parsed?(!expected||expected===incomingToken):true};return true;}
   return false;
 });
 return found;
}
function orderStatus(o){return window.MonsterTicketStatusEngine?MonsterTicketStatusEngine.getOrderStatus(o):(o.playStatus||o.validationStatus||'waiting');}
function statusText(o){return window.MonsterTicketStatusEngine?MonsterTicketStatusEngine.label(o):(orderStatus(o)==='playing'?'遊玩中':orderStatus(o)==='finished'?'已離場':orderStatus(o)==='cancelled'||o.cancelled?'已作廢':'等待入場');}
function statusClass(o){var s=orderStatus(o);return ['playing','finished','cancelled'].indexOf(s)>=0?s:'waiting';}
function timestamp(v){if(!v)return 0;if(typeof v==='number')return v;var n=Number(v);if(isFinite(n)&&n>1000000000)return n;var d=new Date(v);return isNaN(d.getTime())?0:d.getTime();}
function orderTime(o){return timestamp(o.updatedAt||o.createdAt||o.timestamp||o.checkedInAt||o.dateTime);}
function todayKey(ms){var d=new Date(ms||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function isTodayOrder(o){var t=orderTime(o);if(t)return todayKey(t)===todayKey();var d=String(o.date||'').replace(/\//g,'-');return !d||d===todayKey()||d.endsWith(todayKey().slice(5));}
function exitAt(o){return window.MonsterLiveTimerEngine?MonsterLiveTimerEngine.getExpectedExit(o):timestamp(o.expectedExitTime||o.expireTime||o.playExpireAt||o.scheduledExitAt);}
function isOvertime(o){return window.MonsterLiveTimerEngine?MonsterLiveTimerEngine.getSnapshot(o).phase==='overtime':orderStatus(o)==='playing'&&exitAt(o)>0&&Date.now()>exitAt(o);}
function durationText(ms){if(window.MonsterLiveTimerEngine)return MonsterLiveTimerEngine.formatDuration(ms);var over=ms<0,value=Math.abs(ms),h=Math.floor(value/3600000),m=Math.floor(value%3600000/60000),sec=Math.floor(value%60000/1000);return (over?'超時 ':'剩餘 ')+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function ticketSummary(o){var items=(o.items||[]).slice(0,2).map(function(i){var q=Math.max(1,Number(i.qty||i.quantity||1));return (i.title||i.name||'票券')+(q>1?' ×'+q:'');});return items.join('、')||'票券訂單';}
function filteredOrders(filter){return Object.keys(orders()||{}).map(function(id){return {id:id,order:orders()[id]||{}};}).filter(function(x){var o=x.order,s=orderStatus(o);if(o.deleted||o.cancelled||s==='cancelled'||!isTodayOrder(o))return false;if(filter==='overtime')return isOvertime(o);if(filter==='playing')return s==='playing'&&!isOvertime(o);return s===filter;}).sort(function(a,b){if(filter==='playing'||filter==='overtime')return (exitAt(a.order)||9999999999999)-(exitAt(b.order)||9999999999999);return orderTime(b.order)-orderTime(a.order);});}
function renderHub(){var all=['waiting','playing','overtime','finished'],counts={};all.forEach(function(k){var count=filteredOrders(k).length,id='validation'+k.charAt(0).toUpperCase()+k.slice(1)+'Count',el=byId(id);counts[k]=count;if(el)el.textContent=count;});document.querySelectorAll('[data-validation-filter]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-validation-filter')===activeFilter);});renderLiveSummary(counts);renderLiveList();}
function renderLiveSummary(counts){var box=byId('validationTimerSummary');if(!box)return;var soon=filteredOrders('playing').filter(function(x){var snap=window.MonsterLiveTimerEngine?MonsterLiveTimerEngine.getSnapshot(x.order):null;return snap&&snap.phase==='soon';}).length;box.innerHTML='<span class="safe">場內 '+Number(counts.playing||0)+' 筆</span><span class="soon">即將到時 '+soon+' 筆</span><span class="over">已超時 '+Number(counts.overtime||0)+' 筆</span>';var signature=soon+'|'+Number(counts.overtime||0);if(lastAlertSignature&&signature!==lastAlertSignature&&Number(counts.overtime||0)>0){document.dispatchEvent(new CustomEvent('monster:timer-alert',{detail:{soon:soon,overtime:Number(counts.overtime||0)}}));}lastAlertSignature=signature;}
function renderLiveList(){var box=byId('validationLiveList'), title=byId('validationLiveTitle'), sub=byId('validationLiveSubtitle');if(!box)return;var labels={waiting:'等待入場',playing:'遊玩中',overtime:'已超時',finished:'今日已離場'}, list=filteredOrders(activeFilter);if(title)title.textContent=labels[activeFilter]||'今日現場';if(sub)sub.textContent='共 '+list.length+' 筆・點選可直接開啟驗票卡';if(!list.length){box.innerHTML='<div class="validation-live-empty">目前沒有'+esc(labels[activeFilter]||'符合條件的')+'訂單</div>';return;}box.innerHTML=list.slice(0,50).map(function(x){var o=x.order, code=o.shortCode||String(o.orderNo||x.id).slice(-6), end=exitAt(o), timer='', cls='';if(activeFilter==='playing'||activeFilter==='overtime'){var diff=end?end-Date.now():0;timer=end?durationText(diff):'未設定時間';cls=!end?'':diff<0?'over':diff<=600000?'soon':'safe';}else if(activeFilter==='waiting'){timer='等待入場';cls='soon';}else{timer='已完成';}return '<button type="button" class="validation-live-order" data-live-id="'+esc(x.id)+'"><div><div class="code">'+esc(code)+'</div><div class="summary">'+esc(ticketSummary(o))+'</div><div class="state">'+esc(statusText(o))+'</div></div><div class="time '+cls+'">'+esc(timer)+'</div></button>';}).join('');box.querySelectorAll('[data-live-id]').forEach(function(btn){btn.onclick=function(){var id=btn.getAttribute('data-live-id'),o=orders()[id];if(o)openCenter({id:id,order:o,verified:true});};});}
function timerBox(o){if(orderStatus(o)!=='playing')return '';var end=exitAt(o);if(!end)return '<div class="tvc-timer-box"><small>遊玩時間</small><strong>未設定離場時間</strong></div>';var diff=end-Date.now(), cls=diff<0?' over':diff<=600000?' soon':'';return '<div class="tvc-timer-box'+cls+'"><small>'+(diff<0?'已超過預定離場時間':'預定離場倒數')+'</small><strong>'+esc(durationText(diff))+'</strong></div>';}
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
function actionButton(o){var s=orderStatus(o);if(s==='waiting')return '<button data-tvc-action="enter" class="staff-success-button">▶ 確認全部入場</button>';if(s==='playing')return '<button data-tvc-action="exit" class="staff-danger-button">完成全部離場</button>';if(s==='finished')return '<div class="tvc-done">此訂單已完成離場</div>';return '<div class="tv-alert error">此訂單不可驗票</div>';}
function openCenter(found){ensureModal();currentFound=found;renderCenter();byId('ticketValidationCenterModal').style.display='flex';document.body.classList.add('tvc-open');}
function closeCenter(){var m=byId('ticketValidationCenterModal');if(m)m.style.display='none';document.body.classList.remove('tvc-open');}
function renderCenter(){
 if(!currentFound)return;var latest=orders()[currentFound.id];if(latest)currentFound.order=latest;var o=currentFound.order, code=o.shortCode||String(o.orderNo||currentFound.id).slice(-6), c=byId('tvcModalContent');
 c.innerHTML='<div class="tvc-hero"><div><small>訂單號碼</small><h2>'+esc(code)+'</h2></div><span class="tvc-status '+statusClass(o)+'">'+statusText(o)+'</span></div>'+
 timerBox(o)+'<div class="tvc-info-grid"><div><small>付款狀態</small><b>'+(o.cancelled?'已作廢':'付款完成')+'</b></div><div><small>實付金額</small><b>'+money(o.paidAmount!=null?o.paidAmount:o.amount||0)+'</b></div><div><small>遊玩人數</small><b>'+Number(o.playerCount||1)+' 人</b></div><div><small>陪同人數</small><b>'+Number(o.guardianCount||0)+' 人</b></div></div>'+
 '<div class="tvc-subtitle">購買內容</div><div class="tvc-items">'+itemRows(o)+'</div>'+ticketRows(o)+
 '<div class="tvc-main-actions">'+actionButton(o)+'<button data-tvc-action="full" class="staff-secondary-button">完整訂單資料</button></div><div id="tvcMessage"></div>';
 c.querySelectorAll('[data-tvc-action]').forEach(function(b){b.onclick=function(){var a=b.getAttribute('data-tvc-action');if(a==='full')openFullOrder(currentFound.id);else updateStatus(a);};});
}
function expectedExit(o,now){if(o.timeMode==='unlimited')return null;var mins=Math.max(10,Number(o.playMinutes||120));if(o.fixedExitTime){var p=String(o.fixedExitTime).split(':');var d=new Date(now);d.setHours(Number(p[0]||0),Number(p[1]||0),0,0);return d.getTime();}return now+mins*60000;}
function updateTicketInstances(list,action,now,who){return (list||[]).map(function(t){var n=Object.assign({},t);if(action==='enter'&&(n.status||'waiting')==='waiting'){n.status='playing';n.checkedInAt=now;n.checkedInBy=who;}if(action==='exit'&&n.status==='playing'){n.status='finished';n.checkedOutAt=now;n.checkedOutBy=who;}return n;});}
function updateStatus(action){
 var o=currentFound.order, current=orderStatus(o);
 if(o.cancelled||current==='cancelled'){message('此訂單已作廢，不能操作',false);return;}
 var desired=action==='enter'?'playing':'finished';
 if(action==='enter'&&current!=='waiting'){message('此訂單不是等待入場狀態',false);return;}
 if(action==='exit'&&current!=='playing'){message('此訂單不是遊玩中狀態',false);return;}
 if(!confirm(action==='enter'?'確認此訂單全部入場？':'確認此訂單全部離場？'))return;

 var now=Date.now(), a=actor(), who=a.name||a.displayName||a.account||'staff';
 var ref=firebase.database().ref(ROOT+'/orders/'+currentFound.id), before=current;
 message('處理中…',true);

 ref.transaction(function(latest){
   if(!latest||latest.deleted)return;
   var latestStatus=orderStatus(latest);
   if(action==='enter'&&latestStatus!=='waiting')return;
   if(action==='exit'&&latestStatus!=='playing')return;
   var opts={now:now,actor:who};
   if(action==='enter')opts.expectedExitTime=expectedExit(latest,now);
   var next=window.MonsterTicketStatusEngine?MonsterTicketStatusEngine.transitionOrder(latest,desired,opts):Object.assign({},latest,{playStatus:desired,validationStatus:desired,updatedAt:now,ticketInstances:updateTicketInstances(latest.ticketInstances,action,now,who)});
   if(action==='enter'){
     next.entryOperator=who;next.enteredBy=who;next.checkedInAt=now;next.checkedInBy=who;
   }else{
     next.exitOperator=who;next.exitedBy=who;next.checkedOutAt=now;next.checkedOutBy=who;
   }
   return next;
 },function(error,committed,snapshot){
   if(error){message('操作失敗：'+(error.message||'請檢查網路'),false);return;}
   if(!committed){message('訂單狀態已被其他裝置更新，請重新查詢',false);return;}
   var latest=snapshot&&snapshot.val?snapshot.val():null;
   if(latest){currentFound.order=latest;}
   firebase.database().ref(ROOT+'/auditLogs').push({action:action==='enter'?'ticket.checkIn':'ticket.checkOut',orderId:currentFound.id,shortCode:(latest&&latest.shortCode)||o.shortCode||'',operatorName:who,createdAt:now,fromStatus:before,toStatus:desired,engineVersion:'7.6.0'}).catch(function(){});
   message(action==='enter'?'已完成入場':'已完成離場',true);
   renderCenter();showResult(currentFound);renderHub();
 });
}
function message(text,ok){var b=byId('tvcMessage');if(!b)return;b.innerHTML='<div class="tv-alert '+(ok?'success':'error')+'">'+esc(text)+'</div>';}
function normalizeScanValue(value){
 var raw=String(value==null?'':value).trim();
 try{raw=decodeURIComponent(raw);}catch(e){}
 var match=raw.match(/MGV1:[^\s?#]+:[A-Za-z0-9]+/i);
 if(match)raw=match[0];
 return raw.replace(/[\r\n\t]/g,'').trim();
}
function lookup(value, options){
 options=options||{};
 var normalized=normalizeScanValue(value), found=findOrder(normalized);
 if(found){showResult(found);openCenter(found);return Promise.resolve(true);}
 // 訂單中心畫面可能已顯示舊快照，但快速驗票載入時機較早；先向 Firebase 重抓一次再判定。
 var refresh=window.MonsterOrderCenter&&MonsterOrderCenter.refresh;
 if(!options.skipRefresh&&typeof refresh==='function'){
   return Promise.resolve(refresh()).catch(function(){}).then(function(){
     var retry=findOrder(normalized);
     showResult(retry);
     if(retry)openCenter(retry);
     return !!retry;
   });
 }
 showResult(null);return Promise.resolve(false);
}
function prepareScanFeedback(){
 try{
   var AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)return;
   if(!scanAudioContext)scanAudioContext=new AudioContextClass();
   if(scanAudioContext.state==='suspended'){
     var resumePromise=scanAudioContext.resume();
     if(resumePromise&&resumePromise.catch)resumePromise.catch(function(){});
   }
   // iPhone 必須在使用者按下「掃描」時先解鎖聲音，之後辨識成功才能正常播放。
   var oscillator=scanAudioContext.createOscillator(), gain=scanAudioContext.createGain(), now=scanAudioContext.currentTime;
   gain.gain.setValueAtTime(0,now);
   oscillator.connect(gain);gain.connect(scanAudioContext.destination);
   oscillator.start(now);oscillator.stop(now+0.01);
 }catch(e){}
}
function playScanSuccessFeedback(){
 try{if(navigator.vibrate)navigator.vibrate(55);}catch(e){}
 function playTone(){
   try{
     if(!scanAudioContext||scanAudioContext.state!=='running')throw new Error('audio-context-not-ready');
     var now=scanAudioContext.currentTime;
     [[880,0,0.075],[1320,0.085,0.11]].forEach(function(note){
       var oscillator=scanAudioContext.createOscillator(), gain=scanAudioContext.createGain(), start=now+note[1], end=start+note[2];
       oscillator.type='sine';oscillator.frequency.setValueAtTime(note[0],start);
       gain.gain.setValueAtTime(0.0001,start);
       gain.gain.exponentialRampToValueAtTime(0.28,start+0.012);
       gain.gain.exponentialRampToValueAtTime(0.0001,end);
       oscillator.connect(gain);gain.connect(scanAudioContext.destination);
       oscillator.start(start);oscillator.stop(end+0.015);
     });
     return true;
   }catch(e){return false;}
 }
 if(playTone())return;
 try{
   if(scanAudioContext&&scanAudioContext.state==='suspended'){
     scanAudioContext.resume().then(playTone).catch(function(){});
     return;
   }
 }catch(e){}
 // 不支援 Web Audio 時沿用後台既有的成功音效。
 try{var sound=byId('successSound');if(sound){sound.currentTime=0;sound.play().catch(function(){});}}catch(e){}
}
function releaseMediaTracks(){
 try{if(stream){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});stream=null;}}catch(e){}
 try{var video=byId('tvcVideo');if(video){if(video.srcObject&&video.srcObject.getTracks)video.srcObject.getTracks().forEach(function(t){try{t.stop();}catch(e){}});video.pause();video.srcObject=null;video.removeAttribute('src');video.load();}}catch(e){}
}
function stopScan(){
 if(scanTimer){clearInterval(scanTimer);scanTimer=null;}
 releaseMediaTracks();
 var closing=html5Scanner;html5Scanner=null;
 var finish=function(){try{if(closing&&closing.clear)closing.clear();}catch(e){}var m=byId('tvcScannerModal');if(m)m.remove();};
 if(closing&&closing.stop){try{return Promise.resolve(closing.stop()).catch(function(){}).then(function(){releaseMediaTracks();finish();});}catch(e){finish();return Promise.resolve();}}
 finish();return Promise.resolve();
}
function handleScanSuccess(raw){
 if(scanLocked)return;scanLocked=true;
 var value=normalizeScanValue(raw);
 if(!value){scanLocked=false;return;}
 playScanSuccessFeedback();
 stopScan().then(function(){
   return lookup(value).then(function(ok){if(!ok){setTimeout(function(){alert('QR Code 已讀取，但找不到對應訂單。請確認單號，或按重新整理後再試。');},50);}});
 }).finally(function(){setTimeout(function(){scanLocked=false;},500);});
}
function scannerFallback(){stopScan().then(function(){scanLocked=false;var v=prompt('相機掃描無法啟動。請輸入收據上的訂單號碼（例如 A80188）：');if(v)lookup(v);});}
function loadHtml5Qr(){
 if(window.Html5Qrcode)return Promise.resolve(window.Html5Qrcode);
 if(window.__monsterHtml5QrLoading)return window.__monsterHtml5QrLoading;
 var urls=['https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js','https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'];
 window.__monsterHtml5QrLoading=new Promise(function(resolve,reject){var n=0;function next(){if(n>=urls.length){reject(new Error('scanner-library-unavailable'));return;}var sc=document.createElement('script');sc.src=urls[n++];sc.async=true;sc.onload=function(){if(window.Html5Qrcode)resolve(window.Html5Qrcode);else next();};sc.onerror=next;document.head.appendChild(sc);}next();});
 return window.__monsterHtml5QrLoading;
}
function createScannerShell(mode){
 var cameraView=mode==='native'
   ?'<div class="tvc-scanner-viewport tvc-scanner-native"><video id="tvcVideo" autoplay playsinline muted></video><div class="tvc-native-scan-frame" aria-hidden="true"></div></div>'
   :'<div class="tvc-scanner-viewport tvc-scanner-html5"><div id="tvcScannerReader"></div></div>';
 var wrap=document.createElement('div');wrap.id='tvcScannerModal';wrap.className='staff-modal tvc-scanner';wrap.style.display='flex';
 wrap.innerHTML='<div class="staff-modal-card tvc-scanner-card"><div class="staff-modal-header"><div class="staff-modal-title">📷 掃描收據 QR Code</div><button id="tvcScanClose" class="staff-modal-close">×</button></div>'+cameraView+'<p>將 QR Code 對準框內</p><div class="tvc-scan-help">請使用 Safari 或 Chrome，並允許相機權限。若從 LINE 開啟，請改用外部瀏覽器。</div><button id="tvcManualCode" class="staff-secondary-button" type="button">改用訂單號碼</button></div>';
 document.body.appendChild(wrap);byId('tvcScanClose').onclick=stopScan;byId('tvcManualCode').onclick=scannerFallback;return wrap;
}
function startNativeDetector(){var detector=new BarcodeDetector({formats:['qr_code']});createScannerShell('native');return navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}).then(function(s){stream=s;var video=byId('tvcVideo');video.srcObject=s;scanTimer=setInterval(function(){if(video.readyState<2)return;detector.detect(video).then(function(codes){if(codes&&codes[0]&&codes[0].rawValue){handleScanSuccess(codes[0].rawValue);}}).catch(function(){});},300);});}
function startHtml5Scanner(){createScannerShell('html5');return loadHtml5Qr().then(function(){html5Scanner=new Html5Qrcode('tvcScannerReader');return html5Scanner.start({facingMode:'environment'},{fps:10,qrbox:function(w,h){var s=Math.floor(Math.min(w,h)*0.72);return {width:s,height:s};}},function(raw){handleScanSuccess(raw);},function(){});});}
function startScan(){
 if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('手機相機只能在 HTTPS 安全網址中使用。請確認網址以 https:// 開頭，並改用 Safari 或 Chrome 開啟。');scannerFallback();return;}
 scanLocked=false;
 prepareScanFeedback();
 stopScan();
 var nativeSupported=('BarcodeDetector' in window);
 var task=nativeSupported?startNativeDetector():startHtml5Scanner();
 task.catch(function(error){console.warn('[TicketScanner] camera failed',error);if(nativeSupported){stopScan();startHtml5Scanner().catch(scannerFallback);}else{scannerFallback();}});
}
function bind(){ensureModal();var b=byId('staffQuickLookupButton'),i=byId('staffQuickCodeInput'),s=byId('staffQrScanButton'),r=byId('validationLiveRefresh');if(b)b.onclick=function(){lookup(i&&i.value);};if(i)i.addEventListener('keydown',function(e){if(e.key==='Enter')lookup(i.value);});if(s)s.onclick=startScan;if(r)r.onclick=function(){if(window.MonsterOrderCenter&&MonsterOrderCenter.refresh)MonsterOrderCenter.refresh();renderHub();};document.querySelectorAll('[data-validation-filter]').forEach(function(btn){btn.onclick=function(){activeFilter=btn.getAttribute('data-validation-filter')||'playing';renderHub();var panel=byId('validationLiveList');if(panel)panel.scrollIntoView({behavior:'smooth',block:'nearest'});};});setTimeout(renderHub,900);if(window.MonsterLiveTimerEngine){unsubscribeTimer=MonsterLiveTimerEngine.subscribe(function(){renderHub();if(currentFound&&byId('ticketValidationCenterModal')&&byId('ticketValidationCenterModal').style.display!=='none')renderCenter();});}else{unsubscribeTimer=function(){};setInterval(function(){renderHub();if(currentFound&&byId('ticketValidationCenterModal')&&byId('ticketValidationCenterModal').style.display!=='none')renderCenter();},1000);}window.addEventListener('beforeunload',function(){if(unsubscribeTimer)unsubscribeTimer();});}
document.addEventListener('DOMContentLoaded',bind);
window.MonsterTicketValidator={findOrder:findOrder,lookup:lookup,openCenter:openCenter,closeCenter:closeCenter,startScan:startScan,renderHub:renderHub,setFilter:function(v){activeFilter=v;renderHub();}};
})();
