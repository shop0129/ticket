"use strict";

var functions = require("firebase-functions/v1");
var admin = require("firebase-admin");
var validators = require("./lib/validators");

admin.initializeApp();

var REGION = "asia-east1";
var ROOT = "monsterTicket/v1";
var EMAIL_DOMAIN = "staff.monsterticket.app";
var callable = functions.region(REGION).https.onCall;

function fail(code, message) {
    throw new functions.https.HttpsError(code, message);
}

function requireAdmin(context) {
    var token = context.auth && context.auth.token;
    if (!context.auth || !token || token.staff !== true || token.role !== "admin") {
        fail("permission-denied", "此功能僅限店長使用");
    }
    return context.auth;
}

function requireStaff(context) {
    var token = context.auth && context.auth.token;
    if (!context.auth || !token || token.staff !== true || (token.role !== "admin" && token.role !== "staff")) {
        fail("permission-denied", "需要員工帳號");
    }
    return context.auth;
}

function profileRef(uid) {
    return admin.database().ref(ROOT + "/staffUsers/" + uid);
}

function accountRef(account) {
    return admin.database().ref(ROOT + "/staffAccountIndex/" + validators.accountKey(account));
}

function audit(action, detail, actor, targetId) {
    return admin.database().ref(ROOT + "/auditLogs").push({
        action: action,
        detail: detail || "",
        targetType: "employee",
        targetId: targetId || "",
        actorId: actor.uid,
        actorUid: actor.uid,
        actorName: actor.token.name || actor.token.email || "Firebase 店長",
        actorRole: actor.token.role || "admin",
        source: "cloud_function",
        createdAt: Date.now(),
        createdAtIso: new Date().toISOString()
    });
}

async function readProfile(uid) {
    var snapshot = await profileRef(uid).once("value");
    return snapshot.val() || null;
}

async function enabledAdminCount() {
    var snapshot = await admin.database().ref(ROOT + "/staffUsers").once("value");
    var map = snapshot.val() || {};
    return Object.keys(map).filter(function (uid) {
        return map[uid] && map[uid].role === "admin" && map[uid].enabled !== false;
    }).length;
}

async function ensureNotLastAdmin(profile, nextRole, nextEnabled) {
    if (!profile || profile.role !== "admin" || profile.enabled === false) {
        return;
    }
    if (nextRole === "admin" && nextEnabled !== false) {
        return;
    }
    if (await enabledAdminCount() <= 1) {
        fail("failed-precondition", "系統至少必須保留一位啟用中的店長");
    }
}

async function findAccount(account) {
    var snapshot = await accountRef(account).once("value");
    return snapshot.val() || null;
}

async function createEmployeeCore(data, actor) {
    var account = validators.normalizeAccount(data.account);
    var name = String(data.name || "").trim();
    var role = data.role || "staff";
    var password = String(data.password || "");
    var enabled = data.enabled !== false;

    if (!validators.validateAccount(account)) {
        fail("invalid-argument", "帳號格式不正確");
    }
    if (!name || name.length > 30) {
        fail("invalid-argument", "員工姓名不可空白且最多 30 字");
    }
    if (!validators.validateRole(role)) {
        fail("invalid-argument", "角色不正確");
    }
    if (!validators.validatePassword(password)) {
        fail("invalid-argument", "Firebase 密碼需要 6～72 碼");
    }
    if (await findAccount(account)) {
        fail("already-exists", "此員工帳號已存在");
    }

    var userRecord = await admin.auth().createUser({
        email: validators.accountToEmail(account, EMAIL_DOMAIN),
        password: password,
        displayName: name,
        disabled: !enabled,
        emailVerified: true
    });

    try {
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: role, staff: true });
        var now = Date.now();
        var profile = {
            uid: userRecord.uid,
            id: userRecord.uid,
            account: account,
            email: userRecord.email,
            name: name,
            role: role,
            enabled: enabled,
            createdAt: now,
            updatedAt: now,
            createdBy: actor.uid
        };
        var updates = {};
        updates[ROOT + "/staffUsers/" + userRecord.uid] = profile;
        updates[ROOT + "/staffAccountIndex/" + validators.accountKey(account)] = {
            uid: userRecord.uid,
            account: account
        };
        await admin.database().ref().update(updates);
        return profile;
    } catch (error) {
        await admin.auth().deleteUser(userRecord.uid).catch(function () {});
        throw error;
    }
}

exports.listEmployees = callable(async function (data, context) {
    requireAdmin(context);
    var snapshot = await admin.database().ref(ROOT + "/staffUsers").once("value");
    var map = snapshot.val() || {};
    var list = Object.keys(map).map(function (uid) {
        map[uid].uid = uid;
        map[uid].id = uid;
        return map[uid];
    });
    list.sort(function (a, b) {
        if (a.role !== b.role) {
            return a.role === "admin" ? -1 : 1;
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant");
    });
    return { employees: list };
});

exports.createEmployee = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var profile = await createEmployeeCore(data || {}, actor);
    await audit("employee.create", "新增員工：" + profile.name, actor, profile.uid);
    return { employee: profile };
});

