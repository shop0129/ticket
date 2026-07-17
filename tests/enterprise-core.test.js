const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let count = 0;
function ok(value, message) { assert.ok(value, message); count += 1; }
const source = fs.readFileSync(path.resolve(__dirname, '../js/core/enterprise-core.js'), 'utf8');
const elements = {};
const body = { appendChild: function (el) { elements[el.id] = el; } };
const document = {
  readyState: 'complete', body,
  getElementById: id => elements[id] || null,
  createElement: () => ({ style: {}, setAttribute(){}, removeAttribute(){} }),
  addEventListener(){}
};
const session = {};
const window = {
  document,
  console: { info(){}, warn(){}, error(){}, log(){} },
  sessionStorage: { getItem:k=>session[k]||null, setItem:(k,v)=>session[k]=v },
  navigator: { onLine:true, serviceWorker:{} },
  addEventListener(){}, alert(){}, currentUser:{name:'店長',role:'admin'}
};
const context = { window, document, navigator:window.navigator, sessionStorage:window.sessionStorage, console:window.console, Date, JSON, setTimeout, clearTimeout };
vm.runInNewContext(source, context);
ok(window.MonsterEnterprise.version === '7.4.0', '應載入 V7.4 版本');
ok(window.MonsterEnterprise.can('system.settings') === true, '店長應擁有完整權限');
window.currentUser = {name:'員工',role:'staff'};
ok(window.MonsterEnterprise.can('order.create') === true, '員工應可售票');
ok(window.MonsterEnterprise.can('system.settings') === false, '員工不可修改系統設定');
ok(window.MonsterEnterprise.health().online === true, '健康狀態應回報網路');
ok(!!elements.monsterEnterpriseStatus, '應建立版本狀態指示');
console.log('PASS enterprise core: ' + count + ' assertions');
