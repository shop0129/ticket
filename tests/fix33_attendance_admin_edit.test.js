"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var packageRoot = path.resolve(root, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var staffHtml = read("staff.html");
var attendanceUi = read("js/staff/attendance.js");
var attendanceService = read("js/cloud/firebase-attendance-service.js");
var serviceWorker = read("service-worker.js");
var functionsSource = fs.readFileSync(path.join(packageRoot, "FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");

assert.ok(staffHtml.indexOf('id="attendanceEditModal"') >= 0);
assert.ok(staffHtml.indexOf('id="attendanceEditClockIn"') >= 0);
assert.ok(staffHtml.indexOf('id="attendanceEditClockOut"') >= 0);
assert.ok(staffHtml.indexOf("attendance.js?v=fix3") >= 0);
assert.ok(attendanceUi.indexOf("data-attendance-edit") >= 0);
assert.ok(attendanceUi.indexOf("data-attendance-delete") >= 0);
assert.ok(attendanceUi.indexOf("adminUpdate") >= 0);
assert.ok(attendanceUi.indexOf("adminDelete") >= 0);
assert.ok(attendanceService.indexOf("staffAttendanceV1AdminUpdate") >= 0);
assert.ok(attendanceService.indexOf("staffAttendanceV1AdminDelete") >= 0);
assert.ok(functionsSource.indexOf("exports.staffAttendanceV1AdminUpdate") >= 0);
assert.ok(functionsSource.indexOf("exports.staffAttendanceV1AdminDelete") >= 0);
assert.ok(functionsSource.indexOf("requireAdmin(context)") >= 0);
assert.ok(serviceWorker.indexOf("fix33-attendance-admin-edit") >= 0);

console.log("PASS FIX33 attendance admin edit/delete");
