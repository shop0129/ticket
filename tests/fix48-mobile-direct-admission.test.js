"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var project = path.resolve(root, "..");

function read(relative) {
    return fs.readFileSync(path.join(root, relative), "utf8");
}

var staffApp = read("js/staff/staff-app.js");
var staffHtml = read("staff.html");
var queue = read("js/cloud/prepaid-print-queue.js");
var index = read("index.html");
var sw = read("service-worker.js");
var orderCenter = read("js/staff/order-center.js");
var validator = read("js/staff/ticket-validator.js");
var backend = fs.readFileSync(path.join(project, "FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");

var directStart = staffApp.indexOf("function redeemPrepaidEntryDirect");
var directEnd = staffApp.indexOf("function redeemPrepaidEntry(", directStart);
var directSource = staffApp.slice(directStart, directEnd);
var callableStart = backend.indexOf("exports.staffPrepaidV1Redeem");
var callableEnd = backend.indexOf("exports.prepaidPrintV1Claim", callableStart);
var callableSource = backend.slice(callableStart, callableEnd);

assert(directStart >= 0 && directEnd > directStart, "direct prepaid fallback must exist");
assert(!directSource.includes("/printJobs/"), "direct fallback must not enqueue a print job");
assert(directSource.includes('validationStatus:"waiting"'), "direct fallback must create a waiting admission");
assert(directSource.includes('printStatus:"not_required"'), "direct fallback must report receiptless mode");
assert(!callableSource.includes("PRINT_JOB_ROOT"), "cloud redeem must not enqueue a print job");
assert(callableSource.includes('admissionStatus: "waiting"'), "cloud redeem must return waiting state");
assert(staffApp.includes("使用 1 次並等待入場"), "mobile action label must describe waiting admission");
assert(staffApp.includes("已加入「等待入場」，請到驗票中心確認入場"), "mobile success message must explain the next step");
assert(staffHtml.includes("staff-app.js?v=fix48"), "mobile staff script cache must be bumped");
assert(queue.includes("enabled: false"), "kiosk prepaid printing must be disabled");
assert(!queue.includes("httpsCallable"), "disabled queue must not call print functions");
assert(!queue.includes("MonsterReceiptPrinter"), "disabled queue must not connect to the receipt printer");
assert(index.includes("prepaid-print-queue.js?v=7833fix48"), "kiosk queue cache must be bumped");
assert(index.includes("receipt-printer.js?v=7833fix47g"), "normal sales receipt printer must remain enabled");
assert(sw.includes("7833-fix48-mobile-direct-admission"), "service worker cache must be bumped");
assert(orderCenter.includes("確認入場") || validator.includes("確認全部入場"), "mobile backend must keep a direct admission action");
assert(backend.includes("PREPAID_RECEIPT_PRINTING_ENABLED = false"), "cloud print queue must be disabled");
assert(backend.includes("cancelOutstandingPrepaidPrintJobs"), "old pending prepaid print jobs must be neutralized");

console.log("PASS FIX48 mobile direct admission without prepaid receipt");
