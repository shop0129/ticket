// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Role System
// Part 1：角色核心、多人員工帳號、登入工作階段
// Android WebView 61 相容（ES5）
// =========================================
var ROLE_ADMIN = "admin";
var ROLE_STAFF = "staff";
var currentUserRole = null;
var currentUser = null;

(function () {
    "use strict";

    var EMPLOYEE_STORAGE_KEY = "monsterEmployeesV73";
    var SESSION_STORAGE_KEY = "monsterRoleSessionV73";

    function nowIso() {
        return new Date().toISOString();
    }

    function makeId(prefix) {
        return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    }

    function normalizeAccount(value) {
        return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function readEmployees() {
        var raw;
        var list;
        try {
            raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
            list = raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.warn("[RoleSystem] 員工資料讀取失敗", error);
            list = [];
        }
        return Object.prototype.toString.call(list) === "[object Array]" ? list : [];
    }

    function saveEmployees(list) {
        localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(list));
        window.monsterEmployees = list;
        return list;
    }

    function ensureDefaultAccounts() {
        var list = readEmployees();
        var changed = false;
        var hasAdmin = false;
        var i;

        for (i = 0; i < list.length; i += 1) {
            if (list[i].role === ROLE_ADMIN && list[i].enabled !== false) {
                hasAdmin = true;
            }
        }

        if (!hasAdmin) {
            list.unshift({
                id: makeId("manager"),
                account: "manager",
                name: "店長",
                password: String((window.systemData && systemData.adminPassword) || "1234"),
                role: ROLE_ADMIN,
                enabled: true,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                migratedFromLegacy: true
            });
            changed = true;
        }

        if (list.length === 1 && window.systemData && systemData.staffPassword) {
            list.push({
                id: makeId("staff"),
                account: "staff01",
                name: "員工01",
                password: String(systemData.staffPassword || "0000"),
                role: ROLE_STAFF,
                enabled: true,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                migratedFromLegacy: true
            });
            changed = true;
        }

        if (changed) {
            saveEmployees(list);
        } else {
            window.monsterEmployees = list;
        }
        return list;
    }

    function publicUser(employee) {
        if (!employee) {
            return null;
        }
        return {
            id: employee.id,
            account: employee.account,
            name: employee.name,
            role: employee.role,
            loginAt: nowIso()
        };
    }

    function saveSession(user) {
        if (!user) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return;
        }
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }

    function restoreSession() {
        var raw;
        var session;
        var list;
        var i;
        try {
            raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            session = raw ? JSON.parse(raw) : null;
        } catch (error) {
            session = null;
        }
        if (!session || !session.id) {
            return false;
        }
        list = ensureDefaultAccounts();
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id === session.id && list[i].enabled !== false) {
                currentUser = publicUser(list[i]);
                currentUser.loginAt = session.loginAt || currentUser.loginAt;
                currentUserRole = currentUser.role;
                window.currentUser = currentUser;
                window.currentUserRole = currentUserRole;
                return true;
            }
        }
        saveSession(null);
        return false;
    }

    function findLogin(account, password) {
        var list = ensureDefaultAccounts();
        var normalized = normalizeAccount(account);
        var pass = String(password || "");
        var i;
        for (i = 0; i < list.length; i += 1) {
            if (list[i].enabled === false) {
                continue;
            }
            if (normalizeAccount(list[i].account) === normalized && String(list[i].password) === pass) {
                return list[i];
            }
        }
        return null;
    }

    function login(account, password) {
        var employee = findLogin(account, password);
        if (!employee) {
            return false;
        }
        currentUser = publicUser(employee);
        currentUserRole = currentUser.role;
        window.currentUser = currentUser;
        window.currentUserRole = currentUserRole;
        saveSession(currentUser);
        applyRolePermissions();
        return true;
    }

    // 相容 V7.2：只輸入密碼時，找第一個符合的啟用帳號。
    function loginLegacyPassword(password) {
        var list = ensureDefaultAccounts();
        var pass = String(password || "");
        var i;
        for (i = 0; i < list.length; i += 1) {
            if (list[i].enabled !== false && String(list[i].password) === pass) {
                return login(list[i].account, pass);
            }
        }
        return false;
    }

    window.MonsterRole = {
        version: "7.3-Phase3E-Part1",
        getEmployees: function () {
            return clone(ensureDefaultAccounts());
        },
        saveEmployees: function (list) {
            return saveEmployees(clone(list || []));
        },
        getCurrentUser: function () {
            return currentUser ? clone(currentUser) : null;
        },
        getCurrentRole: function () {
            return currentUserRole;
        },
        isAdmin: function () {
            return currentUserRole === ROLE_ADMIN;
        },
        isStaff: function () {
            return currentUserRole === ROLE_STAFF;
        },
        login: login,
        logout: function () {
            currentUser = null;
            currentUserRole = null;
            window.currentUser = null;
            window.currentUserRole = null;
            saveSession(null);
            applyRolePermissions();
        },
        restoreSession: restoreSession,
        refresh: applyRolePermissions
    };

    window.loginByRole = function (account, password) {
        if (arguments.length < 2) {
            return loginLegacyPassword(account);
        }
        return login(account, password);
    };

    window.logoutAdmin = function () {
        if (window.playClick) {
            playClick();
        }
        window.MonsterRole.logout();
        if (window.showPage) {
            showPage("homePage");
        }
    };

    function applyRolePermissions() {
        var badge;
        var loginName;
        var roleText;
        if (!document.body) {
            return;
        }
        document.body.classList.remove("role-admin-active");
        document.body.classList.remove("role-staff-active");
        if (currentUserRole === ROLE_ADMIN) {
            document.body.classList.add("role-admin-active");
        } else if (currentUserRole === ROLE_STAFF) {
            document.body.classList.add("role-staff-active");
        }

        badge = document.getElementById("currentRoleBadge");
        if (badge) {
            if (currentUser) {
                roleText = currentUserRole === ROLE_ADMIN ? "店長" : "員工";
                badge.className = "role-badge " + (currentUserRole === ROLE_ADMIN ? "role-admin" : "role-staff");
                badge.textContent = (currentUserRole === ROLE_ADMIN ? "👑 " : "👤 ") + currentUser.name + "｜" + roleText;
                badge.title = "登入帳號：" + currentUser.account;
            } else {
                badge.className = "role-badge";
                badge.textContent = "";
                badge.title = "";
            }
        }

        loginName = document.getElementById("dashboardCurrentUser");
        if (loginName) {
            loginName.textContent = currentUser ? currentUser.name : "尚未登入";
        }
    }

    window.applyRolePermissions = applyRolePermissions;

    ensureDefaultAccounts();
    restoreSession();

    document.addEventListener("DOMContentLoaded", function () {
        applyRolePermissions();
    });
}());
