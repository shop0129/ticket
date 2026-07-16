// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 4
// Firebase／本機相容登入、權限與操作紀錄
// =========================================
(function () {
    "use strict";

    var AUDIT_STORAGE_KEY = "monsterAuditLogsV73";
    var FIREBASE_ROOT = "monsterTicket/v1";
    var ADMIN_ONLY = {
        "order.cancel": true,
        "member.delete": true,
        "member.export": true,
        "member.import": true,
        "capacity.update": true,
        "ticket.update": true,
        "business.update": true,
        "system.update": true,
        "data.backup": true,
        "data.restore": true,
        "data.clear": true,
        "stats.reset": true,
        "employee.manage": true,
        "hardware.manage": true,
        "audit.read": true
    };

    function nowIso() {
        return new Date().toISOString();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getCurrentUser() {
        if (window.MonsterRole && MonsterRole.getCurrentUser) {
            return MonsterRole.getCurrentUser();
        }
        return null;
    }

    function getCurrentRole() {
        var user = getCurrentUser();
        return user ? user.role : "";
    }

    function getActor(source) {
        var user = getCurrentUser();
        if (user) {
            return {
                id: user.id || "",
                uid: user.uid || "",
                account: user.account || "",
                name: user.name || (user.role === "admin" ? "店長" : "員工"),
                role: user.role || "staff",
                source: source || "staff"
            };
        }
        return {
            id: (window.MonsterCloud && MonsterCloud.uid) || "kiosk",
            uid: (window.MonsterCloud && MonsterCloud.uid) || "",
            account: "",
            name: "Kiosk 售票機",
            role: "device",
            source: source || "kiosk"
        };
    }

    function isAdmin() {
        return getCurrentRole() === "admin";
    }

    function hasPermission(permission) {
        if (!permission) {
            return true;
        }
        if (ADMIN_ONLY[permission]) {
            return isAdmin();
        }
        return getCurrentRole() === "admin" || getCurrentRole() === "staff";
    }

    function requirePermission(permission, message) {
        if (hasPermission(permission)) {
            return true;
        }
        alert(message || "❌ 此功能僅限店長使用");
        return false;
    }

    function readLocalAudit() {
        try {
            var list = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || "[]");
            return Object.prototype.toString.call(list) === "[object Array]" ? list : [];
        } catch (error) {
            return [];
        }
    }

    function saveLocalAudit(record) {
        var list = readLocalAudit();
        list.unshift(record);
        if (list.length > 500) {
            list = list.slice(0, 500);
        }
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(list));
    }

    function pushCloudAudit(record) {
        if (!window.firebase || !firebase.database || !firebase.apps || !firebase.apps.length) {
            return;
        }
        try {
            firebase.database().ref(FIREBASE_ROOT + "/auditLogs").push(record).catch(function (error) {
                console.warn("[MonsterAuth] 操作紀錄雲端同步失敗", error);
            });
        } catch (error) {
            console.warn("[MonsterAuth] 操作紀錄建立失敗", error);
        }
    }

    function audit(action, detail, options) {
        var settings = options || {};
        var actor = getActor(settings.source);
        var record = {
            id: "audit_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
            action: action || "unknown",
            detail: detail || "",
            targetType: settings.targetType || "",
            targetId: settings.targetId || "",
            actorId: actor.id,
            actorUid: actor.uid,
            actorAccount: actor.account,
            actorName: actor.name,
            actorRole: actor.role,
            source: actor.source,
            createdAt: Date.now(),
            createdAtIso: nowIso()
        };
        saveLocalAudit(record);
        pushCloudAudit(record);
        return clone(record);
    }

    function decorateRecord(record, source) {
        var result = record || {};
        var actor = getActor(source);
        result.source = result.source || actor.source;
        result.createdBy = clone(actor);
        result.operatorId = actor.id;
        result.operatorName = actor.name;
        result.operatorRole = actor.role;
        return result;
    }

    function login(account, password) {
        if (!window.MonsterRole || !MonsterRole.login) {
            return false;
        }
        if (!MonsterRole.login(account, password)) {
            return false;
        }
        audit("auth.login", "登入系統", { source: "staff" });
        return true;
    }

    function loginAsync(account, password) {
        var firebaseRole = window.MonsterFirebaseRoleAuth;
        if (!firebaseRole || !firebaseRole.enabled || !firebaseRole.enabled()) {
            return Promise.resolve(login(account, password));
        }
        if (!firebaseRole.ready()) {
            if (firebaseRole.allowLocalFallback && firebaseRole.allowLocalFallback()) {
                return Promise.resolve(login(account, password));
            }
            return Promise.reject({ code: "auth/firebase-not-ready", message: "Firebase 尚未完成連線" });
        }
        return firebaseRole.login(account, password).then(function () {
            audit("auth.login", "Firebase 員工帳號登入", { source: "staff" });
            return true;
        }).catch(function (error) {
            var canFallback = firebaseRole.allowLocalFallback && firebaseRole.allowLocalFallback();
            if (canFallback && (error.code === "auth/user-not-found" || error.code === "auth/missing-role")) {
                return login(account, password);
            }
            throw error;
        });
    }

    function logout() {
        if (getCurrentUser()) {
            audit("auth.logout", "登出系統", { source: "staff" });
        }
        if (window.MonsterRole && MonsterRole.logout) {
            MonsterRole.logout();
        }
        if (window.MonsterFirebaseRoleAuth && MonsterFirebaseRoleAuth.logout) {
            return MonsterFirebaseRoleAuth.logout();
        }
        return Promise.resolve();
    }

    function restoreSession() {
        if (!window.MonsterRole || !MonsterRole.restoreSession) {
            return false;
        }
        return MonsterRole.restoreSession();
    }

    function restoreSessionAsync() {
        if (window.MonsterFirebaseRoleAuth && MonsterFirebaseRoleAuth.restoreSession) {
            return MonsterFirebaseRoleAuth.restoreSession().then(function (restored) {
                if (restored) {
                    return true;
                }
                return restoreSession();
            });
        }
        return Promise.resolve(restoreSession());
    }

    function isFirebaseSession() {
        var user = getCurrentUser();
        return !!(user && user.provider === "firebase");
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function auditActionLabel(action) {
        var labels = {
            "auth.login": "登入",
            "auth.logout": "登出",
            "order.create": "建立訂單",
            "order.cancel": "作廢訂單",
            "order.reprint": "補印訂單",
            "order.enter": "確認入場",
            "order.exit": "完成離場",
            "member.create": "新增會員",
            "member.update": "修改會員",
            "member.delete": "刪除會員",
            "member.toy_points": "玩具點數",
            "employee.create": "新增員工",
            "employee.update": "修改員工",
            "employee.delete": "刪除員工",
            "employee.password_change": "修改密碼",
            "capacity.update": "容量設定",
            "ticket.update": "票券設定",
            "business.update": "營業模式",
            "system.update": "系統設定",
            "data.backup": "資料備份"
        };
        return labels[action] || action || "其他操作";
    }

    function renderAuditRecords(records) {
        var box = document.getElementById("auditLogList");
        var html = "";
        var list = records || [];
        var i;
        if (!box) {
            return;
        }
        list.sort(function (a, b) {
            return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
        if (!list.length) {
            box.innerHTML = '<div class="audit-log-empty">尚無操作紀錄</div>';
            return;
        }
        for (i = 0; i < list.length && i < 200; i += 1) {
            html += '<div class="audit-log-row">' +
                '<div class="audit-log-main"><strong>' + escapeHtml(auditActionLabel(list[i].action)) + '</strong>' +
                '<span>' + escapeHtml(list[i].detail || "") + '</span></div>' +
                '<div class="audit-log-meta"><span>' + escapeHtml(list[i].actorName || "未知人員") +
                '｜' + escapeHtml(list[i].actorRole === "admin" ? "店長" : (list[i].actorRole === "staff" ? "員工" : list[i].actorRole || "裝置")) +
                '</span><span>' + escapeHtml(new Date(Number(list[i].createdAt || Date.now())).toLocaleString("zh-TW")) + '</span></div>' +
                '</div>';
        }
        box.innerHTML = html;
    }

    function openAuditLogPage() {
        if (!requirePermission("audit.read", "❌ 只有店長可以查看操作紀錄")) {
            return;
        }
        var localRecords = readLocalAudit();
        renderAuditRecords(localRecords);
        if (window.showPage) {
            showPage("auditLogPage");
        }
        if (window.firebase && firebase.database && firebase.apps && firebase.apps.length) {
            firebase.database().ref(FIREBASE_ROOT + "/auditLogs").limitToLast(200).once("value").then(function (snapshot) {
                var map = {};
                var merged = [];
                snapshot.forEach(function (child) {
                    var row = child.val() || {};
                    row.id = row.id || child.key;
                    map[row.id] = row;
                });
                localRecords.forEach(function (row) {
                    map[row.id] = row;
                });
                Object.keys(map).forEach(function (id) {
                    merged.push(map[id]);
                });
                renderAuditRecords(merged);
            }).catch(function () {
                renderAuditRecords(localRecords);
            });
        }
    }

    window.MonsterAuth = {
        version: "7.3-Phase3E-Part4",
        login: login,
        loginAsync: loginAsync,
        logout: logout,
        restoreSession: restoreSession,
        restoreSessionAsync: restoreSessionAsync,
        isFirebaseSession: isFirebaseSession,
        getCurrentUser: getCurrentUser,
        getCurrentRole: getCurrentRole,
        getActor: getActor,
        isAdmin: isAdmin,
        hasPermission: hasPermission,
        requirePermission: requirePermission,
        decorateRecord: decorateRecord,
        audit: audit,
        getLocalAuditLogs: function () {
            return clone(readLocalAudit());
        },
        openAuditLogPage: openAuditLogPage
    };

    window.MonsterPermission = window.MonsterAuth;
    window.openAuditLogPage = openAuditLogPage;
}());
