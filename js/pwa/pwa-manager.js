// =========================================
// 小怪獸售票機 V7.3 Phase 3F Part 1
// PWA 安裝／全螢幕／網路狀態／安全更新
// Android WebView 61 相容（ES5）
// =========================================
(function () {
    "use strict";

    var VERSION = "7.3-Phase3F-Part1";
    var deferredInstallPrompt = null;
    var registration = null;
    var refreshing = false;
    var onlineNoticeTimer = null;
    var lastOnline = navigator.onLine !== false;

    function byId(id) {
        return document.getElementById(id);
    }

    function isStandalone() {
        return !!(
            window.navigator.standalone === true ||
            (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
            (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches)
        );
    }

    function isIos() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    }

    function isSecureForServiceWorker() {
        return location.protocol === "https:" ||
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1";
    }

    function createButton(id, label, title) {
        var button = document.createElement("button");
        button.id = id;
        button.type = "button";
        button.textContent = label;
        button.title = title || label;
        button.style.display = "none";
        return button;
    }

    function createUi() {
        var banner;
        var controls;
        var installButton;
        var fullscreenButton;
        var updateButton;

        if (byId("monsterPwaNetworkBanner")) {
            return;
        }

        banner = document.createElement("div");
        banner.id = "monsterPwaNetworkBanner";
        banner.setAttribute("role", "status");
        banner.setAttribute("aria-live", "polite");
        document.body.appendChild(banner);

        controls = document.createElement("div");
        controls.id = "monsterPwaControls";
        controls.setAttribute("aria-label", "應用程式工具");

        installButton = createButton("monsterPwaInstallButton", "安裝到桌面", "將小怪獸系統安裝到桌面");
        fullscreenButton = createButton("monsterPwaFullscreenButton", "全螢幕", "切換全螢幕顯示");
        updateButton = createButton("monsterPwaUpdateButton", "套用新版", "更新至最新版本");

        installButton.addEventListener("click", installApp);
        fullscreenButton.addEventListener("click", toggleFullscreen);
        updateButton.addEventListener("click", applyUpdate);

        controls.appendChild(installButton);
        controls.appendChild(fullscreenButton);
        controls.appendChild(updateButton);
        document.body.appendChild(controls);

        if (isStandalone()) {
            document.body.classList.add("monster-pwa-standalone");
        } else {
            showFullscreenIfSupported();
            if (isIos()) {
                installButton.style.display = "inline-block";
            }
        }
    }

    function showNetworkBanner(text, online, autoHide) {
        var banner = byId("monsterPwaNetworkBanner");
        if (!banner) {
            return;
        }
        if (onlineNoticeTimer) {
            clearTimeout(onlineNoticeTimer);
            onlineNoticeTimer = null;
        }
        banner.textContent = text;
        banner.className = (online ? "is-online " : "") + "is-visible";
        if (autoHide) {
            onlineNoticeTimer = setTimeout(function () {
                banner.className = "";
            }, 2500);
        }
    }

    function updateNetworkState() {
        var online = navigator.onLine !== false;
        document.body.classList.toggle("monster-pwa-offline", !online);
        document.body.classList.toggle("monster-pwa-online", online);
        if (!online) {
            showNetworkBanner("目前離線：可使用已快取畫面，雲端資料將暫停更新", false, false);
        } else if (!lastOnline) {
            showNetworkBanner("網路已恢復，正在重新連線", true, true);
            if (document.body.getAttribute("data-pwa-app") === "display" && !window.firebase) {
                setTimeout(function () { location.reload(); }, 1800);
            }
        }
        lastOnline = online;
    }

    function fullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
    }

    function showFullscreenIfSupported() {
        var button = byId("monsterPwaFullscreenButton");
        var root = document.documentElement;
        if (!button) {
            return;
        }
        if (root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen) {
            button.style.display = "inline-block";
        }
    }

    function toggleFullscreen() {
        var root = document.documentElement;
        var request;
        var exit;
        var result;
        if (fullscreenElement()) {
            exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exit) {
                exit.call(document);
            }
            return;
        }
        request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
        if (request) {
            result = request.call(root);
            if (result && result.catch) {
                result.catch(function () {});
            }
        }
    }

    function installApp() {
        var button = byId("monsterPwaInstallButton");
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then(function () {
                deferredInstallPrompt = null;
                if (button) {
                    button.style.display = "none";
                }
            });
            return;
        }
        if (isIos()) {
            alert("請點 Safari 的分享按鈕，再選擇「加入主畫面」。");
            return;
        }
        alert(isSecureForServiceWorker()
            ? "瀏覽器尚未提供安裝選項，請先重新整理或從瀏覽器選單選擇安裝。"
            : "PWA 安裝需要使用 HTTPS 網址。file:// 本機檔案不能安裝。");
    }

    function showUpdateButton() {
        var button = byId("monsterPwaUpdateButton");
        if (button) {
            button.style.display = "inline-block";
        }
    }

    function applyUpdate() {
        var waiting = registration && registration.waiting;
        if (!waiting) {
            if (registration) {
                registration.update();
            }
            return;
        }
        refreshing = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
    }

    function watchRegistration(reg) {
        registration = reg;
        if (reg.waiting) {
            showUpdateButton();
        }
        reg.addEventListener("updatefound", function () {
            var worker = reg.installing;
            if (!worker) {
                return;
            }
            worker.addEventListener("statechange", function () {
                if (worker.state === "installed" && navigator.serviceWorker.controller) {
                    showUpdateButton();
                }
            });
        });
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator) || !isSecureForServiceWorker()) {
            return;
        }
        navigator.serviceWorker.register("service-worker.js", { scope: "./" }).then(function (reg) {
            watchRegistration(reg);
            setTimeout(function () { reg.update(); }, 5000);
            setInterval(function () { reg.update(); }, 30 * 60 * 1000);
        }).catch(function (error) {
            console.warn("[MonsterPWA] Service Worker 註冊失敗", error);
        });

        navigator.serviceWorker.addEventListener("controllerchange", function () {
            if (refreshing) {
                location.reload();
            }
        });
    }

    function init() {
        createUi();
        updateNetworkState();
        window.addEventListener("online", updateNetworkState);
        window.addEventListener("offline", updateNetworkState);
        window.addEventListener("beforeinstallprompt", function (event) {
            event.preventDefault();
            deferredInstallPrompt = event;
            var button = byId("monsterPwaInstallButton");
            if (button && !isStandalone()) {
                button.style.display = "inline-block";
            }
        });
        window.addEventListener("appinstalled", function () {
            deferredInstallPrompt = null;
            document.body.classList.add("monster-pwa-standalone");
        });
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden && registration) {
                registration.update();
            }
        });
        registerServiceWorker();
    }

    window.MonsterPWA = {
        version: VERSION,
        install: installApp,
        toggleFullscreen: toggleFullscreen,
        applyUpdate: applyUpdate,
        isStandalone: isStandalone,
        isOnline: function () { return navigator.onLine !== false; },
        getRegistration: function () { return registration; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
