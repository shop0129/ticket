(function(){
'use strict';
var ROOT='monsterTicket/v1';
var orders=[], tickets={}, ticketImages={}, period='today', customDateFrom='', customDateTo='', ordersRef=null, ticketsRef=null, imagesRef=null, dataStarted=false, authWatchStarted=false, deleteListenerBound=false, dashboardLoaded=false, dashboardLoadPromise=null;
function el(id){return document.getElementById(id);} function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(v){return 'NT$'+Number(v||0).toLocaleString('zh-TW');}
function notify(msg,ok){var n=el('enterpriseToast');if(!n)return; n.textContent=msg;n.className='enterprise-toast show '+(ok===false?'error':'success');setTimeout(function(){n.className='enterprise-toast';},2200); if(window.navigator&&navigator.vibrate)navigator.vibrate(ok===false?[60,40,60]:35); try{var a=document.getElementById(ok===false?'clickSound':'successSound');if(a){a.currentTime=0;a.play().catch(function(){});}}catch(e){}
}
function adminOnly(){var role=(window.MonsterRole&&MonsterRole.getCurrentRole&&MonsterRole.getCurrentRole())||window.currentUserRole||''; return role==='admin';}
function openPanel(name){if(!adminOnly()){notify('只有店長可以使用此功能',false);return;} var p=el('enterpriseOverlay'); if(!p)return; p.style.display='flex'; document.body.classList.add('enterprise-open'); el('enterpriseDashboardPanel').style.display=name==='dashboard'?'block':'none'; el('enterpriseTicketPanel').style.display=name==='tickets'?'block':'none'; if(name==='dashboard'){renderDashboard();loadDashboardOrders(true);}else renderTickets();}
function closePanel(){var p=el('enterpriseOverlay');if(p)p.style.display='none';document.body.classList.remove('enterprise-open');}
function taipeiDateKey(ms){var d=new Date(Number(ms||Date.now())+8*60*60*1000);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
function normalizedDateKey(v){var m=String(v||'').match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);return m?m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0'):'';}
function parseOrderDate(o){var raw=o.createdAt||o.timestamp||o.dateTime; if(typeof raw==='number')return new Date(raw); if(raw&&raw.seconds)return new Date(raw.seconds*1000); if(typeof raw==='string'){var parsed=new Date(raw);if(!isNaN(parsed.getTime()))return parsed;} if(o.date){var s=String(o.date)+' '+String(o.time||'00:00'); var d=new Date(s.replace(/-/g,'/')); if(!isNaN(d))return d;} return null;}
function orderDateKey(o){var explicit=normalizedDateKey(o.businessDate||o.operatingDate||o.saleDate);if(explicit)return explicit;var d=parseOrderDate(o);if(d)return taipeiDateKey(d.getTime());return normalizedDateKey(o.date);}
function inPeriod(o){if(period==='all')return true;var key=orderDateKey(o),today=taipeiDateKey();if(!key)return false;if(period==='month')return key.slice(0,7)===today.slice(0,7);if(period==='custom')return !!customDateFrom&&!!customDateTo&&key>=customDateFrom&&key<=customDateTo;return key===today;}
function isCancelled(o){return o.status==='cancel'||o.status==='cancelled'||o.cancelled===true||o.voided===true;}
function amount(o){return Number(o.paidAmount != null ? o.paidAmount : (o.amount||o.total||o.totalAmount||0));}
function qty(o){if(o&&o.prepaidRedemption===true)return 0;if(Array.isArray(o.items))return o.items.reduce(function(s,i){return s+Math.max(1,Number(i.reportTicketCount!=null?i.reportTicketCount:(i.qty||i.quantity||1)));},0);return Number(o.ticketCount||o.people||1);}
function payment(o){return String(o.payment||o.paymentMethod||'').toLowerCase();}
function loadOrdersLocal(){try{return JSON.parse(localStorage.getItem('salesHistory')||'[]')||[];}catch(e){return [];}}
function normalizeMap(v){if(Array.isArray(v))return v.filter(function(x){return x&&!x.deleted;});return Object.keys(v||{}).map(function(k){var x=v[k]||{};if(!x.id)x.id=k;return x;}).filter(function(x){return x&&!x.deleted;});}
function attachCloudData(){if(dataStarted)return;if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.auth||!firebase.auth().currentUser)return;try{dataStarted=true;ordersRef=firebase.database().ref(ROOT+'/orders');ticketsRef=firebase.database().ref(ROOT+'/tickets');ticketsRef.on('value',function(s){var v=s.val()||{};var clean={};Object.keys(v).forEach(function(k){if(v[k]&&!v[k].deleted){clean[k]=v[k];delete clean[k].id;}});if(Object.keys(clean).length)tickets=window.MonsterTicketDataSync?MonsterTicketDataSync.normalizeMap(clean):clean;else loadTicketsLocal();renderTickets();},function(){loadTicketsLocal();renderTickets();});imagesRef=firebase.database().ref(ROOT+'/ticketImages');imagesRef.on('value',function(s){var v=s.val()||{},clean={};Object.keys(v).forEach(function(k){if(v[k]&&!v[k].deleted)clean[k]=v[k];});ticketImages=clean;renderTickets();},function(){ticketImages={};renderTickets();});}catch(e){dataStarted=false;waitForFirebaseReady(0);}}
function setDashboardLoading(loading){var button=el('dashRefresh');if(!button)return;button.disabled=!!loading;button.textContent=loading?'同步中…':'↻ 重新整理';}
function loadDashboardOrders(force){
if(!ordersRef)attachCloudData();
if(dashboardLoadPromise)return dashboardLoadPromise;
if(dashboardLoaded&&!force){renderDashboard();return Promise.resolve(true);}
if(!ordersRef){waitForFirebaseReady(0);renderDashboard();return Promise.resolve(false);}
setDashboardLoading(true);
dashboardLoadPromise=ordersRef.once('value').then(function(snapshot){orders=normalizeMap(snapshot.val());dashboardLoaded=true;renderDashboard();return true;}).catch(function(error){console.error('[MonsterEnterpriseManager] dashboard orders read error:',error);renderDashboard();notify('完整報表同步失敗，請確認網路後再試',false);return false;}).then(function(result){dashboardLoadPromise=null;setDashboardLoading(false);return result;});
return dashboardLoadPromise;
}
function watchAuthenticatedFirebase(){if(authWatchStarted){if(firebase.auth().currentUser&&!dataStarted)attachCloudData();return true;}if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.auth||!firebase.database)return false;try{authWatchStarted=true;firebase.auth().onAuthStateChanged(function(user){if(user)attachCloudData();});if(firebase.auth().currentUser)attachCloudData();return true;}catch(e){authWatchStarted=false;return false;}}
function waitForFirebaseReady(attempt){if(watchAuthenticatedFirebase())return;if(Number(attempt||0)>=80)return;setTimeout(function(){waitForFirebaseReady(Number(attempt||0)+1);},250);}
function startData(){orders=loadOrdersLocal();loadTicketsLocal();renderDashboard();waitForFirebaseReady(0);}
function loadTicketsLocal(){try{tickets=JSON.parse(localStorage.getItem('ticketData')||'{}')||{};if(window.MonsterTicketDataSync)tickets=MonsterTicketDataSync.normalizeMap(tickets);}catch(e){tickets={};}}
function periodPrefix(){if(period==='month')return '本月';if(period==='all')return '累積';if(period==='custom')return '指定期間';return '今日';}
function updatePeriodLabels(){var prefix=periodPrefix(),labels={dashRevenueLabel:prefix+'總收入',dashTicketsLabel:prefix+'售票張數',dashOrdersLabel:prefix+'正常訂單',dashAverageLabel:prefix+'平均客單',dashCashLabel:prefix+'現金收入',dashLineLabel:prefix+' LINE Pay',dashCancelledLabel:prefix+'作廢訂單',dashTokensLabel:prefix+'贈送代幣'};Object.keys(labels).forEach(function(id){if(el(id))el(id).textContent=labels[id];});var title=prefix+'營運概況';if(period==='custom'&&customDateFrom&&customDateTo)title=customDateFrom+' ～ '+customDateTo+' 營運概況';if(el('dashPeriodTitle'))el('dashPeriodTitle').textContent=title;}
function setPeriod(p){if(['today','month','all','custom'].indexOf(p)<0)return;period=p;document.querySelectorAll('.enterprise-period [data-period]').forEach(function(b){b.classList.toggle('active',b.dataset.period===p);});var range=el('dashCustomRange');if(range)range.style.display=p==='custom'?'flex':'none';if(p==='custom'){var today=taipeiDateKey();if(!customDateFrom)customDateFrom=today;if(!customDateTo)customDateTo=today;if(el('dashDateFrom'))el('dashDateFrom').value=customDateFrom;if(el('dashDateTo'))el('dashDateTo').value=customDateTo;}renderDashboard();}
function applyCustomRange(){var from=String((el('dashDateFrom')||{}).value||''),to=String((el('dashDateTo')||{}).value||'');if(!from||!to){notify('請選擇開始日期與結束日期',false);return;}if(from>to){notify('開始日期不能晚於結束日期',false);return;}customDateFrom=from;customDateTo=to;period='custom';document.querySelectorAll('.enterprise-period [data-period]').forEach(function(b){b.classList.toggle('active',b.dataset.period==='custom');});renderDashboard();}
function renderDashboard(){updatePeriodLabels();var list=orders.filter(inPeriod), reportList=list.filter(function(o){return o.excludeFromSalesReport!==true&&o.prepaidRedemption!==true;}), valid=reportList.filter(function(o){return !isCancelled(o);});var revenue=valid.reduce(function(s,o){return s+amount(o);},0), ticketCount=valid.reduce(function(s,o){return s+qty(o);},0), cash=valid.filter(function(o){return payment(o).indexOf('cash')>=0||payment(o).indexOf('現金')>=0;}).reduce(function(s,o){return s+amount(o);},0), line=valid.filter(function(o){return payment(o).indexOf('line')>=0;}).reduce(function(s,o){return s+amount(o);},0);
var stats={dashRevenue:money(revenue),dashTickets:ticketCount+' 張',dashOrders:valid.length+' 筆',dashAverage:money(valid.length?Math.round(revenue/valid.length):0),dashCash:money(cash),dashLine:money(line),dashCancelled:(reportList.length-valid.length)+' 筆',dashTokens:valid.reduce(function(s,o){return s+(Array.isArray(o.items)?o.items.reduce(function(a,i){return a+Number(i.token||0)*Math.max(1,Number(i.qty||i.quantity||1));},0):0);},0)+' 枚'};Object.keys(stats).forEach(function(k){if(el(k))el(k).textContent=stats[k];});
var ticketRank={}, staffRank={}, hourRank={};valid.forEach(function(o){(o.items||[]).forEach(function(i){var name=i.title||i.name||i.ticketName||'其他';ticketRank[name]=(ticketRank[name]||0)+Math.max(1,Number(i.qty||i.quantity||1));});var staff=o.operatorName||(o.createdBy&&o.createdBy.name)||o.staffName||'售票機';staffRank[staff]=(staffRank[staff]||0)+amount(o);var d=parseOrderDate(o);if(d){var h=String(d.getHours()).padStart(2,'0')+':00';hourRank[h]=(hourRank[h]||0)+amount(o);}});
rank('dashTicketRank',ticketRank,'張');rank('dashStaffRank',staffRank,'元');rank('dashHourRank',hourRank,'元');var recent=list.slice().sort(function(a,b){return (parseOrderDate(b)||0)-(parseOrderDate(a)||0);}).slice(0,50);el('dashRecent').innerHTML=recent.length?recent.map(function(o){var d=parseOrderDate(o),id=o.id||o.cloudId||'';return '<div class="enterprise-row"><div><b>'+esc(o.orderNo||o.number||id||'訂單')+'</b><small>'+esc(d?d.toLocaleString('zh-TW'):(o.date||''))+'・'+esc(o.operatorName||o.staffName||'售票機')+'</small></div><div class="enterprise-order-actions"><span class="'+(isCancelled(o)?'void':'')+'">'+(isCancelled(o)?'已作廢 ': '')+money(amount(o))+'</span><button type="button" class="danger" data-order-delete="'+esc(id)+'" '+(!id?'disabled':'')+'>🗑 刪除</button></div></div>';}).join(''):'<div class="enterprise-empty">此期間沒有訂單</div>';}
function rank(id,map,suffix){var rows=Object.keys(map).map(function(k){return [k,map[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,8),max=rows.length?rows[0][1]:1;el(id).innerHTML=rows.length?rows.map(function(r,i){return '<div class="rank-item"><div class="rank-head"><span>'+(i+1)+'. '+esc(r[0])+'</span><b>'+Number(r[1]).toLocaleString('zh-TW')+' '+suffix+'</b></div><div class="rank-bar"><i style="width:'+Math.max(5,Math.round(r[1]/max*100))+'%"></i></div></div>';}).join(''):'<div class="enterprise-empty">尚無資料</div>';}
function sortedTicketIds(){return Object.keys(tickets||{}).sort(function(a,b){var ao=Number(tickets[a]&&tickets[a].sortOrder),bo=Number(tickets[b]&&tickets[b].sortOrder);if(!isFinite(ao))ao=999999;if(!isFinite(bo))bo=999999;if(ao!==bo)return ao-bo;return String(a).localeCompare(String(b));});}
function normalizeTicketOrder(){sortedTicketIds().forEach(function(id,index){tickets[id].sortOrder=index;});}
function ticketArray(){return sortedTicketIds().map(function(id){return {id:id,data:tickets[id]||{}};});}
function ticketImageSrc(value){var v=String(value||'');if(!v)return 'images/ticket-bg.webp';if(v.indexOf('data:')===0||v.indexOf('blob:')===0||v.indexOf('http://')===0||v.indexOf('https://')===0)return v;if(v.indexOf('upload:')===0){var image=ticketImages[v.substring(7)];return image&&image.data?image.data:'images/ticket-bg.webp';}return 'images/'+v;}
function renderTickets(){var q=String((el('ticketSearch')||{}).value||'').toLowerCase(),cat=String((el('ticketCategory')||{}).value||'all'),status=String((el('ticketStatus')||{}).value||'all');var arr=ticketArray().filter(function(x){var t=x.data;return (!q||String(t.title||x.id).toLowerCase().indexOf(q)>=0)&&(cat==='all'||String(t.category||'other')===cat)&&(status==='all'||(status==='on'?t.enable!==false:t.enable===false));});el('ticketSummary').textContent='共 '+Object.keys(tickets).length+' 張｜啟用 '+ticketArray().filter(function(x){return x.data.enable!==false;}).length+' 張';el('enterpriseTicketList').innerHTML=arr.length?arr.map(ticketCard).join(''):'<div class="enterprise-empty">找不到符合條件的票券</div>';}
function ticketCard(x){var t=x.data,id=x.id;return '<article class="enterprise-ticket" data-id="'+esc(id)+'"><div class="ticket-card-top"><img src="'+esc(ticketImageSrc(t.image))+'" onerror="this.src=\'images/ticket-bg.webp\'"><div><input class="ticket-title" data-f="title" value="'+esc(t.title||'未命名票券')+'"><small>'+esc(id)+'</small></div><label class="switch"><input type="checkbox" data-f="enable" '+(t.enable!==false?'checked':'')+'><span></span></label></div><div class="ticket-fields"><label>價格<input type="number" min="0" data-f="price" value="'+Number(t.price||0)+'"></label><label>代幣<input type="number" min="0" data-f="token" value="'+Number(t.token||0)+'"></label><label>分類<select data-f="category"><option value="general" '+(t.category==='general'?'selected':'')+'>一般票</option><option value="special" '+(t.category==='special'?'selected':'')+'>限定票</option><option value="other" '+(!t.category||t.category==='other'?'selected':'')+'>其他票</option></select></label><label>玩具<select data-f="toy"><option value="none" '+(!t.toy||t.toy==='none'?'selected':'')+'>無</option><option value="green" '+(t.toy==='green'?'selected':'')+'>綠標</option><option value="red" '+(t.toy==='red'?'selected':'')+'>紅標</option></select></label><label>時間模式<select data-f="timeMode"><option value="duration" '+((t.timeMode||'duration')==='duration'?'selected':'')+'>⏱ 固定時數</option><option value="fixed" '+(t.timeMode==='fixed'?'selected':'')+'>🕒 到指定時間</option><option value="unlimited" '+(t.timeMode==='unlimited'?'selected':'')+'>∞ 無限時</option><option value="none" '+(t.timeMode==='none'?'selected':'')+'>— 不設定</option></select></label><label>固定時數<input type="number" min="1" max="99" data-f="playHours" value="'+Math.min(99,Math.max(1,Number(t.playHours||t.hour||2)))+'"></label><label>指定時間<input type="time" data-f="fixedExitTime" value="'+esc(t.fixedExitTime||'18:00')+'"></label><label class="wide">圖片檔名<input data-f="image" value="'+esc(t.image||'')+'"></label><label class="wide">櫃台領取商品（一行一項）<textarea data-f="pickupItemsText" placeholder="例如：兒童襪子&#10;飲料一瓶">'+esc(t.pickupItemsText||(Array.isArray(t.pickupItems)?t.pickupItems.join('\n'):'')||(t.pickupItem==='socks'?'襪子':''))+'</textarea></label><label class="wide">櫃台提醒<input data-f="pickupNote" value="'+esc(t.pickupNote||'')+'" placeholder="例如：請詢問襪子尺寸"></label><label class="wide">說明<textarea data-f="description">'+esc(t.description||'')+'</textarea></label><label class="wide"><input type="checkbox" data-f="prepaidBundleEnabled" '+(t.prepaidBundleEnabled===true?'checked':'')+'> 此票券為預存入場套票（購買時本次直接入場）</label><label>預存使用票券<select data-f="prepaidTargetTicketId"><option value="">請選擇</option>'+ticketArray().filter(function(target){return target.id!==id&&target.data.canEnter!==false&&!target.data.prepaidBundleEnabled;}).map(function(target){return '<option value="'+esc(target.id)+'" '+(t.prepaidTargetTicketId===target.id?'selected':'')+'>'+esc(target.data.title||target.id)+'</option>';}).join('')+'</select></label><label>存入剩餘次數<input type="number" min="1" max="99" data-f="prepaidStoredCount" value="'+Math.max(1,Number(t.prepaidStoredCount||3))+'"></label><label>一次發放玩具點數<input type="number" min="0" max="999" data-f="prepaidToyPoints" value="'+Math.max(0,Number(t.prepaidToyPoints||4))+'"></label><label>有效天數<input type="number" min="1" max="3650" data-f="prepaidValidityDays" value="'+Math.max(1,Number(t.prepaidValidityDays||180))+'"></label></div><div class="ticket-actions"><button data-act="up">⬆ 上移</button><button data-act="down">⬇ 下移</button><button data-act="bottom">⏬ 移至最下面</button><button data-act="copy">📄 複製</button><button data-act="delete" class="danger">🗑 刪除</button></div></article>';}
function collectTickets(){document.querySelectorAll('.enterprise-ticket').forEach(function(card){var id=card.dataset.id,t=tickets[id]||{};card.querySelectorAll('[data-f]').forEach(function(f){var k=f.dataset.f;if(k==='image')return;if(k==='enable'||k==='prepaidBundleEnabled')t[k]=f.checked;else if(k==='price'||k==='token'||k==='prepaidStoredCount'||k==='prepaidToyPoints'||k==='prepaidValidityDays')t[k]=Math.max(0,Number(f.value||0));else if(k==='playHours')t[k]=Math.min(99,Math.max(1,Number(f.value||2)));else t[k]=String(f.value||'').trim();});tickets[id]=t;});}
function addTicket(){collectTickets();normalizeTicketOrder();var id='custom_'+Date.now();tickets[id]={title:'新票券',price:0,token:0,toy:'none',category:'other',enable:true,image:'ticket-bg.webp',description:'',pickupItems:[],pickupItemsText:'',pickupNote:'',custom:true,canEnter:false,admissionRequired:false,timeMode:'none',playHours:2,playMinutes:0,fixedExitTime:'',prepaidBundleEnabled:false,prepaidTargetTicketId:'',prepaidStoredCount:3,prepaidToyPoints:4,prepaidValidityDays:180,sortOrder:sortedTicketIds().length};renderTickets();setTimeout(function(){var c=document.querySelector('[data-id="'+id+'"]');if(c)c.scrollIntoView({behavior:'smooth'});},30);}
function ticketAction(e){var btn=e.target.closest('[data-act]');if(!btn)return;collectTickets();normalizeTicketOrder();var card=btn.closest('.enterprise-ticket'),id=card.dataset.id,act=btn.dataset.act,ids=sortedTicketIds(),i=ids.indexOf(id);if(act==='delete'){if(!confirm('確定刪除「'+(tickets[id].title||id)+'」？'))return;delete tickets[id];normalizeTicketOrder();}else if(act==='copy'){var nid='custom_'+Date.now();tickets[nid]=JSON.parse(JSON.stringify(tickets[id]));tickets[nid].title=(tickets[id].title||'票券')+' 複製';tickets[nid].custom=true;tickets[nid].sortOrder=ids.length;}else if(act==='bottom'){if(i<0||i===ids.length-1)return;ids.splice(i,1);ids.push(id);ids.forEach(function(k,order){tickets[k].sortOrder=order;});}else{var j=i+(act==='up'?-1:1);if(j<0||j>=ids.length)return;var tmp=ids[i];ids[i]=ids[j];ids[j]=tmp;ids.forEach(function(k,order){tickets[k].sortOrder=order;});}renderTickets();}
function deleteSingleOrder(id,button){
if(!adminOnly()){alert('只有店長可以刪除訂單');notify('只有店長可以刪除訂單',false);return;}
var target=orders.find(function(o){return String(o.id||o.cloudId||'')===String(id||'');});
if(!target){alert('找不到這筆訂單，請按「重新整理」後再試一次');notify('找不到這筆訂單，請重新整理',false);return;}
var label=target.orderNo||target.number||id;
if(!confirm('確定刪除訂單「'+label+'」？\n\n刪除後會從營業額、票數及報表中扣除，且無法復原。'))return;
if(!window.firebase||!firebase.functions||!firebase.auth){alert('雲端刪除功能尚未連線，請確認手機網路後重開後台');notify('雲端刪除功能尚未連線',false);return;}
if(button){if(button.getAttribute('data-deleting')==='1')return;button.setAttribute('data-deleting','1');button.disabled=true;button.textContent='刪除中…';}
var user=firebase.auth().currentUser;
var callablePromise;
if(!user||user.isAnonymous){callablePromise=Promise.reject(new Error('手機的店長登入已失效，請關閉後台並重新登入 MANAGER'));}
else{
  callablePromise=user.getIdToken(true).then(function(){
    return firebase.app().functions('asia-east1').httpsCallable('staffOrdersV1AdminDelete')({id:id});
  });
}
var timeout=new Promise(function(resolve,reject){setTimeout(function(){reject(new Error('手機連線逾時，請確認網路後再試一次'));},15000);});
Promise.race([callablePromise,timeout]).catch(function(callableError){
  if(!ordersRef)throw callableError;
  return ordersRef.child(id).update({deleted:true,status:'deleted',deletedAt:Date.now(),updatedAt:Date.now(),deletedBy:user&&user.uid||'manager',deleteFallback:true}).then(function(){return {data:{success:true,fallback:true}};}).catch(function(){throw callableError;});
}).then(function(result){
  orders=orders.filter(function(o){return String(o.id||o.cloudId||'')!==String(id);});
  renderDashboard();
  notify('已刪除 '+label+'，報表已重新扣除',true);
  alert('已刪除「'+label+'」\n營業額、票數及報表已重新扣除。');
}).catch(function(err){
  var message=err&&err.message?err.message:'請稍後再試';
  alert('刪除失敗：'+message);
  notify('刪除失敗：'+message,false);
}).then(function(){
  if(button){button.removeAttribute('data-deleting');button.disabled=false;button.textContent='🗑 刪除';}
});
}
function closestDeleteButton(target){while(target&&target!==document){if(target.getAttribute&&target.getAttribute('data-order-delete')!==null)return target;target=target.parentNode;}return null;}
function orderDeleteAction(e){var btn=closestDeleteButton(e.target);if(!btn)return;e.preventDefault();e.stopPropagation();deleteSingleOrder(btn.getAttribute('data-order-delete'),btn);}
function resetAllOrders(){
if(!adminOnly()){notify('只有店長可以重置訂單紀錄',false);return;}
var first=confirm('⚠️ 確定要清除所有訂單紀錄？\n\n包含點餐機、Staff 與 Dashboard 的訂單資料，且無法復原。');
if(!first){notify('已取消重置',false);return;}
var second=confirm('最後確認：真的要永久清除全部訂單嗎？\n\n按「確定」後會立即執行。');
if(!second){notify('已取消重置',false);return;}
var user=(window.MonsterRole&&MonsterRole.getCurrentUser&&MonsterRole.getCurrentUser())||window.currentUser||{};
var audit={action:'order.resetAll',operatorName:user.name||user.displayName||'店長',operatorAccount:user.account||user.username||'manager',createdAt:Date.now(),detail:'清除所有訂單紀錄'};
function clearLocal(){
  orders=[];
  window.salesHistory=[];
  try{salesHistory=[];}catch(e){}
  localStorage.setItem('salesHistory','[]');
  localStorage.removeItem('lastOrder');
  localStorage.removeItem('currentOrder');
  localStorage.removeItem('selectedOrder');
  try{localStorage.setItem('monsterTicketLastReset',JSON.stringify(audit));}catch(e){}
  try{window.dispatchEvent(new StorageEvent('storage',{key:'salesHistory',newValue:'[]'}));}catch(e){}
}
var btn=el('dashResetOrders');
if(btn){btn.disabled=true;btn.textContent='清除中…';}
clearLocal();
function done(message,ok){
  clearLocal();
  renderDashboard();
  if(btn){btn.disabled=false;btn.textContent='🗑 重置全部訂單';}
  notify(message,ok);
}
if(ordersRef){
  var resetAt=audit.createdAt;
  var resetRef=firebase.database().ref(ROOT+'/system/orderResetAt');
  resetRef.set(resetAt).then(function(){
    try{if(window.MonsterOrderCloud&&MonsterOrderCloud.applyGlobalReset){MonsterOrderCloud.applyGlobalReset(resetAt);}}catch(e){}
    return ordersRef.remove();
  }).then(function(){
    try{var logRef=firebase.database().ref(ROOT+'/auditLogs').push();logRef.set(audit);}catch(e){}
    done('所有裝置的訂單紀錄已清除',true);
  }).catch(function(err){
    done('本機已清除，但雲端清除失敗：'+(err&&err.message?err.message:'請檢查權限'),false);
  });
}else{
  done('本機訂單紀錄已清除',true);
}
}
function saveTickets(){collectTickets();normalizeTicketOrder();if(window.MonsterTicketDataSync)tickets=MonsterTicketDataSync.normalizeMap(tickets);var titles={};for(var id in tickets){var title=(tickets[id].title||'').trim();if(!title){notify('票券名稱不可空白',false);return;}if(titles[title]){notify('票券名稱重複：'+title,false);return;}titles[title]=true;if(tickets[id].prepaidBundleEnabled===true){if(!tickets[id].prepaidTargetTicketId||!tickets[tickets[id].prepaidTargetTicketId]){notify('預存套票「'+title+'」必須選擇預存使用票券',false);return;}tickets[id].prepaidStoredCount=Math.max(1,Math.floor(Number(tickets[id].prepaidStoredCount||3)));tickets[id].prepaidToyPoints=Math.max(0,Math.floor(Number(tickets[id].prepaidToyPoints||0)));tickets[id].prepaidValidityDays=Math.max(1,Math.floor(Number(tickets[id].prepaidValidityDays||180)));tickets[id].toy='none';tickets[id].canEnter=true;tickets[id].admissionRequired=true;}var tm=tickets[id].timeMode||'duration';tickets[id].playHours=Math.min(99,Math.max(1,Number(tickets[id].playHours||2)));tickets[id].playMinutes=tm==='duration'?tickets[id].playHours*60:0;tickets[id].hour=tm==='duration'?tickets[id].playHours:0;tickets[id].fixedExitTime=tm==='fixed'?(tickets[id].fixedExitTime||'18:00'):'';if(tickets[id].canEnter===false)tickets[id].timeMode='none';if(window.MonsterRewardEngine)tickets[id]=MonsterRewardEngine.normalizeTicket(tickets[id]);tickets[id].reward=[Number(tickets[id].token)>0?'token':'',tickets[id].toy&&tickets[id].toy!=='none'?'toy':'',tickets[id].canEnter!==false?'band':'',tickets[id].pickupItems&&tickets[id].pickupItems.length?'pickup':''].filter(Boolean).join(',');}
localStorage.setItem('ticketData',JSON.stringify(tickets));if(ticketsRef){var map={};Object.keys(tickets).forEach(function(id){map[id]=Object.assign({id:id,updatedAt:Date.now(),updatedBy:(window.currentUser&&window.currentUser.name)||'manager'},tickets[id]);});ticketsRef.once('value').then(function(snapshot){var cloud=snapshot.val()||{};Object.keys(map).forEach(function(id){if(cloud[id]&&cloud[id].image)map[id].image=cloud[id].image;});return ticketsRef.set(map);}).then(function(){notify('票券設定已儲存並同步（圖片已保留）');}).catch(function(){notify('已存本機，但雲端同步失敗',false);});}else notify('票券設定已儲存在本機');}
function bind(){document.querySelectorAll('[data-enterprise-open]').forEach(function(b){b.addEventListener('click',function(){openPanel(b.dataset.enterpriseOpen);});});el('enterpriseClose').addEventListener('click',closePanel);el('enterpriseOverlay').addEventListener('click',function(e){if(e.target===this)closePanel();});document.querySelectorAll('.enterprise-period [data-period]').forEach(function(b){b.addEventListener('click',function(){setPeriod(b.dataset.period);});});el('ticketSearch').addEventListener('input',renderTickets);el('ticketCategory').addEventListener('change',renderTickets);el('ticketStatus').addEventListener('change',renderTickets);el('ticketAdd').addEventListener('click',addTicket);el('ticketSave').addEventListener('click',saveTickets);el('enterpriseTicketList').addEventListener('click',ticketAction);el('dashRefresh').addEventListener('click',function(){loadDashboardOrders(true);});if(el('dashDateApply'))el('dashDateApply').addEventListener('click',applyCustomRange);if(!deleteListenerBound){deleteListenerBound=true;document.addEventListener('click',orderDeleteAction,true);}var resetBtn=el('dashResetOrders');if(resetBtn)resetBtn.addEventListener('click',resetAllOrders);}
document.addEventListener('DOMContentLoaded',function(){bind();startData();});
window.MonsterEnterpriseManager={open:openPanel,close:closePanel,renderDashboard:renderDashboard,renderTickets:renderTickets,resetAllOrders:resetAllOrders,deleteSingleOrder:deleteSingleOrder,setPeriod:setPeriod,applyCustomRange:applyCustomRange,loadDashboardOrders:loadDashboardOrders};
})();

