const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/modules/businessMode.js','utf8');
const store = {};
const context = {
  window:{}, document:{readyState:'loading',addEventListener(){},getElementById(){return null},body:{appendChild(){}}},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
  setTimeout(){return 1},clearTimeout(){},console,Date,JSON,Promise,alert(){},confirm(){return true}
};
context.window=context;
vm.createContext(context); vm.runInContext(code,context);
const engine=context.MonsterBusinessMode;
function assert(v,m){if(!v) throw new Error(m)}
let cfg=engine.getConfig();
cfg.auto=true; cfg.closedWeekdays=[1]; cfg.specialDates=[]; cfg.seasons=[];
let monday=engine.resolve(new Date('2026-07-20T10:00:00'),cfg); assert(monday.mode==='closed','Monday should close');
let saturday=engine.resolve(new Date('2026-07-18T10:00:00'),cfg); assert(saturday.mode==='holiday','Saturday should holiday');
cfg.seasons=[{name:'暑假',enabled:true,start:'07-01',end:'08-31',mode:'summer'}];
let summer=engine.resolve(new Date('2026-07-22T10:00:00'),cfg); assert(summer.mode==='summer','Summer range should apply');
cfg.specialDates=[{date:'2026-07-22',name:'包場',mode:'event',enabled:true}];
let special=engine.resolve(new Date('2026-07-22T10:00:00'),cfg); assert(special.mode==='event','Special date should have highest priority');
console.log('V7.8 business mode engine tests passed');
