(function(global){
    "use strict";

    var VOID_STATUSES = ["cancel","cancelled","canceled","void","voided","作廢","已作廢"];

    function norm(value){
        return String(value == null ? "" : value).trim().toLowerCase();
    }

    function isVoided(order){
        if(!order) return false;
        if(order.cancelled === true || order.voided === true || order.deleted === true) return true;
        return [order.status, order.playStatus, order.validationStatus, order.orderStatus]
            .some(function(value){ return VOID_STATUSES.indexOf(norm(value)) >= 0; });
    }

    function reason(order){
        if(!isVoided(order)) return "";
        return order.cancelReason || order.voidReason || "此訂單已作廢";
    }

    function assertActive(order, actionLabel, options){
        options = options || {};
        if(!isVoided(order)) return true;
        var message = "此訂單已作廢，無法" + (actionLabel || "執行此操作");
        if(options.alert !== false && global.alert) global.alert(message);
        return false;
    }

    function disabledAttrs(order, title){
        if(!isVoided(order)) return "";
        return ' disabled aria-disabled="true" title="' + (title || "此訂單已作廢") + '"';
    }

    function stamp(reasonText, actor){
        actor = actor || {};
        return {
            status:"cancel",
            playStatus:"cancelled",
            validationStatus:"cancelled",
            cancelled:true,
            voided:true,
            cancelReason:reasonText || "未填寫",
            cancelledAt:Date.now(),
            cancelledBy:actor.name || actor.operator || "",
            cancelledById:actor.id || "",
            cancelledByRole:actor.role || "",
            updatedAt:Date.now()
        };
    }

    global.MonsterVoidProtection = {
        isVoided:isVoided,
        reason:reason,
        assertActive:assertActive,
        disabledAttrs:disabledAttrs,
        stamp:stamp
    };
})(window);
