// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 4
// Firebase Authentication + Custom Claims
// Android WebView 61 / Firebase 8.x 相容
// =========================================
(function () {
    "use strict";

    var config = window.MONSTER_ROLE_CONFIG || {};
    var initialized = false;
    var idleTimer = null;
    var lastActivityAt = Date.now();
    var currentClaims = null;

    function normalizeAccount(value) {
        return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    }

    function accountToEmail(account) {
        return normalizeAccount(account) + "@" + (config.staffEmailDomain || "staff.monsterticket.app");
    }

    function isFirebaseReady() {
        return !!(window.firebase && firebase.apps && firebase.apps.length && firebase.auth && firebase.database);
    }

    function functionsReady() {
        return !!(isFirebaseReady() && firebase.functions);
    }

    function callable(name) {
        if (!functionsReady()) {
            return Promise.reject({ code: "functions/unavailable", message: "Firebase Functions SDK 尚未載入" });
        }
        return firebase.app().functions(config.functionsRegion || "asia-east1").httpsCallable(name);
    }

    function callFunction(name, data) {
        if (!functionsReady()) {
            return Promise.reject({ code: "functions/unavailable", message: "Firebase Functions SDK 尚未載入" });
        }
        return callable(name)(data || {}).then(function (result) {
            return result && result.data !== undefined ? result.data : result;
        });
    }

    function readProfile(uid) {
        var root = config.firebaseRoot || "monsterTicket/v1";
        return firebase.database().ref(root + "/staffUsers/" + uid).once("value").then(function (snapshot) {
            return snapshot.val() || null;
        });
    }

    function publicProfile(user, claims, profile) {
        var data = profile || {};
        return {
            id: user.uid,
            uid: user.uid,
            account: data.account || String(user.email || "").split("@")[0],
            name: data.name || user.displayName || (claims.role === "admin" ? "店長" : "員工"),
            role: claims.role,
            enabled: data.enabled !== false && user.disabled !== true,
            provider: "firebase",
            loginAt: new Date().toISOString()
        };
    }

    function activateProfile(profile, claims) {
        currentClaims = claims || {};
        if (window.MonsterRole && MonsterRole.setAuthenticatedUser) {
            MonsterRole.setAuthenticatedUser(profile);
        }
        startIdleTimeout();
        return profile;
    }

    function validateFirebaseUser(user, forceRefresh) {
        if (!user || user.isAnonymous) {
            return Promise.reject({ code: "auth/not-staff-user", message: "目前不是員工帳號" });
        }
        return user.getIdTokenResult(forceRefresh === true).then(function (tokenResult) {
            var claims = tokenResult.claims || {};
            if (claims.staff !== true || (claims.role !== "admin" && claims.role !== "staff")) {
                throw { code: "auth/missing-role", message: "此 Firebase 帳號尚未設定店長／員工角色" };
            }
            return readProfile(user.uid).then(function (profile) {
                if (!profile || profile.enabled === false) {
                    throw { code: "auth/user-disabled", message: "此員工帳號已停用" };
                }
                return activateProfile(publicProfile(user, claims, profile), claims);
            });
        });
    }

    function login(account, password) {
        var normalized = normalizeAccount(account);
        if (!isFirebaseReady()) {
            return Promise.reject({ code: "auth/firebase-not-ready", message: "Firebase 尚未完成連線" });
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(normalized)) {
            return Promise.reject({ code: "auth/invalid-account", message: "帳號格式不正確" });
        }
        return firebase.auth().signInWithEmailAndPassword(accountToEmail(normalized), String(password || "")).then(function (credential) {
            return validateFirebaseUser(credential.user, true);
        }).then(function (profile) {
            callFunction("recordStaffLogin", {}).catch(function () {});
            return profile;
        }).catch(function (error) {
            if (firebase.auth().currentUser && !firebase.auth().currentUser.isAnonymous) {
                return firebase.auth().signOut().then(function () {
                    return ensureAnonymousKiosk();
                }).catch(function () {}).then(function () {
                    throw error;
                });
            }
            throw error;
        });
    }

    function restoreSession() {
        if (!isFirebaseReady()) {
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
                if (finished) {
                    return;
                }
                finished = true;
                clearTimeout(timer);
                if (unsubscribe) {
                    unsubscribe();
                }
                if (!user || user.isAnonymous) {
                    resolve(false);
                    return;
                }
                validateFirebaseUser(user, false).then(function () {
                    resolve(true);
                }).catch(function () {
                    resolve(false);
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

    function ensureAnonymousKiosk() {
        if (!isFirebaseReady()) {
            return Promise.resolve(null);
        }
        if (firebase.auth().currentUser) {
            return Promise.resolve(firebase.auth().currentUser);
        }
        return firebase.auth().signInAnonymously().then(function (credential) {
            return credential.user;
        });
    }

    function logout() {
        stopIdleTimeout();
        currentClaims = null;
        if (!isFirebaseReady()) {
            return Promise.resolve();
        }
        return firebase.auth().signOut().then(function () {
            return ensureAnonymousKiosk();
        });
    }

    function isClaimAdmin() {
        return !!(currentClaims && currentClaims.role === "admin" && currentClaims.staff === true);
    }

    function isClaimStaff() {
        return !!(currentClaims && currentClaims.staff === true && (currentClaims.role === "admin" || currentClaims.role === "staff"));
    }

    function noteActivity() {
        lastActivityAt = Date.now();
    }

    function stopIdleTimeout() {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
    }

    function handleIdleTimeout() {
        var minutes = Math.max(5, Number(config.sessionIdleMinutes || 60));
        if (!isClaimStaff() || Date.now() - lastActivityAt < minutes * 60000) {
            return;
        }
        stopIdleTimeout();
        if (window.MonsterAuth && MonsterAuth.logout) {
            MonsterAuth.logout();
        }
        alert("登入已逾時，請重新登入");
        if (window.showPage) {
            showPage("homePage");
        }
        var staffLogin = document.getElementById("staffLoginPage");
        var staffHome = document.getElementById("staffHomePage");
        if (staffLogin && staffHome) {
            staffHome.style.display = "none";
            staffLogin.style.display = "flex";
        }
    }

    function startIdleTimeout() {
        stopIdleTimeout();
        noteActivity();
        idleTimer = setInterval(handleIdleTimeout, 60000);
    }

    function initActivityTracking() {
        if (initialized) {
            return;
        }
        initialized = true;
        ["click", "keydown", "touchstart", "pointerdown"].forEach(function (eventName) {
            document.addEventListener(eventName, noteActivity, true);
        });
    }

    window.MonsterFirebaseRoleAuth = {
        version: "7.3-Phase3E-Part4",
        enabled: function () { return config.enabled !== false; },
        ready: isFirebaseReady,
        functionsReady: functionsReady,
        accountToEmail: accountToEmail,
        login: login,
        logout: logout,
        restoreSession: restoreSession,
        ensureAnonymousKiosk: ensureAnonymousKiosk,
        callFunction: callFunction,
        isClaimAdmin: isClaimAdmin,
        isClaimStaff: isClaimStaff,
        getClaims: function () { return currentClaims || {}; },
        allowLocalFallback: function () { return config.allowLocalFallback === true; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initActivityTracking);
    } else {
        initActivityTracking();
    }
}());
