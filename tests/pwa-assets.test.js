"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var count = 0;

function check(value, message) {
    assert.ok(value, message);
    count += 1;
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    count += 1;
}

function read(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}

function manifest(file) {
    var data = JSON.parse(read(file));
    count += 1;
    return data;
}

function walk(directory) {
    var absolute = path.join(root, directory);
    var result = [];
    fs.readdirSync(absolute).forEach(function (name) {
        var relative = path.join(directory, name).replace(/\\/g, "/");
        var stat = fs.statSync(path.join(root, relative));
        if (stat.isDirectory()) {
            result = result.concat(walk(relative));
        } else {
            result.push("./" + relative);
        }
    });
    return result;
}

var kiosk = manifest("manifest.webmanifest");
var staff = manifest("staff.webmanifest");
var display = manifest("display.webmanifest");

equal(kiosk.start_url, "./index.html", "Kiosk start_url");
equal(kiosk.display, "fullscreen", "Kiosk 應全螢幕");
equal(staff.start_url, "./staff.html", "Staff start_url");
equal(staff.display, "standalone", "Staff 應獨立視窗");
equal(display.start_url, "./lobby-display.html", "看板 start_url");
equal(display.display, "fullscreen", "看板應全螢幕");

[kiosk, staff, display].forEach(function (data) {
    equal(data.scope, "./", "manifest scope");
    check(Array.isArray(data.icons) && data.icons.length >= 3, "manifest 應包含完整圖示");
    data.icons.forEach(function (icon) {
        check(fs.existsSync(path.join(root, icon.src)), "缺少 manifest icon: " + icon.src);
    });
});

var htmlManifests = {
    "index.html": "manifest.webmanifest",
    "staff.html": "staff.webmanifest",
    "lobby-display.html": "display.webmanifest",
    "play-display.html": "display.webmanifest"
};

Object.keys(htmlManifests).forEach(function (file) {
    var html = read(file);
    check(html.indexOf(htmlManifests[file]) !== -1, file + " manifest 引用錯誤");
    check(html.indexOf("js/pwa/pwa-manager.js") !== -1, file + " 缺少 PWA manager");
    check(html.indexOf("css/pwa.css") !== -1, file + " 缺少 PWA CSS");
    check(html.indexOf("data-pwa-app=") !== -1, file + " 缺少 PWA surface");
});

var worker = read("service-worker.js");
var assetBlock = worker.match(/var CORE_ASSETS = \[([\s\S]*?)\];/);
check(assetBlock, "Service Worker CORE_ASSETS 不存在");
var cached = {};
var assetPattern = /"(\.\/[^"\n]+)"/g;
var match;
while ((match = assetPattern.exec(assetBlock[1]))) {
    cached[match[1]] = true;
    check(fs.existsSync(path.join(root, match[1].slice(2))), "快取檔案不存在: " + match[1]);
}

walk("css").concat(walk("images"), walk("js"), walk("sounds")).forEach(function (file) {
    check(cached[file], "本機執行資源未列入離線快取: " + file);
});

["./index.html", "./staff.html", "./lobby-display.html", "./play-display.html", "./offline.html"].forEach(function (file) {
    check(cached[file], "入口頁未列入離線快取: " + file);
});

check(worker.indexOf("url.origin !== self.location.origin") !== -1, "Service Worker 必須略過外部請求");
check(worker.indexOf("SKIP_WAITING") !== -1, "Service Worker 應支援使用者確認更新");
check(read("js/display.js").indexOf("!window.firebase") !== -1, "看板應支援 Firebase SDK 未載入的離線啟動");

console.log("PASS PWA assets: " + count + " assertions");
