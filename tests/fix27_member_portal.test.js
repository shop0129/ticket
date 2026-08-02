"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relative) {
    return fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8");
}

const html = read("member.html");
const client = read("js/member-portal.js");
const admin = read("js/cloud/member-portal-admin.js");
const members = read("js/modules/member.js");
const index = read("index.html");
const worker = read("service-worker.js");

assert.ok(html.includes("會員自助查詢"));
assert.ok(html.includes('type="date"'));
assert.ok(html.includes("firebase-functions.js"));
assert.ok(!html.includes("firebase-database.js"), "客人頁不可直接讀取會員資料庫");
assert.ok(client.includes('httpsCallable("memberPortalLogin")'));
assert.ok(!client.includes("localStorage"), "客人頁不可保存手機或生日");
assert.ok(!client.includes("sessionStorage"), "客人頁不可保存手機或生日");
assert.ok(admin.includes('httpsCallable("setMemberPortalBirthday")'));
assert.ok(admin.includes("qrcode(0, \"M\")"));
assert.ok(members.includes("舊會員購票仍只輸入手機"));
assert.ok(members.includes("請選擇出生年月日，之後才能用手機查詢點數"));
assert.ok(index.includes("FIX27 MEMBER SELF SERVICE PORTAL"));
assert.ok(index.includes("member-portal-admin.js?v=7833fix27"));
assert.ok(worker.includes("7833-fix27-member-self-service-20260803-1-lite1"));
assert.ok(worker.includes('"./member.html"'));
assert.ok(worker.includes('"./js/member-portal.js"'));

console.log("PASS FIX27 member self-service portal: 16 assertions");
