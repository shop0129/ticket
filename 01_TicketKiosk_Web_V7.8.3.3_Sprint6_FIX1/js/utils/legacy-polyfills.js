// 小怪獸售票機 V7 Phase 1 - Legacy WebView Polyfills
(function(){
  'use strict';
  if(!String.prototype.replaceAll){String.prototype.replaceAll=function(search,replacement){return this.split(String(search)).join(replacement);};}
  if(!String.prototype.padStart){String.prototype.padStart=function(len,fill){var s=String(this);fill=fill===undefined?' ':String(fill);while(s.length<len){s=fill+s;}return s.slice(-len);};}
  if(!String.prototype.includes){String.prototype.includes=function(search,start){return this.indexOf(search,start||0)!==-1;};}
  if(!String.prototype.startsWith){String.prototype.startsWith=function(search,pos){pos=pos||0;return this.substr(pos,String(search).length)===String(search);};}
  if(!Array.prototype.find){Array.prototype.find=function(fn,thisArg){for(var i=0;i<this.length;i++){if(fn.call(thisArg,this[i],i,this))return this[i];}};}
  if(!Array.prototype.includes){Array.prototype.includes=function(value){return this.indexOf(value)!==-1;};}
  if(!Object.values){Object.values=function(obj){return Object.keys(obj).map(function(k){return obj[k];});};}
  if(!Object.entries){Object.entries=function(obj){return Object.keys(obj).map(function(k){return [k,obj[k]];});};}
  if(!Object.assign){Object.assign=function(target){for(var i=1;i<arguments.length;i++){var src=arguments[i]||{};for(var k in src){if(Object.prototype.hasOwnProperty.call(src,k))target[k]=src[k];}}return target;};}
  if(window.NodeList&&!NodeList.prototype.forEach){NodeList.prototype.forEach=Array.prototype.forEach;}
  if(window.HTMLCollection&&!HTMLCollection.prototype.forEach){HTMLCollection.prototype.forEach=Array.prototype.forEach;}
  if(window.Element&&!Element.prototype.matches){Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector;}
  if(window.Element&&!Element.prototype.closest){Element.prototype.closest=function(selector){var el=this;while(el&&el.nodeType===1){if(el.matches(selector))return el;el=el.parentElement||el.parentNode;}return null;};}
  if(typeof Blob!=='undefined'&&!Blob.prototype.text){Blob.prototype.text=function(){var blob=this;return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result||''));};reader.onerror=function(){reject(reader.error||new Error('檔案讀取失敗'));};reader.readAsText(blob);});};}
})();
