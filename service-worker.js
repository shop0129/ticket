// 小怪獸售票機 V7.8.3.3 Sprint 9 Receipt
// 離線啟動與同源靜態資源快取；不攔截 Firebase 或其他外部 API。
"use strict";

var CACHE_PREFIX = "monster-ticket-pwa-";
var CACHE_NAME = CACHE_PREFIX + "7833-sprint9-qr-scanner-fix1-20260724-1";
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
    "./css/cash-bridge.css",
    "./css/cash-operations.css",
    "./css/operations-s8.css",
    "./css/receipt-printer.css",
    "./css/display.css",
    "./css/pwa.css",
    "./css/staff.css",
    "./css/staff-enterprise.css",
    "./css/staff-feedback.css",
    "./css/style.css",
    "./css/mobile-enterprise.css",
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
    "./images/ticket-big.png",
    "./images/ticket-early.png",
    "./images/ticket-parent.png",
    "./images/ticket-powerbank.png",
    "./images/ticket-small.png",
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
    "./js/core/enterprise-core.js",
    "./js/core/enterprise-bridge.js",
    "./js/core/enterprise-guards.js",
    "./js/core/reward-engine.js",
    "./js/core/void-protection.js",
    "./js/core/ticket-data-sync-engine.js",
    "./js/core/ticket-status-engine.js",
    "./js/core/live-timer-engine.js",
    "./js/core/sale-rule-engine.js",
    "./js/display.js",
    "./js/hardware/cash-bridge.js",
    "./js/hardware/cash-operations.js",
    "./js/hardware/receipt-printer.js",
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
    "./js/modules/consumePoints.js",
    "./js/modules/operation.js",
    "./js/modules/testDataCleanup.js",
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
    "./js/staff/staff-feedback.js",
    "./js/staff/enterprise-manager.js",
    "./js/staff/consume-points-manager.js",
    "./js/utils/helper.js",
    "./js/utils/legacy-polyfills.js",
    "./js/utils/sound.js",
    "./js/utils/storage.js",
    "./sounds/click.wav",
    "./sounds/success.wav",
    "./js/vendor-qrcode.js",
    "./js/modules/ticketValidation.js",
    "./js/staff/ticket-validator.js"
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
        }).then(function () {
            // 部署後立即接管，避免已安裝的點餐機 PWA 繼續執行舊付款程式。
            return self.skipWaiting();
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

function networkFirstCodeAsset(request) {
    return caches.open(CACHE_NAME).then(function (cache) {
        return fetchWithTimeout(request, 3500).then(function (response) {
            if (response && response.ok && response.type === "basic") {
                cache.put(request, response.clone()).catch(function () {});
            }
            return response;
        }).catch(function () {
            return cache.match(request, { ignoreSearch: true }).then(function (cached) {
                return cached || Response.error();
            });
        });
    });
}

function isCodeAsset(url) {
    return /\.(?:js|css|html|webmanifest)$/i.test(url.pathname);
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

    // 程式與樣式連線時優先抓最新版，避免部署後仍執行舊同步邏輯。
    if (isCodeAsset(url)) {
        event.respondWith(networkFirstCodeAsset(request));
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
