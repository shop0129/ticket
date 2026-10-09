"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var packageRoot = path.resolve(root, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var staffHtml = read("staff.html");
var staffApp = read("js/staff/staff-app.js");
var attendanceUi = read("js/staff/attendance.js");
var attendanceService = read("js/cloud/firebase-attendance-service.js");
var serviceWorker = read("service-worker.js");
var functionsSource = fs.readFileSync(path.join(packageRoot, "FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");

assert.ok(staffHtml.indexOf('id="attendanceClockInButton"') >= 0);
assert.ok(staffHtml.indexOf('id="attendanceClockOutButton"') >= 0);
assert.ok(staffHtml.indexOf('id="attendanceAdminList"') >= 0);
assert.ok(staffHtml.indexOf("firebase-attendance-service.js?v=fix32") >= 0);
assert.ok(staffHtml.indexOf("attendance.js?v=fix32") >= 0);
assert.ok(staffApp.indexOf("MonsterAttendanceUI.activate") >= 0);
assert.ok(attendanceUi.indexOf("formatDuration") >= 0);
assert.ok(attendanceUi.indexOf("adminReport") >= 0);
assert.ok(attendanceService.indexOf("staffAttendanceV1ClockIn") >= 0);
assert.ok(attendanceService.indexOf("staffAttendanceV1ClockOut") >= 0);
assert.ok(functionsSource.indexOf("staffAttendanceV1AdminReport") >= 0);
assert.ok(functionsSource.indexOf("monsterStaffClockStates") >= 0);
assert.ok(serviceWorker.indexOf("fix32-employee-attendance") >= 0);
assert.ok(serviceWorker.indexOf("./js/staff/attendance.js") >= 0);

console.log("PASS FIX32 employee attendance");
