"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var dashboard = read("js/cloud/cloud-dashboard-sync.js");
var validator = read("js/staff/ticket-validator.js");
var enterprise = read("js/staff/enterprise-manager.js");
var indexHtml = read("index.html");
var staffHtml = read("staff.html");
var serviceWorker = read("service-worker.js");

assert.ok(dashboard.indexOf("TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000") >= 0);
assert.ok(dashboard.indexOf("data.dateKey !== getTodayKey()") >= 0);
assert.ok(dashboard.indexOf("setInterval(refreshBusinessDate,30000)") >= 0);
assert.ok(validator.indexOf("o.checkedOutAt||o.exitTime") >= 0);
assert.ok(validator.indexOf("ticketEventTime(o,'checkedOutAt')") >= 0);
assert.ok(validator.indexOf("updatedAt||o.createdAt") < 0);
assert.ok(enterprise.indexOf("function orderDateKey(o)") >= 0);
assert.ok(enterprise.indexOf("key.slice(0,7)===today.slice(0,7)") >= 0);
assert.ok(indexHtml.indexOf("cloud-dashboard-sync.js?v=fix37") >= 0);
assert.ok(staffHtml.indexOf("enterprise-manager.js?v=fix37") >= 0);
assert.ok(staffHtml.indexOf("ticket-validator.js?v=fix37") >= 0);
assert.ok(serviceWorker.indexOf("fix37-taipei-business-day") >= 0);

console.log("PASS FIX37 Taiwan business day and checkout date filters");
