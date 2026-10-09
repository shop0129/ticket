// 小怪獸售票機 FIX31 - 雲端員工管理服務
(function () {
    "use strict";

    function roleAuth() {
        return window.MonsterFirebaseRoleAuth || null;
    }

    function available() {
        var api = roleAuth();
        return !!(api && api.ready && api.ready() && api.isClaimAdmin && api.isClaimAdmin() &&
            window.MonsterAuth && MonsterAuth.isFirebaseSession && MonsterAuth.isFirebaseSession());
    }

    function call(name, data) {
        var api = roleAuth();
        if (!available() || !api) {
            return Promise.reject({ code: "functions/permission-denied", message: "請先用雲端店長帳號登入" });
        }
        return api.callFunction(name, data || {});
    }

    window.MonsterFirebaseEmployees = {
        version: "FIX31",
        available: available,
        list: function () {
            return call("staffAuthV1ListEmployees", {}).then(function (data) { return data.employees || []; });
        },
        create: function (employee) { return call("staffAuthV1CreateEmployee", employee); },
        update: function (employee) { return call("staffAuthV1UpdateEmployee", employee); },
        resetPassword: function (uid, password) {
            return call("staffAuthV1ResetEmployeePassword", { uid: uid, password: password });
        },
        setEnabled: function (uid, enabled) {
            return call("staffAuthV1SetEmployeeEnabled", { uid: uid, enabled: enabled });
        },
        remove: function (uid) { return call("staffAuthV1DeleteEmployee", { uid: uid }); },
        migrate: function (employees) {
            return call("staffAuthV1MigrateLegacyEmployees", { employees: employees || [] });
        }
    };
}());
