"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/modules/print.js"), "utf8");
var elements = {};

function element(id) {
    if (!elements[id]) {
        elements[id] = {
            id: id,
            innerHTML: "",
            style: {},
            classList: {
                add: function () {},
                remove: function () {}
            }
        };
    }
    return elements[id];
}

var context = {
    console: console,
    Date: Date,
    Math: Math,
    Promise: Promise,
    setTimeout: setTimeout,
    clearInterval: clearInterval,
    setInterval: setInterval,
    document: {
        getElementById: element,
        querySelector: function (selector) {
            return element(selector);
        }
    }
};
context.window = context;

vm.runInNewContext(source, context, { filename: "print.js" });

assert.strictEqual(context.calculateReceiptProgress(0), 0);
assert.ok(
    context.calculateReceiptProgress(600) >= 35,
    "600ms 時畫面應已有清楚可見的進度"
);
assert.ok(
    context.calculateReceiptProgress(1800) >= 80,
    "列印中段時畫面應持續推進"
);
assert.strictEqual(
    context.calculateReceiptProgress(3600),
    94,
    "控制器確認前最多只能顯示 94%"
);
assert.strictEqual(
    context.calculateReceiptProgress(5000),
    94,
    "等待控制器回覆時不可誤報 100%"
);
assert.ok(
    source.indexOf("finishPrintAnimation(targetOrder, true)") >= 0,
    "收到實體列印完成回覆後應直接切到 100%"
);
assert.ok(
    source.indexOf("Math.floor(Math.random()") < 0,
    "FIX8 不再使用隨機假進度"
);

console.log("PASS FIX8 receipt progress: 7 checks");
