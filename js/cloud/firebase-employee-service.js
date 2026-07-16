// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 4
// Firebase 員工管理 Callable Functions 服務
// =========================================
(function () {
    "use strict";

    function roleAuth() {
        return window.MonsterFirebaseRoleAuth || null;
    }

    function available() {
        var api = roleAuth();
        return !!(
            api &&
            api.functionsReady &&
            api.functionsReady() &&
            api.isClaimAdmin &&
            api.isClaimAdmin() &&
            window.MonsterAuth &&
            MonsterAuth.isFirebaseSession()
        );
    }

    function call(name, data) {
        var api = roleAuth();
        if (!available() || !api) {
            return Promise.reject({
                code: "functions/permission-denied",
                message: "請先用 Firebase 店長帳號登入"
            });
        }
        return api.callFunction(name, data || {});
    }

    window.MonsterFirebaseEmployees = {
        version: "7.3-Phase3E-Part4",
        available: available,
        list: function () {
            return call("listEmployees", {}).then(function (data) {
                return data && data.employees ? data.employees : [];
            });
        },
        create: function (employee) {
            return call("createEmployee", employee);
        },
        update: function (employee) {
            return call("updateEmployee", employee);
        },
        resetPassword: function (uid, password) {
            return call("resetEmployeePassword", { uid: uid, password: password });
        },
        setEnabled: function (uid, enabled) {
            return call("setEmployeeEnabled", { uid: uid, enabled: enabled });
        },
        remove: function (uid) {
            return call("deleteEmployee", { uid: uid });
        },
        migrate: function (employees) {
            return call("migrateLegacyEmployees", { employees: employees || [] });
        }
    };
}());
