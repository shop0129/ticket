"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var listeners = {};
var added = [];
var deleted = [];
var claimed = false;
var skipped = false;
var count = 0;

function ok(value, message) {
    assert.ok(value, message);
    count += 1;
}

function response(name) {
    return {
        name: name,
        ok: true,
        type: "basic",
        clone: function () { return response(name + "-clone"); }
    };
}

var cache = {
    add: function (request) {
        added.push(request.url);
        return Promise.resolve();
    },
    put: function () { return Promise.resolve(); },
    match: function (request) {
        var url = typeof request === "string" ? request : request.url;
        if (String(url).indexOf("offline.html") !== -1) {
            return Promise.resolve(response("offline"));
        }
        if (String(url).indexOf("icon-192.png") !== -1) {
            return Promise.resolve(response("cached-icon"));
        }
        if (String(url).indexOf("cloud-order-sync.js") !== -1) {
            return Promise.resolve(response("cached-code"));
        }
        return Promise.resolve(null);
    }
};

global.Request = function (input) {
    this.url = new URL(input, "http://local.test/service-worker.js").href;
};
global.Response = { error: function () { return response("error"); } };
global.caches = {
    open: function () { return Promise.resolve(cache); },
    keys: function () { return Promise.resolve(["monster-ticket-pwa-old", "monster-ticket-pwa-73f1-20260716-1", "monster-ticket-pwa-74-enterprise-748-consume-points-20260717-1", "unrelated"]); },
    delete: function (key) { deleted.push(key); return Promise.resolve(true); }
};
global.self = {
    location: { origin: "http://local.test" },
    clients: { claim: function () { claimed = true; return Promise.resolve(); } },
    skipWaiting: function () { skipped = true; return Promise.resolve(); },
    addEventListener: function (type, listener) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
    }
};

var source = fs.readFileSync(path.resolve(__dirname, "../service-worker.js"), "utf8");
vm.runInThisContext(source, { filename: "service-worker.js" });

(async function () {
    ["install", "activate", "fetch", "message"].forEach(function (type) {
        ok(listeners[type] && listeners[type].length === 1, "缺少 " + type + " listener");
    });

    var installPromise;
    listeners.install[0]({ waitUntil: function (promise) { installPromise = promise; } });
    await installPromise;
    ok(added.length > 70, "install 應快取完整 App Shell");
    ok(added.some(function (url) { return url.indexOf("offline.html") !== -1; }), "install 應快取離線頁");

    var activatePromise;
    listeners.activate[0]({ waitUntil: function (promise) { activatePromise = promise; } });
    await activatePromise;
    ok(deleted.indexOf("monster-ticket-pwa-old") !== -1, "activate 應移除舊 PWA cache");
    ok(deleted.indexOf("monster-ticket-pwa-74-enterprise-748-consume-points-20260717-1") === -1, "activate 不可刪除 V7.4 cache");
    ok(deleted.indexOf("unrelated") === -1, "activate 不可刪除其他 cache");
    ok(claimed, "activate 應 claim clients");

    var externalResponded = false;
    listeners.fetch[0]({
        request: { method: "GET", url: "https://www.gstatic.com/firebase.js", mode: "cors" },
        respondWith: function () { externalResponded = true; }
    });
    ok(!externalResponded, "外部 Firebase 請求不可被攔截");

    global.fetch = function () { return Promise.resolve(response("network-code")); };
    var onlineCodePromise;
    listeners.fetch[0]({
        request: { method: "GET", url: "http://local.test/js/cloud/cloud-order-sync.js", mode: "same-origin" },
        respondWith: function (promise) { onlineCodePromise = promise; },
        waitUntil: function () {}
    });
    var onlineCodeResponse = await onlineCodePromise;
    ok(onlineCodeResponse && onlineCodeResponse.name === "network-code", "連線時程式檔應優先使用網路新版");

    global.fetch = function () { return Promise.reject(new Error("offline")); };
    var offlineCodePromise;
    listeners.fetch[0]({
        request: { method: "GET", url: "http://local.test/js/cloud/cloud-order-sync.js", mode: "same-origin" },
        respondWith: function (promise) { offlineCodePromise = promise; },
        waitUntil: function () {}
    });
    var offlineCodeResponse = await offlineCodePromise;
    ok(offlineCodeResponse && offlineCodeResponse.name === "cached-code", "離線時程式檔應回退至 cache");

    var navigationPromise;
    listeners.fetch[0]({
        request: { method: "GET", url: "http://local.test/unknown", mode: "navigate" },
        respondWith: function (promise) { navigationPromise = promise; }
    });
    var navigationResponse = await navigationPromise;
    ok(navigationResponse && navigationResponse.name === "offline", "離線導覽應回傳 offline.html");

    var staticPromise;
    var backgroundPromise;
    listeners.fetch[0]({
        request: { method: "GET", url: "http://local.test/images/pwa/icon-192.png", mode: "same-origin" },
        respondWith: function (promise) { staticPromise = promise; },
        waitUntil: function (promise) { backgroundPromise = promise; }
    });
    var staticResponse = await staticPromise;
    await backgroundPromise;
    ok(staticResponse && staticResponse.name === "cached-icon", "離線靜態資源應回傳 cache");

    listeners.message[0]({ data: { type: "SKIP_WAITING" } });
    ok(skipped, "確認更新後應呼叫 skipWaiting");

    console.log("PASS service worker behavior: " + count + " assertions");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
