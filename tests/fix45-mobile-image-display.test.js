const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manager = fs.readFileSync(path.join(root, 'js/staff/enterprise-manager.js'), 'utf8');
const staff = fs.readFileSync(path.join(root, 'staff.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function expect(value, message) {
  if (!value) throw new Error(message);
}

expect(manager.includes("ROOT+'/ticketImages'"), '手機後台未訂閱雲端圖片庫');
expect(manager.includes("v.indexOf('upload:')===0"), '手機後台未解析 upload 圖片代碼');
expect(manager.includes("image&&image.data?image.data"), '手機後台未使用雲端圖片資料');
expect(manager.includes("if(k==='image')return"), 'FIX44 圖片防覆蓋保護遺失');
expect(staff.includes('enterprise-manager.js?v=fix45'), 'staff.html 未更新 FIX45 版本');
expect(sw.includes('7833-fix45-mobile-image-display-20261019-1'), 'service worker 未更新 FIX45 快取');

console.log('FIX45 mobile image display test passed');
