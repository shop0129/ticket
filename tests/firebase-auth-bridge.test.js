"use strict";

var assert = require("assert");

function storage() {
    var values = {};
    return {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem: function (key, value) { values[key] = String(value); },
        removeItem: function (key) { delete values[key]; }
    };
}

global.window = global;
global.localStorage = storage();
global.sessionStorage = storage();
global.systemData = { adminPassword: "1234", staffPassword: "0000" };
global.alert = function () {};
global.document = {
    readyState: "complete",
    body: { classList: { add: function () {}, remove: function () {} } },
    addEventListener: function () {},
    getElementById: function () { return null; }
};

var firebaseClaims = { role: "admin", staff: true };
var firebaseUser = {
    uid: "firebase-manager-uid",
    email: "manager@staff.monsterticket.app",
    displayName: "雲端店長",
    isAnonymous: false,
    getIdTokenResult: function () {
        return Promise.resolve({ claims: firebaseClaims });
    }
};

var authObject = {
    currentUser: null,
    signInWithEmailAndPassword: function (email, password) {
        assert.strictEqual(email, "manager@staff.monsterticket.app");
        assert.strictEqual(password, "123456");
        authObject.currentUser = firebaseUser;
        return Promise.resolve({ user: firebaseUser });
    },
    signOut: function () {
        authObject.currentUser = null;
        return Promise.resolve();
    },
    signInAnonymously: function () {
        authObject.currentUser = { uid: "anon", isAnonymous: true };
        return Promise.resolve({ user: authObject.currentUser });
    },
    onAuthStateChanged: function (callback) {
        callback(authObject.currentUser);
        return function () {};
    }
};

global.firebase = {
    apps: [{}],
    auth: function () { return authObject; },
    database: function () {
        return {
            ref: function (path) {
                return {
                    once: function () {
                        assert.ok(path.indexOf("staffUsers/firebase-manager-uid") !== -1);
                        return Promise.resolve({
                            val: function () {
                                return { uid: firebaseUser.uid, account: "manager", name: "雲端店長", role: "admin", enabled: true };
                            }
                        });
                    },
                    push: function () { return Promise.resolve(); },
                    limitToLast: function () { return this; }
                };
            }
        };
    },
    app: function () { return {}; }
};

require("../js/modules/roleManager.js");
require("../js/cloud/firebase-role-config.js");
require("../js/cloud/firebase-role-auth.js");
require("../js/cloud/auth.js");

MonsterAuth.loginAsync("manager", "123456").then(function (success) {
    assert.strictEqual(success, true);
    assert.strictEqual(MonsterAuth.getCurrentRole(), "admin");
    assert.strictEqual(MonsterAuth.getCurrentUser().provider, "firebase");
    assert.strictEqual(MonsterFirebaseRoleAuth.isClaimAdmin(), true);
    assert.strictEqual(MonsterAuth.getActor("staff").name, "雲端店長");
    return MonsterAuth.logout();
}).then(function () {
    firebaseClaims = { role: "admin", staff: false };
    return MonsterFirebaseRoleAuth.login("manager", "123456").then(function () {
        throw new Error("缺少 staff claim 的帳號不應登入成功");
    }).catch(function (error) {
        assert.strictEqual(error.code, "auth/missing-role");
        assert.strictEqual(authObject.currentUser.isAnonymous, true);
    });
}).then(function () {
    console.log("PASS firebase auth bridge: 11 assertions");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});
