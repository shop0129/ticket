"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var payment = read("js/modules/payment.js");
var member = read("js/modules/member.js");
var staff = read("js/staff/staff-app.js");
var queue = read("js/cloud/prepaid-print-queue.js");
var dashboard = read("js/cloud/cloud-dashboard-sync.js");
var enterprise = read("js/staff/enterprise-manager.js");
var html = read("index.html");
var serviceWorker = read("service-worker.js");
var functionsSource = fs.readFileSync(path.resolve(root, "../FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");

assert(payment.indexOf("購買預存入場套票前，請先搜尋並選擇會員") >= 0, "package must require member");
assert(member.indexOf("applyPrepaidBundlePurchase(member, order)") >= 0, "purchase must grant prepaid entries");
assert(member.indexOf("預存套票一次發放") >= 0, "toy points must be issued once at purchase");
assert(member.indexOf("此預存套票已有入場次數被使用") >= 0, "used package must block rollback");
assert(staff.indexOf("staffPrepaidV1Redeem") >= 0, "phone staff page must call secure redemption");
assert(staff.indexOf("MonsterAttendanceGate.requireClockIn") >= 0, "redemption must respect clock-in gate");
assert(queue.indexOf("MonsterReceiptPrinter.printOrder") >= 0, "kiosk must print cloud redemption");
assert(queue.indexOf("prepaidPrintV1Claim") >= 0 && queue.indexOf("prepaidPrintV1Complete") >= 0, "kiosk must use secure print callables");
assert(functionsSource.indexOf("Number(job.attempts || 0) < 3") >= 0, "print retry must be bounded");
assert(functionsSource.indexOf("job.claimedBy !== device.uid") >= 0, "only claiming device may complete a print job");
assert(dashboard.indexOf("order.prepaidRedemption === true") >= 0, "cloud dashboard must exclude redemptions");
assert(enterprise.indexOf("o.prepaidRedemption===true") >= 0, "manager dashboard must exclude redemptions");
assert(/prepaid-print-queue\.js\?v=7833fix4[36]/.test(html), "kiosk must load FIX43 or newer print queue");
assert(serviceWorker.indexOf("./js/cloud/prepaid-print-queue.js") >= 0, "print queue must be cached");

console.log("FIX43 prepaid entry regression tests passed");
