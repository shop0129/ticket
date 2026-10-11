const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "js/staff/staff-app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "staff.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

function expect(value, message) {
    if (!value) {
        throw new Error(message);
    }
}

expect(app.includes("function taipeiDashboardDate()"), "缺少台灣日期計算");
expect(app.includes("cloudDateKey !== taipeiToday.key"), "缺少跨日判斷");
expect(app.includes("!isPreviousDay &&"), "舊日統計未阻擋");
expect(app.includes(": taipeiToday.text;"), "跨日後未顯示今日日期");
expect(html.includes("js/staff/staff-app.js?v=fix38"), "staff-app 未更新快取版本");
expect(serviceWorker.includes("fix38-staff-dashboard-date"), "Service Worker 未更新快取版本");

console.log("FIX38 staff dashboard date rollover test passed");
