"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

(async function () {
    var deviceUser = { uid: "stable-linepay-device", isAnonymous: true };
    var primaryUser = { uid: "first-kiosk-session", isAnonymous: true };
    var persistenceUsed = "";
    var callableUids = [];
    var deviceAuth = {
        currentUser: deviceUser,
        setPersistence: function (value) {
            persistenceUsed = value;
            return Promise.resolve();
        },
        signOut: function () {
            this.currentUser = null;
            return Promise.resolve();
        },
        signInAnonymously: function () {
            this.currentUser = deviceUser;
            return Promise.resolve({ user: deviceUser });
        }
    };
    var deviceApp = {
        auth: function () { return deviceAuth; },
        functions: function () {
            return {
                httpsCallable: function () {
                    return function () {
                        callableUids.push(deviceAuth.currentUser.uid);
                        return Promise.resolve({ data: { registered: true } });
                    };
                }
            };
        }
    };
    var primaryApp = {
        auth: function () {
            return { currentUser: primaryUser };
        }
    };
    var authFactory = function () {
        return primaryApp.auth();
    };
    authFactory.Auth = { Persistence: { LOCAL: "LOCAL" } };

    var context = {
        console: console,
        Date: Date,
        JSON: JSON,
        Math: Math,
        Promise: Promise,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: function (handler) { handler(); return 1; },
        clearInterval: function () {},
        alert: function () {},
        prompt: function () { return null; },
        localStorage: {
            getItem: function () { return null; },
            setItem: function () {},
            removeItem: function () {}
        },
        document: {
            readyState: "loading",
            addEventListener: function () {},
            getElementById: function () { return null; },
            createElement: function () { return {}; },
            body: { appendChild: function () {} }
        },
        MONSTER_FIREBASE_CONFIG: { projectId: "monsterticket" },
        firebase: {
            auth: authFactory,
            functions: function () {},
            initializeApp: function (config, name) {
                assert.strictEqual(name, "monsterLinePayDeviceV1");
                return deviceApp;
            },
            app: function (name) {
                if (name === "monsterLinePayDeviceV1") return deviceApp;
                return primaryApp;
            }
        }
    };
    context.window = context;
    context.window.addEventListener = function () {};

    vm.runInNewContext(
        fs.readFileSync(path.resolve(__dirname, "../js/cloud/linepay-scanner.js"), "utf8"),
        context,
        { filename: "linepay-scanner.js" }
    );

    await context.MonsterLinePayScanner.health();

    // 模擬同一頁面改登入店長，再登出並取得新的主要匿名 UID。
    primaryUser = { uid: "manager-account", isAnonymous: false };
    primaryUser = { uid: "new-kiosk-session", isAnonymous: true };

    await context.MonsterLinePayScanner.health();

    assert.strictEqual(persistenceUsed, "LOCAL", "LINE Pay 裝置身分必須使用持久保存");
    assert.deepStrictEqual(
        callableUids,
        ["stable-linepay-device", "stable-linepay-device"],
        "店長登入登出後 LINE Pay 裝置 UID 不可改變"
    );
    console.log("PASS FIX39 stable LINE Pay device identity");
}()).catch(function (error) {
    console.error(error);
    process.exit(1);
});
