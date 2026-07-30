const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('js/core/ticket-data-sync-engine.js','utf8');
const sandbox={window:{},localStorage:{setItem(){}}};sandbox.window=sandbox;vm.runInNewContext(code,sandbox);
const E=sandbox.MonsterTicketDataSync;
assert.equal(E.tokenOf({id:'token25',token:25}),25);
assert.equal(E.tokenOf({id:'token25',token:0}),0);
assert.equal(E.normalizeTicket('x',{tokenCount:12}).token,12);
const n=E.normalizeTicket('x',{token:25,tokenCount:25,coinCount:25});assert.equal(n.token,25);assert.ok(!('tokenCount' in n));
console.log('V7.7.1 ticket data sync tests passed');
