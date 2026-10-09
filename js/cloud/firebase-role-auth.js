// =========================================
// 小怪獸售票機 FIX31 - Firebase 員工雲端登入
// Android WebView 61 / Firebase 8.x 相容
// =========================================
(function () {
    "use strict";

    var config = window.MONSTER_ROLE_CONFIG || {};
    var currentClaims = null;
    var idleTimer = null;
    var lastActivityAt = Date.now();
    var trackingStarted = false;

    function normalizeAccount(value) {
        return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    }

    function accountToEmail(account) {
        return normalizeAccount(account) + "@" + (config.staffEmailDomain || "staff.monsterticket.app");
    }

    // Firebase Auth 原生密碼至少 6 碼；加固定版本前綴後仍保留介面原有的 4 碼密碼。
    function firebasePassword(password) {
        return "MonsterStaffV1#" + String(password || "");
    }

    function ready() {
        return !!(window.firebase && firebase.apps && firebase.apps.length && firebase.auth && firebase.functions);
    }

    function callFunction(name, data) {
        if (!ready()) {
            return Promise.reject({ code: "functions/unavailable", message: "Firebase 員工登入尚未完成連線" });
        }
        return firebase.app().functions(config.functionsRegion || "asia-east1").httpsCallable(name)(data || {}).then(function (result) {
            return result && result.data !== undefined ? result.data : result;
        });
    }

    function publicProfile(user, claims, profile) {
        return {
            id: user.uid,
            uid: user.uid,
            account: profile.account || String(user.email || "").split("@")[0],
            name: profile.name || user.displayName || (claims.role === "admin" ? "店長" : "員工"),
            role: claims.role,
            enabled: profile.enabled !== false,
            provider: "firebase",
            loginAt: new Date().toISOString()
        };
    }

    function activate(user, forceRefresh) {
        if (!user || user.isAnonymous) {
            return Promise.reject({ code: "auth/not-staff-user", message: "目前不是員工帳號" });
        }
        return user.getIdTokenResult(forceRefresh === true).then(function (tokenResult) {
            var claims = tokenResult.claims || {};
            if (claims.staff !== true || (claims.role !== "admin" && claims.role !== "staff")) {
                throw { code: "auth/missing-role", message: "此帳號尚未設定店長／員工權限" };
            }
            return callFunction("staffAuthV1GetProfile", {}).then(function (profile) {
                if (!profile || profile.enabled === false) {
                    throw { code: "auth/user-disabled", message: "此員工帳號已停用" };
                }
                currentClaims = claims;
                if (!window.MonsterRole || !MonsterRole.setAuthenticatedUser || !MonsterRole.setAuthenticatedUser(publicProfile(user, claims, profile))) {
                    throw { code: "auth/profile-invalid", message: "員工資料格式不正確" };
                }
                startIdleTimeout();
                return MonsterRole.getCurrentUser();
            });
        });
    }

    function ensureAnonymousKiosk() {
        if (!window.firebase || !firebase.auth || !firebase.apps || !firebase.apps.length) {
            return Promise.resolve(null);
        }
        if (firebase.auth().currentUser) {
            return Promise.resolve(firebase.auth().currentUser);
        }
        return firebase.auth().signInAnonymously().then(function (credential) {
            return credential.user;
        });
    }

    function signIn(account, password) {
        return firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION).then(function () {
            return firebase.auth().signInWithEmailAndPassword(accountToEmail(account), firebasePassword(password));
        });
    }

    function login(account, password) {
        var normalized = normalizeAccount(account);
        if (!ready()) {
            return Promise.reject({ code: "auth/firebase-not-ready", message: "Firebase 員工登入尚未完成連線" });
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(normalized)) {
            return Promise.reject({ code: "auth/invalid-account", message: "帳號格式不正確" });
        }
        if (String(password || "").length < 4) {
            return Promise.reject({ code: "auth/weak-password", message: "密碼至少需要 4 碼" });
        }
        // 此呼叫具冪等性：僅在雲端完全沒有員工時建立 manager / staff 預設帳號。
        return callFunction("staffAuthV1BootstrapDefaults", {}).then(function () {
            return signIn(normalized, password);
        }).then(function (credential) {
            return activate(credential.user, true);
        }).then(function (profile) {
            callFunction("staffAuthV1RecordLogin", {}).catch(function () {});
            return profile;
        }).catch(function (error) {
            if (firebase.auth().currentUser && !firebase.auth().currentUser.isAnonymous) {
                return firebase.auth().signOut().catch(function () {}).then(ensureAnonymousKiosk).then(function () {
                    throw error;
                });
            }
            throw error;
        });
    }

    function restoreSession() {
        if (!ready()) {
            return Promise.resolve(false);
        }
        return new Promise(function (resolve) {
            var finished = false;
            var timer = setTimeout(function () {
                if (!finished) {
                    finished = true;
                    resolve(false);
                }
            }, 8000);
            var unsubscribe = firebase.auth().onAuthStateChanged(function (user) {
                if (finished) { return; }
                finished = true;
                clearTimeout(timer);
                if (unsubscribe) { unsubscribe(); }
                if (!user || user.isAnonymous) {
                    resolve(false);
                    return;
                }
                activate(user, false).then(function () {
                    resolve(true);
                }).catch(function () {
                    firebase.auth().signOut().catch(function () {}).then(ensureAnonymousKiosk).then(function () {
                        resolve(false);
                    });
                });
            }, function () {
                if (!finished) {
                    finished = true;
                    clearTimeout(timer);
                    resolve(false);
                }
            });
        });
    }

    function logout() {
        stopIdleTimeout();
        currentClaims = null;
        if (!window.firebase || !firebase.auth || !firebase.apps || !firebase.apps.length) {
            return Promise.resolve();
        }
        return firebase.auth().signOut().then(ensureAnonymousKiosk);
    }

    function reauthenticate(password) {
        var user = ready() ? firebase.auth().currentUser : null;
        if (!user || user.isAnonymous || !user.email) {
            return Promise.reject({ code: "auth/no-current-user", message: "請先重新登入店長帳號" });
        }
        return user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, firebasePassword(password))).then(function () {
            return true;
        });
    }

    function stopIdleTimeout() {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
    }

    function noteActivity() {
        lastActivityAt = Date.now();
    }

    function checkIdle() {
        var minutes = Math.max(5, Number(config.sessionIdleMinutes || 60));
        if (!currentClaims || currentClaims.staff !== true || Date.now() - lastActivityAt < minutes * 60000) {
            return;
        }
        stopIdleTimeout();
        if (window.MonsterAuth && MonsterAuth.logout) {
            MonsterAuth.logout();
        }
        alert("登入已逾時，請重新登入");
        if (window.returnToKioskHome) {
            returnToKioskHome("staff-session-timeout");
        } else if (window.showPage) {
            showPage("homePage");
        }
    }

    function startIdleTimeout() {
        stopIdleTimeout();
        noteActivity();
        idleTimer = setInterval(checkIdle, 60000);
    }

    function initTracking() {
        if (trackingStarted) { return; }
        trackingStarted = true;
        ["click", "keydown", "touchstart", "pointerdown"].forEach(function (eventName) {
            document.addEventListener(eventName, noteActivity, true);
        });
    }

    window.MonsterFirebaseRoleAuth = {
        version: "FIX31",
        enabled: function () { return config.enabled !== false; },
        ready: ready,
        accountToEmail: accountToEmail,
        callFunction: callFunction,
        login: login,
        logout: logout,
        restoreSession: restoreSession,
        reauthenticate: reauthenticate,
        ensureAnonymousKiosk: ensureAnonymousKiosk,
        isClaimAdmin: function () { return !!(currentClaims && currentClaims.staff === true && currentClaims.role === "admin"); },
        isClaimStaff: function () { return !!(currentClaims && currentClaims.staff === true); }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initTracking);
    } else {
        initTracking();
    }
}());
