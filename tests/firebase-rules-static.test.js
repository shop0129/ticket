"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var databaseRules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8"));
var firebaseConfig = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
var firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
var functionsSource = fs.readFileSync(path.join(root, "functions/index.js"), "utf8");
var rules = databaseRules.rules.monsterTicket.v1;

assert.strictEqual(databaseRules.rules[".read"], false, "資料庫根節點不可公開讀取");
assert.strictEqual(databaseRules.rules[".write"], false, "資料庫根節點不可公開寫入");
assert.ok(rules.tickets[".write"].indexOf("role === 'admin'") !== -1, "票券只允許店長寫入");
assert.strictEqual(rules.staffUsers.$uid[".write"], false, "員工 profile 禁止客戶端寫入");
assert.strictEqual(rules.staffAccountIndex[".read"], false, "帳號索引不可由客戶端讀取");
assert.strictEqual(rules.staffAccountIndex[".write"], false, "帳號索引不可由客戶端寫入");
assert.ok(rules.auditLogs.$logId[".write"].indexOf("auth.token.staff === true") !== -1, "稽核紀錄只允許員工新增");
assert.strictEqual(firebaseConfig.functions.source, "functions", "Firebase Functions source 應正確");
assert.ok(firestoreRules.indexOf("request.auth.token.role == 'admin'") !== -1, "Firestore 應驗證店長 claim");
assert.ok(firestoreRules.indexOf("allow write: if false") !== -1, "Firestore 員工 profile 不可由客戶端寫入");
assert.ok(functionsSource.indexOf("exports.createEmployee") !== -1, "應匯出新增員工 Function");
assert.ok(functionsSource.indexOf("exports.updateEmployee") !== -1, "應匯出修改員工 Function");
assert.ok(functionsSource.indexOf("exports.deleteEmployee") !== -1, "應匯出刪除員工 Function");
assert.ok(functionsSource.indexOf("exports.migrateLegacyEmployees") !== -1, "應匯出遷移 Function");
assert.ok(functionsSource.indexOf("revokeRefreshTokens") !== -1, "權限變更應撤銷 refresh token");

console.log("PASS firebase rules static: 15 assertions");
