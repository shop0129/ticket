// 小怪獸售票機 V7.8.2 Reward Engine
(function(global){'use strict';
function text(v){return String(v==null?'':v).replace(/\r/g,'').trim();}
function lines(v){if(Array.isArray(v))return v.map(text).filter(Boolean);return text(v).split('\n').map(text).filter(Boolean);}
function normalizeTicket(ticket){var t=Object.assign({},ticket||{}),list=lines(t.pickupItemsText||t.pickupItems||'');if(!list.length&&(t.pickupItem==='socks'||(t.reward&&String(t.reward).indexOf('socks')>=0)))list=['襪子'];t.pickupItems=list;t.pickupItemsText=list.join('\n');t.pickupNote=text(t.pickupNote||t.counterNote||'');t.pickupItem=list.length?'custom':'none';return t;}
function aggregate(items){var m={};(items||[]).forEach(function(i){if(!i)return;var q=Math.max(1,Number(i.qty||i.quantity||1)),t=normalizeTicket(i);t.pickupItems.forEach(function(n){m[n]=(m[n]||0)+q;});});return Object.keys(m).map(function(n){return{name:n,qty:m[n]};});}
function notes(items){var out=[];(items||[]).forEach(function(i){var n=normalizeTicket(i).pickupNote;if(n&&out.indexOf(n)<0)out.push(n);});return out;}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function renderHtml(items){var h='';aggregate(items).forEach(function(x){h+='<div>📦 '+esc(x.name)+' × '+x.qty+'</div>';});notes(items).forEach(function(n){h+='<div class="pickup-note">⚠️ 櫃台提醒：'+esc(n)+'</div>';});return h;}
global.MonsterRewardEngine={version:'7.8.2',lines:lines,normalizeTicket:normalizeTicket,aggregate:aggregate,notes:notes,renderHtml:renderHtml};})(window);
