"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var indexHtml = read("index.html");
var staffHtml = read("staff.html");
var packageRoot = path.resolve(root, "..");
var firebaseJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "FIREBASE_STAFF_AUTH/firebase.json"), "utf8"));
var functionsSource = fs.readFileSync(path.join(packageRoot, "FIREBASE_STAFF_AUTH/functions-staff-auth/index.js"), "utf8");
var authBridge = read("js/cloud/auth.js");
var serviceWorker = read("service-worker.js");

assert.ok(indexHtml.indexOf("firebase-role-auth.js?v=fix31") >= 0);
assert.ok(indexHtml.indexOf("firebase-employee-service.js?v=fix31") >= 0);
assert.ok(staffHtml.indexOf("firebase-functions.js") >= 0);
assert.ok(staffHtml.indexOf("firebase-role-auth.js?v=fix31") >= 0);
assert.strictEqual(firebaseJson.functions[0].codebase, "staff-auth");
assert.strictEqual(firebaseJson.functions[0].source, "functions-staff-auth");
assert.ok(functionsSource.indexOf("monsterStaffUsers") >= 0);
assert.ok(functionsSource.indexOf("staffAuthV1BootstrapDefaults") >= 0);
assert.ok(functionsSource.indexOf("staffAuthV1CreateEmployee") >= 0);
assert.ok(functionsSource.indexOf("staffAuthV1ResetEmployeePassword") >= 0);
assert.ok(functionsSource.indexOf("firebasePassword(rawPassword)") >= 0);
assert.ok(authBridge.indexOf("loginAsync") >= 0);
assert.ok(authBridge.indexOf("reauthenticateCurrent") >= 0);
assert.ok(serviceWorker.indexOf("fix31-employee-cloud-sync") >= 0);
assert.ok(serviceWorker.indexOf("./js/cloud/firebase-role-auth.js") >= 0);

var calls = [];
var signInEmail = "";
var signInPassword = "";
var activeProfile = null;
var authObject = {
    currentUser: null,
    setPersistence: function () { return Promise.resolve(); },
    signInWithEmailAndPassword: function (email, password) {
        signInEmail = email;
        signInPassword = password;
        var user = {
            uid: "uid-alex",
            email: email,
            isAnonymous: false,
            getIdTokenResult: function () {
                return Promise.resolve({ claims: { staff: true, role: "staff" } });
            }
        };
        authObject.currentUser = user;
        return Promise.resolve({ user: user });
    },
    signOut: function () { authObject.currentUser = null; return Promise.resolve(); },
    signInAnonymously: function () {
        authObject.currentUser = { uid: "anon", isAnonymous: true };
        return Promise.resolve({ user: authObject.currentUser });
    },
    onAuthStateChanged: function () { return function () {}; }
};
function authFactory() { return authObject; }
authFactory.Auth = { Persistence: { SESSION: "session" } };
authFactory.EmailAuthProvider = { credential: function () { return {}; } };

var firebase = {
    apps: [{}],
    auth: authFactory,
    functions: function () {},
    app: function () {
        return {
            functions: function () {
                return {
                    httpsCallable: function (name) {
                        return function () {
                            calls.push(name);
                            if (name === "staffAuthV1GetProfile") {
                                return Promise.resolve({ data: { account: "alex", name: "阿樂", role: "staff", enabled: true } });
                            }
                            return Promise.resolve({ data: { success: true } });
                        };
                    }
                };
            }
        };
    }
};

var sandbox = {
    console: console,
    Promise: Promise,
    Date: Date,
    Math: Math,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: function () { return 1; },
    clearInterval: function () {},
    alert: function () {},
    firebase: firebase,
    MONSTER_ROLE_CONFIG: { enabled: true, functionsRegion: "asia-east1", staffEmailDomain: "staff.monsterticket.app" },
    MonsterRole: {
        setAuthenticatedUser: function (profile) { activeProfile = profile; return true; },
        getCurrentUser: function () { return activeProfile; }
    },
    document: { readyState: "complete", addEventListener: function () {} }
};
sandbox.window = sandbox;
vm.runInNewContext(read("js/cloud/firebase-role-auth.js"), sandbox, { filename: "firebase-role-auth.js" });

(async function () {
    var profile = await sandbox.MonsterFirebaseRoleAuth.login(" Alex ", "2468");
    await Promise.resolve();
    assert.strictEqual(signInEmail, "alex@staff.monsterticket.app");
    assert.strictEqual(signInPassword, "MonsterStaffV1#2468");
    assert.strictEqual(profile.account, "alex");
    assert.strictEqual(profile.provider, "firebase");
    assert.deepStrictEqual(calls.slice(0, 2), ["staffAuthV1BootstrapDefaults", "staffAuthV1GetProfile"]);
    assert.ok(calls.indexOf("staffAuthV1RecordLogin") >= 0);
    console.log("PASS FIX31 employee cloud sync");
}()).catch(function (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
});
