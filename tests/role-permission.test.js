"use strict";

var assert = require("assert");

function createStorage() {
    var values = {};
    return {
        getItem: function (key) {
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
        },
        setItem: function (key, value) {
            values[key] = String(value);
        },
        removeItem: function (key) {
            delete values[key];
        },
        clear: function () {
            values = {};
        }
    };
}

global.window = global;
global.localStorage = createStorage();
global.sessionStorage = createStorage();
global.systemData = { adminPassword: "1234", staffPassword: "0000" };
global.alertMessages = [];
global.alert = function (message) {
    global.alertMessages.push(message);
};
global.document = {
    body: {
        classList: {
            add: function () {},
            remove: function () {}
        }
    },
    addEventListener: function () {},
    getElementById: function () {
        return null;
    }
};

require("../js/modules/roleManager.js");
require("../js/cloud/auth.js");

var employees = MonsterRole.getEmployees();
assert.strictEqual(employees.length, 2, "首次啟動應建立店長與員工帳號");

assert.strictEqual(MonsterAuth.login("staff", "0000"), true, "員工應可登入");
assert.strictEqual(MonsterAuth.getCurrentRole(), "staff", "員工角色應正確");
assert.strictEqual(MonsterAuth.hasPermission("order.cancel"), false, "員工不可作廢訂單");
assert.strictEqual(MonsterAuth.hasPermission("capacity.update"), false, "員工不可修改容量");
assert.strictEqual(MonsterAuth.hasPermission("order.reprint"), true, "員工可補印訂單");
assert.strictEqual(MonsterAuth.getActor("staff").name, "員工", "操作人應記錄員工姓名");

MonsterAuth.audit("test.staff", "員工測試", { source: "staff" });
assert.strictEqual(MonsterAuth.getLocalAuditLogs()[0].actorName, "員工", "操作紀錄應包含員工姓名");

MonsterAuth.logout();
assert.strictEqual(MonsterAuth.login("manager", "1234"), true, "店長應可登入");
assert.strictEqual(MonsterAuth.hasPermission("order.cancel"), true, "店長可作廢訂單");
assert.strictEqual(MonsterAuth.hasPermission("capacity.update"), true, "店長可修改容量");
assert.strictEqual(MonsterAuth.hasPermission("data.backup"), true, "店長可備份資料");

console.log("PASS role-permission: 12 assertions");
