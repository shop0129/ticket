// 小怪獸售票機 V7.7.1 Ticket Data Sync Engine
(function(global){
  'use strict';
  var LEGACY_KEYS=['tokenCount','tokenQty','coin','coinCount','coins'];
  function num(v){v=Number(v);return isFinite(v)&&v>0?Math.floor(v):0;}
  function normalizeTicket(id, source){
    var t=Object.assign({},source||{});
    t.id=t.id||id;
    // token 是唯一正式欄位；舊欄位只在 token 尚未存在時遷移一次。
    if(!Object.prototype.hasOwnProperty.call(t,'token')){
      for(var i=0;i<LEGACY_KEYS.length;i++){
        if(Object.prototype.hasOwnProperty.call(t,LEGACY_KEYS[i])){t.token=num(t[LEGACY_KEYS[i]]);break;}
      }
      if(!Object.prototype.hasOwnProperty.call(t,'token')) t.token=0;
    }
    t.token=num(t.token);
    LEGACY_KEYS.forEach(function(k){delete t[k];});
    return t;
  }
  function normalizeMap(map){
    var out={};Object.keys(map||{}).forEach(function(id){out[id]=normalizeTicket(id,map[id]);});return out;
  }
  function tokenOf(item){return num(item&&item.token);}
  function snapshot(id,ticket){
    var t=normalizeTicket(id,ticket);
    return Object.assign({},t,{id:id,token:t.token});
  }
  function replaceGlobalTicketData(map){
    var clean=normalizeMap(map);
    global.ticketData=clean;
    try{localStorage.setItem('ticketData',JSON.stringify(clean));}catch(e){}
    return clean;
  }
  global.MonsterTicketDataSync={version:'7.7.1',normalizeTicket:normalizeTicket,normalizeMap:normalizeMap,tokenOf:tokenOf,snapshot:snapshot,replaceGlobalTicketData:replaceGlobalTicketData};
})(window);
