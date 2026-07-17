// V7.4 Enterprise 相容橋接：把既有 V7.3 全域模組接到統一事件層。
(function (window) {
    "use strict";
    function enterprise() { return window.MonsterEnterprise; }
    function wrap(object, method, eventName, mapResult) {
        var original;
        if (!object || typeof object[method] !== "function" || object[method].__monsterWrapped) { return; }
        original = object[method];
        object[method] = function () {
            var result = original.apply(this, arguments);
            if (enterprise()) {
                enterprise().emit(eventName, mapResult ? mapResult(result, arguments) : { result: result });
                enterprise().refreshStatus();
            }
            return result;
        };
        object[method].__monsterWrapped = true;
    }
    function connect() {
        if (window.MonsterRole) {
            wrap(window.MonsterRole, "login", "auth:login", function (result) { return { success: result, user: window.MonsterRole.getCurrentUser() }; });
            wrap(window.MonsterRole, "logout", "auth:logout", function () { return { success: true }; });
        }
        if (enterprise()) { enterprise().log("info", "legacy-bridge-connected"); }
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", connect); }
    else { connect(); }
    window.setTimeout(connect, 500);
}(window));
