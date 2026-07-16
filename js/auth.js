// =========================================
// 小怪獸售票機 V7.3F Sprint 2 - Auth Core
// Firebase Auth + Role Session + 30 分鐘逾時
// Android WebView 61 相容（ES5）
// =========================================
(function (window, document) {
    "use strict";

    var SESSION_KEY = "monsterAuthSessionV73F";
    var TIMEOUT_MS = 30 * 60 * 1000;
    var CHECK_INTERVAL_MS = 30 * 1000;
    var timer = null;
    var bound = false;

    function now() { return Date.now(); }
    function roleApi() { return window.MonsterRole || null; }
    function cloudUid() {
        return window.MonsterCloud && window.MonsterCloud.uid ? window.MonsterCloud.uid : "";
    }
    function readState() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
        catch (error) { return null; }
    }
    function writeState(state) {
        if (!state) { sessionStorage.removeItem(SESSION_KEY); return; }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    }
    function getUser() {
        var api = roleApi();
        return api && api.getCurrentUser ? api.getCurrentUser() : null;
    }
    function buildState(user) {
        var old = readState() || {};
        return {
            employeeId: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            firebaseUid: cloudUid() || old.firebaseUid || "",
            loginAt: old.employeeId === user.id && old.loginAt ? old.loginAt : now(),
            lastActivityAt: now(),
            expiresAt: now() + TIMEOUT_MS
        };
    }
    function updateDashboard(state) {
        var name = document.getElementById("dashboardCurrentUser");
        var role = document.getElementById("dashboardCurrentRole");
        var login = document.getElementById("dashboardLoginTime");
        if (name) { name.textContent = state ? state.name : "尚未登入"; }
        if (role) { role.textContent = state ? (state.role === "admin" ? "店長" : "員工") : "-"; }
        if (login) { login.textContent = state ? new Date(state.loginAt).toLocaleString("zh-TW") : "-"; }
    }
    function sync() {
        var user = getUser();
        var state;
        if (!user) { writeState(null); updateDashboard(null); return null; }
        state = readState();
        if (!state || state.employeeId !== user.id) {
            state = buildState(user);
            writeState(state);
        } else if (!state.firebaseUid && cloudUid()) {
            state.firebaseUid = cloudUid();
            writeState(state);
        }
        updateDashboard(state);
        return state;
    }
    function isExpired(state) {
        return !!(state && state.expiresAt && now() >= Number(state.expiresAt));
    }
    function expireSession(showMessage) {
        var api = roleApi();
        if (api && api.logout) { api.logout(); }
        writeState(null);
        updateDashboard(null);
        if (window.showPage) { window.showPage("adminLoginPage"); }
        if (showMessage !== false) { alert("登入已超過 30 分鐘未操作，請重新登入。"); }
    }
    function check() {
        var state = sync();
        if (state && isExpired(state)) { expireSession(true); }
    }
    function touch() {
        var user = getUser();
        var state;
        if (!user) { return; }
        state = readState() || buildState(user);
        state.lastActivityAt = now();
        state.expiresAt = now() + TIMEOUT_MS;
        if (!state.firebaseUid && cloudUid()) { state.firebaseUid = cloudUid(); }
        writeState(state);
    }
    function requireLogin() {
        var state = sync();
        if (!state || isExpired(state)) {
            expireSession(false);
            alert("請先登入店長或員工帳號。");
            return false;
        }
        return true;
    }
    function requireOwner() {
        if (!requireLogin()) { return false; }
        if (!window.MonsterRole || !window.MonsterRole.isAdmin()) {
            alert("權限不足：此功能僅限店長使用。");
            return false;
        }
        return true;
    }
    function bindActivity() {
        if (bound) { return; }
        bound = true;
        ["click", "keydown", "touchstart", "mousemove"].forEach(function (name) {
            document.addEventListener(name, touch, true);
        });
    }
    function init() {
        bindActivity();
        sync();
        if (timer) { clearInterval(timer); }
        timer = setInterval(check, CHECK_INTERVAL_MS);
        if (window.MonsterCloud && window.MonsterCloud.onReady) {
            window.MonsterCloud.onReady(function () { sync(); });
        }
        return true;
    }

    window.RoleAuth = {
        version: "7.3F-Sprint2",
        init: init,
        sync: sync,
        touchSession: touch,
        requireLogin: requireLogin,
        requireOwner: requireOwner,
        isOwner: function () { return !!(roleApi() && roleApi().isAdmin()); },
        isStaff: function () { return !!(roleApi() && roleApi().isStaff()); },
        getUser: getUser,
        getRole: function () { var user = getUser(); return user ? user.role : null; },
        getName: function () { var user = getUser(); return user ? user.name : ""; },
        getUID: function () { return cloudUid(); },
        getSession: function () { return readState(); },
        logout: function () { expireSession(false); }
    };

    document.addEventListener("DOMContentLoaded", init);
}(window, document));
