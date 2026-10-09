"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var staffHtml = read("staff.html");
var attendance = read("js/staff/attendance.js");
var gate = read("js/staff/attendance-gate.js");
var orderCenter = read("js/staff/order-center.js");
var validator = read("js/staff/ticket-validator.js");
var serviceWorker = read("service-worker.js");

assert.ok(staffHtml.indexOf('id="staffValidationSection"') >= 0);
assert.ok(staffHtml.indexOf('id="staffOrderCenterSection"') >= 0);
assert.ok(staffHtml.indexOf("attendance-gate.js?v=fix35") >= 0);
assert.ok(attendance.indexOf("monster:attendance-state") >= 0);
assert.ok(attendance.indexOf("clockedIn: Boolean(open)") >= 0);
assert.ok(gate.indexOf('role() === "staff"') >= 0);
assert.ok(gate.indexOf("請先按『上班打卡』") >= 0);
assert.ok(gate.indexOf("requireClockIn") >= 0);
assert.ok(orderCenter.indexOf("MonsterAttendanceGate.requireClockIn") >= 0);
assert.ok(validator.indexOf("MonsterAttendanceGate.requireClockIn") >= 0);
assert.ok(serviceWorker.indexOf("fix35-clock-in-required") >= 0);
assert.ok(serviceWorker.indexOf("./js/staff/attendance-gate.js") >= 0);

console.log("PASS FIX35 clock-in required gate");
