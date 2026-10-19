const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manager = fs.readFileSync(path.join(root, 'js/staff/enterprise-manager.js'), 'utf8');
const staff = fs.readFileSync(path.join(root, 'staff.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(manager.indexOf("if(k==='image')return") >= 0, 'mobile collector must not edit image');
ok(manager.indexOf("ticketsRef.once('value')") >= 0, 'save must read cloud before writing');
ok(manager.indexOf("map[id].image=cloud[id].image") >= 0, 'save must preserve cloud image');
ok(manager.indexOf('圖片已保留') >= 0, 'success message must confirm image protection');
ok(staff.indexOf('enterprise-manager.js?v=fix44') >= 0, 'staff must load FIX44 manager');
ok(sw.indexOf('7833-fix44-mobile-image-protection') >= 0, 'service worker cache must be bumped');

console.log('FIX44 mobile image protection tests passed');
