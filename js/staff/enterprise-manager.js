(function(){
'use strict';
var ROOT='monsterTicket/v1';
var orders=[], tickets={}, period='today', ordersRef=null, ticketsRef=null;
function el(id){return document.getElementById(id);} function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(v){return 'NT$'+Number(v||0).toLocaleString('zh-TW');}
function notify(msg,ok){var n=el('enterpriseToast');if(!n)return; n.textContent=msg;n.className='enterprise-toast show '+(ok===false?'error':'success');setTimeout(function(){n.className='enterprise-toast';},2200); if(window.navigator&&navigator.vibrate)navigator.vibrate(ok===false?[60,40,60]:35); try{var a=document.getElementById(ok===false?'clickSound':'successSound');if(a){a.currentTime=0;a.play().catch(function(){});}}catch(e){}
}
function adminOnly(){var role=(window.MonsterRole&&MonsterRole.getCurrentRole&&MonsterRole.getCurrentRole())||window.currentUserRole||''; return role==='admin';}
function openPanel(name){if(!adminOnly()){notify('只有店長可以使用此功能',false);return;} var p=el('enterpriseOverlay'); if(!p)return; p.style.display='flex'; document.body.classList.add('enterprise-open'); el('enterpriseDashboardPanel').style.display=name==='dashboard'?'block':'none'; el('enterpriseTicketPanel').style.display=name==='tickets'?'block':'none'; if(name==='dashboard')renderDashboard(); else renderTickets();}
function closePanel(){var p=el('enterpriseOverlay');if(p)p.style.display='none';document.body.classList.remove('enterprise-open');}
function parseOrderDate(o){var raw=o.createdAt||o.timestamp||o.dateTime||o.date; if(typeof raw==='number')return new Date(raw); if(raw&&raw.seconds)return new Date(raw.seconds*1000); if(o.date){var s=String(o.date)+' '+String(o.time||'00:00'); var d=new Date(s.replace(/-/g,'/')); if(!isNaN(d))return d;} return null;}
function inPeriod(o){if(period==='all')return true;var d=parseOrderDate(o);if(!d)return false;var n=new Date();if(period==='month')return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth();return d.toDateString()===n.toDateString();}
function isCancelled(o){return o.status==='cancel'||o.status==='cancelled'||o.cancelled===true||o.voided===true;}
function amount(o){return Number(o.amount||o.total||o.totalAmount||0);}
function qty(o){if(Array.isArray(o.items))return o.items.reduce(function(s,i){return s+Math.max(1,Number(i.qty||i.quantity||1));},0);return Number(o.ticketCount||o.people||1);}
function payment(o){return String(o.payment||o.paymentMethod||'').toLowerCase();}
function loadOrdersLocal(){try{return JSON.parse(localStorage.getItem('salesHistory')||'[]')||[];}catch(e){return [];}}
function normalizeMap(v){if(Array.isArray(v))return v;return Object.keys(v||{}).map(function(k){var x=v[k]||{};if(!x.id)x.id=k;return x;});}
function startData(){orders=loadOrdersLocal(); try{if(window.firebase&&firebase.database){ordersRef=firebase.database().ref(ROOT+'/orders');ordersRef.on('value',function(s){orders=normalizeMap(s.val());renderDashboard();},function(){renderDashboard();});ticketsRef=firebase.database().ref(ROOT+'/tickets');ticketsRef.on('value',function(s){var v=s.val()||{};var clean={};Object.keys(v).forEach(function(k){if(v[k]&&!v[k].deleted){clean[k]=v[k];delete clean[k].id;}});if(Object.keys(clean).length)tickets=clean;else loadTicketsLocal();renderTickets();},function(){loadTicketsLocal();renderTickets();});}else{loadTicketsLocal();}}catch(e){loadTicketsLocal();}}
function loadTicketsLocal(){try{tickets=JSON.parse(localStorage.getItem('ticketData')||'{}')||{};}catch(e){tickets={};}}
function setPeriod(p){period=p;document.querySelectorAll('.enterprise-period button').forEach(function(b){b.classList.toggle('active',b.dataset.period===p);});renderDashboard();}
function renderDashboard(){var list=orders.filter(inPeriod), valid=list.filter(function(o){return !isCancelled(o);});var revenue=valid.reduce(function(s,o){return s+amount(o);},0), ticketCount=valid.reduce(function(s,o){return s+qty(o);},0), cash=valid.filter(function(o){return payment(o).indexOf('cash')>=0||payment(o).indexOf('現金')>=0;}).reduce(function(s,o){return s+amount(o);},0), line=valid.filter(function(o){return payment(o).indexOf('line')>=0;}).reduce(function(s,o){return s+amount(o);},0);
var stats={dashRevenue:money(revenue),dashTickets:ticketCount+' 張',dashOrders:valid.length+' 筆',dashAverage:money(valid.length?Math.round(revenue/valid.length):0),dashCash:money(cash),dashLine:money(line),dashCancelled:(list.length-valid.length)+' 筆',dashTokens:valid.reduce(function(s,o){return s+(Array.isArray(o.items)?o.items.reduce(function(a,i){return a+Number(i.token||0)*Math.max(1,Number(i.qty||i.quantity||1));},0):0);},0)+' 枚'};Object.keys(stats).forEach(function(k){if(el(k))el(k).textContent=stats[k];});
var ticketRank={}, staffRank={}, hourRank={};valid.forEach(function(o){(o.items||[]).forEach(function(i){var name=i.title||i.name||i.ticketName||'其他';ticketRank[name]=(ticketRank[name]||0)+Math.max(1,Number(i.qty||i.quantity||1));});var staff=o.operatorName||(o.createdBy&&o.createdBy.name)||o.staffName||'售票機';staffRank[staff]=(staffRank[staff]||0)+amount(o);var d=parseOrderDate(o);if(d){var h=String(d.getHours()).padStart(2,'0')+':00';hourRank[h]=(hourRank[h]||0)+amount(o);}});
rank('dashTicketRank',ticketRank,'張');rank('dashStaffRank',staffRank,'元');rank('dashHourRank',hourRank,'元');var recent=list.slice().sort(function(a,b){return (parseOrderDate(b)||0)-(parseOrderDate(a)||0);}).slice(0,10);el('dashRecent').innerHTML=recent.length?recent.map(function(o){var d=parseOrderDate(o);return '<div class="enterprise-row"><div><b>'+esc(o.orderNo||o.number||o.id||'訂單')+'</b><small>'+esc(d?d.toLocaleString('zh-TW'):(o.date||''))+'・'+esc(o.operatorName||o.staffName||'售票機')+'</small></div><span class="'+(isCancelled(o)?'void':'')+'">'+(isCancelled(o)?'已作廢 ': '')+money(amount(o))+'</span></div>';}).join(''):'<div class="enterprise-empty">此期間沒有訂單</div>';}
function rank(id,map,suffix){var rows=Object.keys(map).map(function(k){return [k,map[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,8),max=rows.length?rows[0][1]:1;el(id).innerHTML=rows.length?rows.map(function(r,i){return '<div class="rank-item"><div class="rank-head"><span>'+(i+1)+'. '+esc(r[0])+'</span><b>'+Number(r[1]).toLocaleString('zh-TW')+' '+suffix+'</b></div><div class="rank-bar"><i style="width:'+Math.max(5,Math.round(r[1]/max*100))+'%"></i></div></div>';}).join(''):'<div class="enterprise-empty">尚無資料</div>';}
function ticketArray(){return Object.keys(tickets).map(function(id){return {id:id,data:tickets[id]||{}};});}
function renderTickets(){var q=String((el('ticketSearch')||{}).value||'').toLowerCase(),cat=String((el('ticketCategory')||{}).value||'all'),status=String((el('ticketStatus')||{}).value||'all');var arr=ticketArray().filter(function(x){var t=x.data;return (!q||String(t.title||x.id).toLowerCase().indexOf(q)>=0)&&(cat==='all'||String(t.category||'other')===cat)&&(status==='all'||(status==='on'?t.enable!==false:t.enable===false));});el('ticketSummary').textContent='共 '+Object.keys(tickets).length+' 張｜啟用 '+ticketArray().filter(function(x){return x.data.enable!==false;}).length+' 張';el('enterpriseTicketList').innerHTML=arr.length?arr.map(ticketCard).join(''):'<div class="enterprise-empty">找不到符合條件的票券</div>';}
function ticketCard(x){var t=x.data,id=x.id;return '<article class="enterprise-ticket" data-id="'+esc(id)+'"><div class="ticket-card-top"><img src="images/'+esc(t.image||'ticket-bg.png')+'" onerror="this.src=\'images/ticket-bg.png\'"><div><input class="ticket-title" data-f="title" value="'+esc(t.title||'未命名票券')+'"><small>'+esc(id)+'</small></div><label class="switch"><input type="checkbox" data-f="enable" '+(t.enable!==false?'checked':'')+'><span></span></label></div><div class="ticket-fields"><label>價格<input type="number" min="0" data-f="price" value="'+Number(t.price||0)+'"></label><label>代幣<input type="number" min="0" data-f="token" value="'+Number(t.token||0)+'"></label><label>分類<select data-f="category"><option value="general" '+(t.category==='general'?'selected':'')+'>一般票</option><option value="special" '+(t.category==='special'?'selected':'')+'>限定票</option><option value="other" '+(!t.category||t.category==='other'?'selected':'')+'>其他票</option></select></label><label>玩具<select data-f="toy"><option value="none" '+(!t.toy||t.toy==='none'?'selected':'')+'>無</option><option value="green" '+(t.toy==='green'?'selected':'')+'>綠標</option><option value="red" '+(t.toy==='red'?'selected':'')+'>紅標</option></select></label><label class="wide">圖片檔名<input data-f="image" value="'+esc(t.image||'')+'"></label><label class="wide">說明<textarea data-f="description">'+esc(t.description||'')+'</textarea></label></div><div class="ticket-actions"><button data-act="up">⬆ 上移</button><button data-act="down">⬇ 下移</button><button data-act="copy">📄 複製</button><button data-act="delete" class="danger">🗑 刪除</button></div></article>';}
function collectTickets(){document.querySelectorAll('.enterprise-ticket').forEach(function(card){var id=card.dataset.id,t=tickets[id]||{};card.querySelectorAll('[data-f]').forEach(function(f){var k=f.dataset.f;if(k==='enable')t[k]=f.checked;else if(k==='price'||k==='token')t[k]=Math.max(0,Number(f.value||0));else t[k]=String(f.value||'').trim();});tickets[id]=t;});}
function addTicket(){collectTickets();var id='custom_'+Date.now();tickets[id]={title:'新票券',price:0,token:0,toy:'none',category:'other',enable:true,image:'ticket-bg.png',description:'',custom:true};renderTickets();setTimeout(function(){var c=document.querySelector('[data-id="'+id+'"]');if(c)c.scrollIntoView({behavior:'smooth'});},30);}
function ticketAction(e){var btn=e.target.closest('[data-act]');if(!btn)return;collectTickets();var card=btn.closest('.enterprise-ticket'),id=card.dataset.id,act=btn.dataset.act,ids=Object.keys(tickets),i=ids.indexOf(id);if(act==='delete'){if(!confirm('確定刪除「'+(tickets[id].title||id)+'」？'))return;delete tickets[id];}else if(act==='copy'){var nid='custom_'+Date.now();tickets[nid]=JSON.parse(JSON.stringify(tickets[id]));tickets[nid].title=(tickets[id].title||'票券')+' 複製';tickets[nid].custom=true;}else{var j=i+(act==='up'?-1:1);if(j<0||j>=ids.length)return;var tmp=ids[i];ids[i]=ids[j];ids[j]=tmp;var n={};ids.forEach(function(k){n[k]=tickets[k];});tickets=n;}renderTickets();}
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
  ordersRef.remove().then(function(){
    try{var logRef=firebase.database().ref(ROOT+'/auditLogs').push();logRef.set(audit);}catch(e){}
    done('所有訂單紀錄已清除',true);
  }).catch(function(err){
    done('本機已清除，但雲端清除失敗：'+(err&&err.message?err.message:'請檢查權限'),false);
  });
}else{
  done('本機訂單紀錄已清除',true);
}
}
function saveTickets(){collectTickets();var titles={};for(var id in tickets){var title=(tickets[id].title||'').trim();if(!title){notify('票券名稱不可空白',false);return;}if(titles[title]){notify('票券名稱重複：'+title,false);return;}titles[title]=true;tickets[id].reward=[Number(tickets[id].token)>0?'token':'',tickets[id].toy&&tickets[id].toy!=='none'?'toy':''].filter(Boolean).join(',');}
localStorage.setItem('ticketData',JSON.stringify(tickets));if(ticketsRef){var map={};Object.keys(tickets).forEach(function(id){map[id]=Object.assign({id:id,updatedAt:Date.now(),updatedBy:(window.currentUser&&window.currentUser.name)||'manager'},tickets[id]);});ticketsRef.set(map).then(function(){notify('票券設定已儲存並同步');}).catch(function(){notify('已存本機，但雲端同步失敗',false);});}else notify('票券設定已儲存在本機');}
function bind(){document.querySelectorAll('[data-enterprise-open]').forEach(function(b){b.addEventListener('click',function(){openPanel(b.dataset.enterpriseOpen);});});el('enterpriseClose').addEventListener('click',closePanel);el('enterpriseOverlay').addEventListener('click',function(e){if(e.target===this)closePanel();});document.querySelectorAll('.enterprise-period button').forEach(function(b){b.addEventListener('click',function(){setPeriod(b.dataset.period);});});el('ticketSearch').addEventListener('input',renderTickets);el('ticketCategory').addEventListener('change',renderTickets);el('ticketStatus').addEventListener('change',renderTickets);el('ticketAdd').addEventListener('click',addTicket);el('ticketSave').addEventListener('click',saveTickets);el('enterpriseTicketList').addEventListener('click',ticketAction);el('dashRefresh').addEventListener('click',renderDashboard);var resetBtn=el('dashResetOrders');if(resetBtn)resetBtn.addEventListener('click',resetAllOrders);}
document.addEventListener('DOMContentLoaded',function(){bind();startData();});
window.MonsterEnterpriseManager={open:openPanel,close:closePanel,renderDashboard:renderDashboard,renderTickets:renderTickets,resetAllOrders:resetAllOrders};
})();
