"use strict";

var assert = require("assert");
var values = {};

global.window = global;
global.localStorage = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem: function (key, value) { values[key] = String(value); },
    removeItem: function (key) { delete values[key]; }
};
global.sessionStorage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {}
};
global.systemData = { adminPassword: "1234", staffPassword: "0000" };
global.document = {
    body: { classList: { add: function () {}, remove: function () {} } },
    addEventListener: function () {},
    getElementById: function () { return null; }
};

localStorage.setItem("monsterEmployeesV73", JSON.stringify([
    { id: "manager_old", account: "manager", name: "店長", password: "1234", role: "admin", enabled: true },
    { id: "staff_old", account: "staff01", name: "員工01", password: "0000", role: "staff", enabled: true }
]));

require("../js/modules/roleManager.js");

var employees = MonsterRole.getEmployees();
var staff = employees.filter(function (row) { return row.id === "staff_old"; })[0];
assert.strictEqual(staff.account, "staff", "staff01 應自動改為 staff");
assert.strictEqual(staff.name, "員工", "預設員工姓名應同步簡化");
assert.strictEqual(employees.some(function (row) { return row.account === "staff01"; }), false, "不應保留重複的 staff01");
assert.strictEqual(MonsterRole.login("staff", "0000"), true, "遷移後員工應可直接登入");

console.log("PASS simple login migration: 4 assertions");
