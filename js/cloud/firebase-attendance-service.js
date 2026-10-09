// 小怪獸售票機 FIX32 - 雲端員工打卡服務
(function () {
    "use strict";

    function roleAuth() {
        return window.MonsterFirebaseRoleAuth || null;
    }

    function available() {
        var api = roleAuth();
        return !!(api && api.ready && api.ready() && api.isClaimStaff && api.isClaimStaff() &&
            window.MonsterAuth && MonsterAuth.isFirebaseSession && MonsterAuth.isFirebaseSession());
    }

    function call(name, data) {
        var api = roleAuth();
        if (!available() || !api) {
            return Promise.reject({ code: "functions/permission-denied", message: "請先用雲端員工帳號登入" });
        }
        return api.callFunction(name, data || {});
    }

    window.MonsterFirebaseAttendance = {
        version: "FIX32",
        available: available,
        getStatus: function () { return call("staffAttendanceV1GetStatus", {}); },
        clockIn: function () { return call("staffAttendanceV1ClockIn", {}); },
        clockOut: function () { return call("staffAttendanceV1ClockOut", {}); },
        listMine: function (from, to) { return call("staffAttendanceV1ListMine", { from: from, to: to }); },
        adminReport: function (from, to) { return call("staffAttendanceV1AdminReport", { from: from, to: to }); }
    };
}());
