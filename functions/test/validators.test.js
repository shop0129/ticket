"use strict";

var assert = require("assert");
var validators = require("../lib/validators");

assert.strictEqual(validators.normalizeAccount(" Manager "), "manager");
assert.strictEqual(validators.validateAccount("staff01"), true);
assert.strictEqual(validators.validateAccount("ab"), false);
assert.strictEqual(validators.validateAccount("a/b"), false);
assert.strictEqual(validators.validateRole("admin"), true);
assert.strictEqual(validators.validateRole("staff"), true);
assert.strictEqual(validators.validateRole("owner"), false);
assert.strictEqual(validators.validatePassword("123456"), true);
assert.strictEqual(validators.validatePassword("1234"), false);
assert.strictEqual(validators.accountToEmail("manager"), "manager@staff.monsterticket.app");
assert.strictEqual(validators.accountKey("Manager"), validators.accountKey("manager"));

console.log("PASS firebase role validators: 11 assertions");
