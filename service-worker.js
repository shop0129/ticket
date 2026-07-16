// 小怪獸售票機 V7.3 Phase 3F Part 1
// 離線啟動與同源靜態資源快取；不攔截 Firebase 或其他外部 API。
"use strict";

var CACHE_PREFIX = "monster-ticket-pwa-";
var CACHE_NAME = CACHE_PREFIX + "73f1-20260716-1";
var OFFLINE_PAGE = "./offline.html";
var CORE_ASSETS = [
    "./index.html",
    "./staff.html",
    "./lobby-display.html",
    "./play-display.html",
    "./offline.html",
    "./manifest.webmanifest",
    "./staff.webmanifest",
    "./display.webmanifest",
    "./css/admin-ui.css",
    "./css/display.css",
    "./css/pwa.css",
    "./css/staff.css",
    "./css/style.css",
    "./images/btn-buy-default.png",
    "./images/category-early.png",
    "./images/category-general.png",
    "./images/category-other.png",
    "./images/category-summer.png",
    "./images/home-bg.png",
    "./images/pwa/apple-touch-icon.png",
    "./images/pwa/icon-192.png",
    "./images/pwa/icon-512.png",
    "./images/pwa/icon-maskable-512.png",
    "./images/ticket-2h-green.png",
    "./images/ticket-2h-red.png",
    "./images/ticket-3h-green.png",
    "./images/ticket-3h-red.png",
    "./images/ticket-baby.png",
    "./images/ticket-bg.png",
    "./images/ticket-early.png",
    "./images/ticket-parent.png",
    "./images/ticket-powerbank.png",
    "./images/ticket-summer.png",
    "./images/ticket-token10.png",
    "./images/ticket-token25.png",
    "./js/cloud/auth.js",
    "./js/cloud/cloud-dashboard-sync.js",
    "./js/cloud/cloud-member-sync.js",
    "./js/cloud/cloud-order-lifecycle.js",
    "./js/cloud/cloud-order-sync.js",
    "./js/cloud/cloud-ticket-sync.js",
    "./js/cloud/firebase-config.js",
    "./js/cloud/firebase-connect.js",
    "./js/cloud/v71-migration.js",
    "./js/config/data.js",
    "./js/config/state.js",
    "./js/display.js",
    "./js/modules/businessMode.js",
    "./js/modules/cart.js",
    "./js/modules/dashboard.js",
    "./js/modules/dataManager.js",
    "./js/modules/detail.js",
    "./js/modules/employeeManager.js",
    "./js/modules/hardwareTest.js",
    "./js/modules/history.js",
    "./js/modules/imageManager.js",
    "./js/modules/member.js",
    "./js/modules/operation.js",
    "./js/modules/page.js",
    "./js/modules/payment.js",
    "./js/modules/print.js",
    "./js/modules/roleManager.js",
    "./js/modules/stats.js",
    "./js/modules/systemSetting.js",
    "./js/modules/ticketCatalog.js",
    "./js/modules/ticketManager.js",
    "./js/pwa/pwa-manager.js",
    "./js/script.js",
    "./js/staff/order-center.js",
    "./js/staff/order-tools.js",
    "./js/staff/staff-app.js",
    "./js/staff/staff-config.js",
    "./js/utils/helper.js",
    "./js/utils/legacy-polyfills.js",
    "./js/utils/sound.js",
    "./js/utils/storage.js",
    "./sounds/click.wav",
    "./sounds/success.wav"
];

function cacheCoreAsset(cache, asset) {
    return cache.add(new Request(asset, { cache: "reload" })).catch(function (error) {
        console.warn("[MonsterPWA] 快取失敗", asset, error);
        return null;
    });
}

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return Promise.all(CORE_ASSETS.map(function (asset) {
                return cacheCoreAsset(cache, asset);
            }));
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) {
                    return caches.delete(key);
                }
                return null;
            }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

function fetchWithTimeout(request, timeoutMs) {
    return new Promise(function (resolve, reject) {
        var finished = false;
        var timer = setTimeout(function () {
            if (!finished) {
                finished = true;
                reject(new Error("network-timeout"));
            }
        }, timeoutMs);

        fetch(request).then(function (response) {
            if (finished) {
                return;
            }
            finished = true;
            clearTimeout(timer);
            resolve(response);
        }).catch(function (error) {
            if (finished) {
                return;
            }
            finished = true;
            clearTimeout(timer);
            reject(error);
        });
    });
}

function networkFirstNavigation(request) {
    return caches.open(CACHE_NAME).then(function (cache) {
        return fetchWithTimeout(request, 4500).then(function (response) {
            if (response && response.ok) {
                cache.put(request, response.clone()).catch(function () {});
            }
            return response;
        }).catch(function () {
            return cache.match(request, { ignoreSearch: true }).then(function (cached) {
                return cached || cache.match(OFFLINE_PAGE);
            });
        });
    });
}

function staleWhileRevalidate(event) {
    var request = event.request;
    var cachePromise = caches.open(CACHE_NAME);
    var network = cachePromise.then(function (cache) {
        return fetch(request).then(function (response) {
                if (response && response.ok && response.type === "basic") {
                    cache.put(request, response.clone()).catch(function () {});
                }
                return response;
            }).catch(function () {
                return null;
            });
    });

    event.waitUntil(network.then(function () {}).catch(function () {}));
    return cachePromise.then(function (cache) {
        return cache.match(request, { ignoreSearch: true });
    }).then(function (cached) {
            if (cached) {
                return cached;
            }
            return network.then(function (response) {
                return response || Response.error();
            });
    });
}

self.addEventListener("fetch", function (event) {
    var request = event.request;
    var url;

    if (request.method !== "GET") {
        return;
    }

    url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(event));
});

self.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    if (data.type === "GET_VERSION" && event.source) {
        event.source.postMessage({ type: "PWA_VERSION", version: CACHE_NAME });
    }
});