exports.updateEmployee = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var uid = String(data && data.uid || "");
    var profile = await readProfile(uid);
    if (!profile) {
        fail("not-found", "找不到員工帳號");
    }

    var account = validators.normalizeAccount(data.account);
    var name = String(data.name || "").trim();
    var role = data.role || profile.role;
    var enabled = data.enabled !== false;
    if (!validators.validateAccount(account) || !name || !validators.validateRole(role)) {
        fail("invalid-argument", "員工資料格式不正確");
    }
    if (actor.uid === uid && (role !== "admin" || !enabled)) {
        fail("failed-precondition", "目前登入的店長不能停用自己或把自己改成員工");
    }
    await ensureNotLastAdmin(profile, role, enabled);

    if (account !== profile.account) {
        var existing = await findAccount(account);
        if (existing && existing.uid !== uid) {
            fail("already-exists", "此員工帳號已存在");
        }
    }

    await admin.auth().updateUser(uid, {
        email: validators.accountToEmail(account, EMAIL_DOMAIN),
        displayName: name,
        disabled: !enabled
    });
    await admin.auth().setCustomUserClaims(uid, { role: role, staff: true });
    if (role !== profile.role || enabled !== (profile.enabled !== false)) {
        await admin.auth().revokeRefreshTokens(uid);
    }

    var updates = {};
    var now = Date.now();
    updates[ROOT + "/staffUsers/" + uid + "/account"] = account;
    updates[ROOT + "/staffUsers/" + uid + "/name"] = name;
    updates[ROOT + "/staffUsers/" + uid + "/role"] = role;
    updates[ROOT + "/staffUsers/" + uid + "/enabled"] = enabled;
    updates[ROOT + "/staffUsers/" + uid + "/updatedAt"] = now;
    updates[ROOT + "/staffUsers/" + uid + "/updatedBy"] = actor.uid;
    if (account !== profile.account) {
        updates[ROOT + "/staffAccountIndex/" + validators.accountKey(profile.account)] = null;
    }
    updates[ROOT + "/staffAccountIndex/" + validators.accountKey(account)] = { uid: uid, account: account };
    await admin.database().ref().update(updates);
    await audit("employee.update", "修改員工：" + name, actor, uid);
    return { employee: Object.assign({}, profile, { account: account, name: name, role: role, enabled: enabled, updatedAt: now }) };
});

exports.resetEmployeePassword = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var uid = String(data && data.uid || "");
    var password = String(data && data.password || "");
    if (!validators.validatePassword(password)) {
        fail("invalid-argument", "Firebase 密碼需要 6～72 碼");
    }
    var profile = await readProfile(uid);
    if (!profile) {
        fail("not-found", "找不到員工帳號");
    }
    await admin.auth().updateUser(uid, { password: password });
    await admin.auth().revokeRefreshTokens(uid);
    await profileRef(uid).update({ passwordChangedAt: Date.now(), updatedBy: actor.uid });
    await audit("employee.password_change", "修改員工密碼：" + profile.name, actor, uid);
    return { success: true };
});

exports.setEmployeeEnabled = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var uid = String(data && data.uid || "");
    var enabled = data && data.enabled === true;
    var profile = await readProfile(uid);
    if (!profile) {
        fail("not-found", "找不到員工帳號");
    }
    if (actor.uid === uid && !enabled) {
        fail("failed-precondition", "不能停用目前登入中的帳號");
    }
    await ensureNotLastAdmin(profile, profile.role, enabled);
    await admin.auth().updateUser(uid, { disabled: !enabled });
    await admin.auth().revokeRefreshTokens(uid);
    await profileRef(uid).update({ enabled: enabled, updatedAt: Date.now(), updatedBy: actor.uid });
    await audit(enabled ? "employee.enable" : "employee.disable", (enabled ? "啟用員工：" : "停用員工：") + profile.name, actor, uid);
    return { success: true };
});

exports.deleteEmployee = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var uid = String(data && data.uid || "");
    if (actor.uid === uid) {
        fail("failed-precondition", "不能刪除目前登入中的帳號");
    }
    var profile = await readProfile(uid);
    if (!profile) {
        fail("not-found", "找不到員工帳號");
    }
    await ensureNotLastAdmin(profile, "staff", false);
    await audit("employee.delete", "刪除員工：" + profile.name, actor, uid);
    await admin.auth().deleteUser(uid);
    var updates = {};
    updates[ROOT + "/staffUsers/" + uid] = null;
    updates[ROOT + "/staffAccountIndex/" + validators.accountKey(profile.account)] = null;
    await admin.database().ref().update(updates);
    return { success: true };
});

exports.migrateLegacyEmployees = callable(async function (data, context) {
    var actor = requireAdmin(context);
    var employees = data && Array.isArray(data.employees) ? data.employees.slice(0, 50) : [];
    var results = [];
    for (var i = 0; i < employees.length; i += 1) {
        var row = employees[i] || {};
        try {
            if (await findAccount(row.account)) {
                results.push({ account: validators.normalizeAccount(row.account), status: "skipped", message: "帳號已存在" });
                continue;
            }
            var created = await createEmployeeCore(row, actor);
            results.push({ account: created.account, uid: created.uid, status: "created" });
        } catch (error) {
            results.push({ account: validators.normalizeAccount(row.account), status: "failed", message: error.message || "建立失敗" });
        }
    }
    await audit("employee.migrate", "遷移裝置員工帳號 " + employees.length + " 筆", actor, "legacy");
    return { results: results };
});

exports.recordStaffLogin = callable(async function (data, context) {
    var actor = requireStaff(context);
    var now = Date.now();
    await profileRef(actor.uid).update({ lastLogin: now, lastLoginIso: new Date(now).toISOString() });
    await audit("auth.login", "Firebase 員工登入", actor, actor.uid);
    return { success: true, lastLogin: now };
});
