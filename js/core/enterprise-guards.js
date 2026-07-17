// V7.4 Enterprise DOM 權限守門：data-permission / data-role 自動套用。
(function (window, document) {
    "use strict";
    function apply() {
        var core = window.MonsterEnterprise;
        var nodes;
        var i;
        var permission;
        var role;
        if (!core || !document.querySelectorAll) { return; }
        nodes = document.querySelectorAll("[data-permission], [data-role]");
        for (i = 0; i < nodes.length; i += 1) {
            permission = nodes[i].getAttribute("data-permission");
            role = nodes[i].getAttribute("data-role");
            if ((permission && !core.can(permission)) || (role && core.getRole() !== role)) {
                nodes[i].style.display = "none";
                nodes[i].setAttribute("aria-hidden", "true");
            } else {
                nodes[i].style.display = "";
                nodes[i].removeAttribute("aria-hidden");
            }
        }
    }
    window.MonsterPermissionUI = { apply: apply };
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", apply); }
    else { apply(); }
    window.setTimeout(apply, 600);
}(window, document));
