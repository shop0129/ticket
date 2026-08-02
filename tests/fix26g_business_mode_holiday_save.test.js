"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var store = {};
var alerts = [];
var closedInputs = [
    { checked:false, getAttribute:function(){return "1";} },
    { checked:true, getAttribute:function(){return "3";} },
    { checked:true, getAttribute:function(){return "5";} }
];
var elements = {
    autoMode:{checked:true},
    bmWeekdayMode:{value:"weekday"},
    bmWeekendMode:{value:"holiday"},
    bmManualMode:{value:"weekday"}
};
var document = {
    readyState:"loading",
    addEventListener:function(){},
    getElementById:function(id){return elements[id]||null;},
    createElement:function(){
        return {id:"",className:"",innerHTML:"",classList:{toggle:function(){}}};
    },
    querySelectorAll:function(selector){
        if(selector === "[data-bm-closed]") return closedInputs;
        return [];
    },
    querySelector:function(){return null;},
    body:{appendChild:function(element){elements[element.id]=element;}}
};
var context = {
    window:{},document:document,
    localStorage:{
        getItem:function(key){return Object.prototype.hasOwnProperty.call(store,key)?store[key]:null;},
        setItem:function(key,value){store[key]=String(value);}
    },
    setTimeout:function(){return 1;},clearTimeout:function(){},
    console:console,Date:Date,JSON:JSON,Math:Math,Promise:Promise,
    alert:function(message){alerts.push(message);},confirm:function(){return true;}
};
context.window=context;

var future = Date.now()+86400000;
store.businessMode=JSON.stringify({
    auto:true,mode:"weekday",weekdayMode:"weekday",weekendMode:"holiday",
    closedWeekdays:[1],seasons:[],specialDates:[],openingHours:{},updatedAt:future
});

var source=fs.readFileSync(path.resolve(__dirname,"../js/modules/businessMode.js"),"utf8");
vm.createContext(context);
vm.runInContext(source,context);

assert.deepStrictEqual(Array.from(context.MonsterBusinessMode.normalizeClosedWeekdays({0:4})),[4]);
assert.deepStrictEqual(Array.from(context.MonsterBusinessMode.normalizeClosedWeekdays({2:true,6:true})),[2,6]);
assert.deepStrictEqual(Array.from(context.MonsterBusinessMode.normalizeClosedWeekdays("")),[]);

context.saveBusinessMode();
var saved=JSON.parse(store.businessMode);
assert.deepStrictEqual(saved.closedWeekdays,[3,5],"應保存星期三與星期五");
assert.strictEqual(saved.closedWeekdaysCsv,"3,5","應保存穩定字串格式");
assert.ok(saved.updatedAt>future,"新版號必須高於原本較新的遠端時間");

closedInputs.forEach(function(input){input.checked=false;});
context.saveBusinessMode();
saved=JSON.parse(store.businessMode);
assert.deepStrictEqual(saved.closedWeekdays,[],"應允許完全不設固定公休日");
assert.strictEqual(saved.closedWeekdaysCsv,"","空白選擇必須保持空白，不可回復星期一");

var storageSource=fs.readFileSync(path.resolve(__dirname,"../js/utils/storage.js"),"utf8");
assert.ok(storageSource.indexOf("function saveBusinessMode()")===-1,"舊版同名儲存函式必須移除");
assert.ok(source.indexOf("ref.once(\"value\")")>=0,"雲端儲存後必須回讀核對");

console.log("PASS FIX26G business mode holiday save: 10 assertions");
