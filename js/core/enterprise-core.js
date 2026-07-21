// 小怪獸售票機 V7.8.3.3 Sprint 7 Enterprise Core
// 集中版本、事件、日誌、權限與系統狀態。保持 ES5 / Android WebView 相容。
(function (window, document) {
    "use strict";

    var VERSION = "7.8.3.3 S7";
    var BUILD = "20260722-cash-operations-reconciliation";
    var listeners = {};
    var logs = [];
    var MAX_LOGS = 300;

    function nowIso() { return new Date().toISOString(); }
    function copy(value) {
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
    }
    function emit(name, payload) {
        var list = listeners[name] || [];
        var i;
        for (i = 0; i < list.length; i += 1) {
            try { list[i](payload); } catch (error) { log("error", "event-handler", { event: name, message: error.message }); }
        }
    }
    function on(name, handler) {
        if (typeof handler !== "function") { return function () {}; }
        listeners[name] = listeners[name] || [];
        listeners[name].push(handler);
        return function () {
            var index = listeners[name].indexOf(handler);
            if (index >= 0) { listeners[name].splice(index, 1); }
        };
    }
    function log(level, message, data) {
        var row = { time: nowIso(), level: level || "info", message: String(message || ""), data: copy(data || null) };
        logs.unshift(row);
        if (logs.length > MAX_LOGS) { logs.length = MAX_LOGS; }
        try { sessionStorage.setItem("monsterEnterpriseLogsV74", JSON.stringify(logs)); } catch (ignore) {}
        if (window.console && console[row.level]) { console[row.level]("[MonsterEnterprise] " + row.message, row.data || ""); }
        emit("log", row);
        return row;
    }
    function getUser() {
        if (window.MonsterRole && typeof window.MonsterRole.getCurrentUser === "function") {
            return window.MonsterRole.getCurrentUser();
        }
        return window.currentUser || null;
    }
    function role() {
        var user = getUser();
        return user && user.role ? user.role : null;
    }
    var permissions = {
        admin: ["*"],
        staff: ["order.create", "order.read", "member.read", "member.create", "dashboard.read", "ticket.read"]
    };
    function can(permission) {
        var current = role();
        var allowed = permissions[current] || [];
        return allowed.indexOf("*") >= 0 || allowed.indexOf(permission) >= 0;
    }
    function requirePermission(permission, options) {
        options = options || {};
        if (can(permission)) { return true; }
        log("warn", "permission-denied", { permission: permission, user: getUser() });
        if (!options.silent) {
            if (typeof window.showToast === "function") { window.showToast(options.message || "此功能僅限店長使用"); }
            else if (window.alert) { window.alert(options.message || "此功能僅限店長使用"); }
        }
        emit("permission:denied", { permission: permission, user: getUser() });
        return false;
    }
    function networkState() {
        return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
    }
    function firebaseState() {
        if (window.MonsterFirebaseSdkFailed) { return "sdk-error"; }
        if (window.firebase && window.firebase.apps && window.firebase.apps.length) { return "ready"; }
        return "local";
    }
    function health() {
        return {
            version: VERSION,
            build: BUILD,
            online: networkState(),
            firebase: firebaseState(),
            role: role(),
            user: getUser(),
            serviceWorker: !!(navigator && navigator.serviceWorker),
            timestamp: nowIso()
        };
    }
    function renderStatusBadge() {
        var badge = document.getElementById("monsterEnterpriseStatus");
        var state;
        if (!document.body) { return; }
        if (!badge) {
            badge = document.createElement("button");
            badge.id = "monsterEnterpriseStatus";
            badge.type = "button";
            badge.setAttribute("aria-label", "系統狀態");
            badge.style.cssText = "position:fixed;right:10px;bottom:10px;z-index:99999;border:0;border-radius:999px;padding:7px 10px;background:rgba(24,35,52,.88);color:#fff;font:12px/1.2 sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:.86;";
            badge.onclick = function () {
                var info = health();
                window.alert("小怪獸售票機 V" + info.version + "\n網路：" + (info.online ? "正常" : "離線") + "\nFirebase：" + info.firebase + "\n登入：" + (info.user ? info.user.name + "（" + info.user.role + "）" : "未登入"));
            };
            document.body.appendChild(badge);
        }
        state = health();
        badge.textContent = "V" + VERSION + " · " + (state.online ? "ONLINE" : "OFFLINE");
        badge.style.background = state.online ? "rgba(24,35,52,.88)" : "rgba(170,54,54,.92)";
    }
    function boot() {
        // 舊版首頁曾另外建立一個固定版本標籤；新版只保留本狀態標籤。
        var legacyBadge = document.getElementById("v7-phase1-badge");
        if (legacyBadge && legacyBadge.parentNode) { legacyBadge.parentNode.removeChild(legacyBadge); }
        try {
            var saved = sessionStorage.getItem("monsterEnterpriseLogsV74");
            if (saved) { logs = JSON.parse(saved) || []; }
        } catch (ignore) {}
        renderStatusBadge();
        window.addEventListener("online", function () { renderStatusBadge(); emit("network:online", health()); });
        window.addEventListener("offline", function () { renderStatusBadge(); emit("network:offline", health()); });
        window.addEventListener("error", function (event) {
            log("error", "window-error", { message: event.message, file: event.filename, line: event.lineno });
        });
        emit("enterprise:ready", health());
        log("info", "enterprise-ready", health());
    }

    window.MonsterEnterprise = {
        version: VERSION,
        build: BUILD,
        on: on,
        emit: emit,
        log: log,
        getLogs: function () { return copy(logs); },
        getUser: getUser,
        getRole: role,
        can: can,
        require: requirePermission,
        health: health,
        refreshStatus: renderStatusBadge,
        permissions: copy(permissions)
    };

    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); }
    else { boot(); }
}(window, document));
