"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var count = 0;

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function ok(condition, message) {
    if (!condition) throw new Error("FAIL: " + message);
    count += 1;
}

var css = read("css/linepay-scanner.css");
var scanner = read("js/cloud/linepay-scanner.js");
var index = read("index.html");
var enterprise = read("js/core/enterprise-core.js");
var worker = read("service-worker.js");

ok(!/(?:^|\n)\s*inset\s*:/.test(css), "不可依賴 WebView 61 不支援的 inset");
["top", "right", "bottom", "left"].forEach(function (edge) {
    ok(new RegExp("\\n\\s*" + edge + ":\\s*0;").test(css), "CSS 應固定 " + edge + " 邊界");
});
ok(css.indexOf("width: 740px") >= 0 && css.indexOf("max-width: 94vw") >= 0,
    "卡片寬度應提供不使用 CSS min() 的相容寫法");
ok(scanner.indexOf("applyLegacyWebViewOverlayLayout") >= 0,
    "JS 應提供舊版 WebView 彈窗保護");
ok(scanner.indexOf('overlay.style.display = "flex"') >= 0,
    "顯示彈窗時應以行內 display 避免舊快取遮蔽");
ok(scanner.indexOf('overlay.style.display = "none"') >= 0,
    "關閉彈窗時應同步清除行內顯示");
ok(index.indexOf("FIX26F LINEPAY WEBVIEW OVERLAY REPAIR") >= 0,
    "首頁應標示 FIX26F");
ok(index.indexOf("linepay-scanner.css?v=7833fix26f") >= 0,
    "LINE Pay 樣式應使用 FIX26F 快取版本");
ok(index.indexOf("linepay-scanner.js?v=7833fix26f") >= 0,
    "LINE Pay 程式應使用 FIX26F 快取版本");
ok(enterprise.indexOf('var BUILD = "FIX26F"') >= 0,
    "右下角版本應顯示 FIX26F");
ok(worker.indexOf("7833-fix26f-linepay-webview-overlay-20260731-1") >= 0,
    "Service Worker 應切換 FIX26F 快取");

console.log("PASS FIX26F LINE Pay WebView overlay: " + count + " assertions");
