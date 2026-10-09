"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var packageRoot = path.resolve(root, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var staffHtml = read("staff.html");
var manager = read("js/staff/enterprise-manager.js");
var dashboardSync = read("js/cloud/cloud-dashboard-sync.js");
var orderSync = read("js/cloud/cloud-order-sync.js");
var serviceWorker = read("service-worker.js");
var functionsSource = fs.readFileSync(path.join(packageRoot, "FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");

assert.ok(staffHtml.indexOf("最近訂單（可刪除單筆）") >= 0);
assert.ok(staffHtml.indexOf("enterprise-manager.js?v=fix34") >= 0);
assert.ok(manager.indexOf("data-order-delete") >= 0);
assert.ok(manager.indexOf("staffOrdersV1AdminDelete") >= 0);
assert.ok(manager.indexOf("只有店長可以刪除訂單") >= 0);
assert.ok(manager.indexOf("報表已重新扣除") >= 0);
assert.ok(manager.indexOf("!x.deleted") >= 0);
assert.ok(functionsSource.indexOf("exports.staffOrdersV1AdminDelete") >= 0);
assert.ok(functionsSource.indexOf("requireAdmin(context)") >= 0);
assert.ok(functionsSource.indexOf('status: "deleted"') >= 0);
assert.ok(functionsSource.indexOf('action: "order.admin_delete"') >= 0);
assert.ok(orderSync.indexOf("if(!order || order.deleted)") >= 0);
assert.ok(dashboardSync.indexOf("!order.deleted") >= 0);
assert.ok(serviceWorker.indexOf("fix34-single-order-delete") >= 0);

console.log("PASS FIX34 single order delete");
