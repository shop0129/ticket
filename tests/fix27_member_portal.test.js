"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relative) {
    return fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8");
}

function readPackage(relative) {
    return fs.readFileSync(path.resolve(__dirname, "..", "..", relative), "utf8");
}

const html = read("member.html");
const client = read("js/member-portal.js");
const admin = read("js/cloud/member-portal-admin.js");
const members = read("js/modules/member.js");
const index = read("index.html");
const worker = read("service-worker.js");
const backend = readPackage("functions/index.js");
const deploy = readPackage("tools/deploy-member-portal.ps1");

assert.ok(html.includes("會員自助查詢"));
assert.ok(html.includes('id="memberPortalPin"'));
assert.ok(html.includes('inputmode="numeric"'));
assert.ok(!html.includes('id="memberPortalBirthday"'));
assert.ok(html.includes("memberPortalPasswordForm"));
assert.ok(html.includes("firebase-functions.js"));
assert.ok(!html.includes("firebase-database.js"), "客人頁不可直接讀取會員資料庫");
assert.ok(client.includes('httpsCallable("memberPortalLogin")'));
assert.ok(client.includes('httpsCallable("memberPortalChangePin")'));
assert.ok(!client.includes("localStorage"), "客人頁不可保存手機或密碼");
assert.ok(!client.includes("sessionStorage"), "客人頁不可保存手機或密碼");
assert.ok(admin.includes('httpsCallable("setMemberPortalPin")'));
assert.ok(admin.includes("重設為手機末 4 碼"));
assert.ok(admin.includes("qrcode(0, \"M\")"));
assert.ok(members.includes("舊會員購票仍只輸入手機"));
assert.ok(members.includes("購票時以手機快速加入"));
assert.ok(members.includes("syncDefaultCredential"));
assert.ok(!members.includes("請選擇出生年月日，之後才能用手機查詢點數"));
assert.ok(index.includes("FIX27A MEMBER PIN PORTAL"));
assert.ok(index.includes("member-portal-admin.js?v=7833fix27a"));
assert.ok(worker.includes("7833-fix27a-member-pin-20260803-1-lite1"));
assert.ok(worker.includes('"./member.html"'));
assert.ok(worker.includes('"./js/member-portal.js"'));
assert.ok(backend.includes("pin.auto_create"), "舊會員首次登入應自動建立末四碼密碼");
assert.ok(backend.includes("pin.migrate_from_birthday"), "FIX27 生日憑證應可自動轉換");
assert.ok(backend.includes("mustChangePin"), "初始密碼登入後應提示修改");
assert.ok(deploy.includes("functions:setMemberPortalPin,functions:setMemberPortalBirthday,functions:memberPortalLogin,functions:memberPortalChangePin"));

console.log("PASS FIX27A member PIN portal: 27 assertions");
