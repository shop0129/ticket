// V7 Phase 1 Legacy Build | js/modules/systemSetting.js
//==========================
// 開啟系統設定
//==========================
function openSystemSetting() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("system.update", "❌ 只有店長可以修改系統設定")) {
        return;
    }
    renderSystemSetting();
    showPage("systemSettingPage");
}
//=========================
// 顯示系統設定
//==========================
//==========================
// 顯示系統設定
//==========================
function renderSystemSetting() {
    var table = document.getElementById("systemSettingTable");
    if (!table)
        return;
    table.innerHTML = "\n\n<!-- ==========================\n\u7CFB\u7D71\n========================== -->\n\n<div class=\"system-card\">\n\n    <div class=\"system-card-title\">\n        \u23F1\uFE0F \u7CFB\u7D71\n    </div>\n\n    <div class=\"system-setting-row\">\n\n        <div class=\"system-setting-label\">\n            \u81EA\u52D5\u56DE\u9996\u9801\n        </div>\n\n        <div class=\"settingStepper\">\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('homeTimeout',-10)\">\n                \u2212\n            </button>\n\n            <span id=\"homeTimeoutText\">\n                ".concat(systemData.homeTimeout, " \u79D2\n            </span>\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('homeTimeout',10)\">\n                \uFF0B\n            </button>\n\n        </div>\n\n    </div>\n\n    <div class=\"system-setting-row\">\n\n        <div class=\"system-setting-label\">\n            \u5217\u5370\u5B8C\u6210\u5012\u6578\n        </div>\n\n        <div class=\"settingStepper\">\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('printDelay',-1)\">\n                \u2212\n            </button>\n\n            <span id=\"printDelayText\">\n                ").concat(systemData.printDelay, " \u79D2\n            </span>\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('printDelay',1)\">\n                \uFF0B\n            </button>\n\n        </div>\n\n    </div>\n\n</div>\n\n<!-- ==========================\n\u5217\u5370\n========================== -->\n\n<div class=\"system-card\">\n\n    <div class=\"system-card-title\">\n        \uD83D\uDDA8\uFE0F \u5217\u5370\n    </div>\n\n    <div class=\"system-setting-row\">\n\n        <div class=\"system-setting-label\">\n            \u6536\u64DA\u5217\u5370\u4EFD\u6578\n        </div>\n\n        <div class=\"settingStepper\">\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('receiptCopies',-1)\">\n                \u2212\n            </button>\n\n            <span id=\"receiptCopiesText\">\n                ").concat(systemData.receiptCopies, " \u4EFD\n            </span>\n\n            <button\n                type=\"button\"\n                class=\"stepBtn\"\n                onclick=\"changeSetting('receiptCopies',1)\">\n                \uFF0B\n            </button>\n\n        </div>\n\n    </div>\n\n</div>\n\n<!-- ==========================\n\u4ED8\u6B3E\u65B9\u5F0F\n========================== -->\n\n<div class=\"system-card\">\n\n    <div class=\"system-card-title\">\n        \uD83D\uDCB3 \u4ED8\u6B3E\u65B9\u5F0F\n    </div>\n\n    <label class=\"payment-setting-row\">\n\n        <input\n            type=\"checkbox\"\n            id=\"cashEnable\"\n            ").concat(systemData.payment.cash ? "checked" : "", ">\n\n        <span class=\"payment-setting-name\">\n            \u73FE\u91D1\u4ED8\u6B3E\n        </span>\n\n        <span class=\"payment-setting-status status-ready\">\n            \uD83D\uDFE2 \u6B63\u5E38\n        </span>\n\n    </label>\n\n    <label class=\"payment-setting-row\">\n\n        <input\n            type=\"checkbox\"\n            id=\"lineEnable\"\n            ").concat(systemData.payment.linepay ? "checked" : "", ">\n\n        <span class=\"payment-setting-name\">\n            LINE Pay\n        </span>\n\n        <span class=\"payment-setting-status status-pending\">\n            \u26AA \u672A\u4E32\u63A5\n        </span>\n\n    </label>\n\n    <label class=\"payment-setting-row\">\n\n        <input\n            type=\"checkbox\"\n            id=\"easyEnable\"\n            ").concat(systemData.payment.easycard ? "checked" : "", ">\n\n        <span class=\"payment-setting-name\">\n            \u60A0\u904A\u5361\n        </span>\n\n        <span class=\"payment-setting-status status-pending\">\n            \u26AA \u672A\u5B89\u88DD\n        </span>\n\n    </label>\n\n    <label class=\"payment-setting-row\">\n\n        <input\n            type=\"checkbox\"\n            id=\"creditEnable\"\n            ").concat(systemData.payment.credit ? "checked" : "", ">\n\n        <span class=\"payment-setting-name\">\n            \u4FE1\u7528\u5361\n        </span>\n\n        <span class=\"payment-setting-status status-pending\">\n            \u26AA \u672A\u5B89\u88DD\n        </span>\n\n    </label>\n\n</div>\n\n<!-- ==========================\n\u7BA1\u7406\n========================== -->\n\n<div class=\"system-card\">\n\n    <div class=\"system-card-title\">\n        \uD83D\uDD10 \u7BA1\u7406\n    </div>\n\n    <div class=\"password-setting-box\">\n\n        <label for=\"adminSettingPassword\">\n            \u7BA1\u7406\u5BC6\u78BC\n        </label>\n\n        <input\n            id=\"adminSettingPassword\"\n            type=\"password\"\n            autocomplete=\"new-password\"\n            value=\"").concat(systemData.adminPassword, "\">\n\n        <label for=\"staffSettingPassword\">\n            \u54E1\u5DE5\u5BC6\u78BC\n        </label>\n\n        <input\n            id=\"staffSettingPassword\"\n            type=\"password\"\n            inputmode=\"numeric\"\n            autocomplete=\"new-password\"\n            value=\"").concat(systemData.staffPassword, "\">\n\n        <div class=\"password-setting-note\">\n            \u54E1\u5DE5\u5E33\u865F\u53EA\u80FD\u67E5\u770B\u4ECA\u65E5\u7D71\u8A08\u3001\u552E\u7968\u7D00\u9304\u53CA\u88DC\u5370\u7968\u5238\u3002\n        </div>\n\n    </div>\n\n</div>\n\n");
}
//==========================
// 儲存
//==========================
function saveSystemSetting() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("system.update", "❌ 只有店長可以修改系統設定")) {
        return;
    }
    //==========================
    // 付款方式
    //==========================
    systemData.payment.cash =
        document.getElementById("cashEnable").checked;
    systemData.payment.linepay =
        document.getElementById("lineEnable").checked;
    systemData.payment.easycard =
        document.getElementById("easyEnable").checked;
    systemData.payment.credit =
        document.getElementById("creditEnable").checked;
    // 只有管理密碼還需要從 input 讀取
    systemData.adminPassword =
        document.getElementById("adminSettingPassword").value.trim();
    systemData.staffPassword =
        document.getElementById("staffSettingPassword").value.trim();
    if (!systemData.adminPassword ||
        !systemData.staffPassword) {
        alert("❌ 店長密碼與員工密碼不可空白");
        return;
    }
    if (systemData.adminPassword ===
        systemData.staffPassword) {
        alert("❌ 店長密碼與員工密碼不可相同");
        return;
    }
    // 儲存全部設定
    localStorage.setItem("systemData", JSON.stringify(systemData));
    if (window.MonsterAuth) {
        MonsterAuth.audit("system.update", "儲存系統設定", { source: "admin", targetType: "system", targetId: "settings" });
    }
    applyPaymentSetting();
    alert("✅ 系統設定已儲存");
}
//==========================
// 恢復預設
//==========================
function resetSystemSetting() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("system.update", "❌ 只有店長可以恢復系統設定")) {
        return;
    }
    if (!confirm("確定恢復預設？"))
        return;
    systemData = {
        homeTimeout: 60,
        paymentDelay: 8,
        printDelay: 5,
        receiptCopies: 1,
        autoPrint: true,
        showPrintAnimation: true,
        autoHome: true,
        saveHistory: true,
        successAnimation: true,
        playSound: true,
        payment: {
            cash: true,
            linepay: true,
            easycard: false,
            credit: false
        },
        adminPassword: "1234",
        staffPassword: "0000"
    };
    localStorage.setItem("systemData", JSON.stringify(systemData));
    if (window.MonsterAuth) {
        MonsterAuth.audit("system.reset", "恢復預設系統設定", { source: "admin", targetType: "system", targetId: "settings" });
    }
    renderSystemSetting();
}
function changeSetting(key, step) {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("system.update", "❌ 只有店長可以修改系統設定")) {
        return;
    }
    systemData[key] += step;
    if (key == "homeTimeout") {
        if (systemData[key] < 10) {
            systemData[key] = 10;
        }
    }
    if (key == "printDelay") {
        if (systemData[key] < 1) {
            systemData[key] = 1;
        }
    }
    if (key == "receiptCopies") {
        if (systemData[key] < 1) {
            systemData[key] = 1;
        }
        if (systemData[key] > 5) {
            systemData[key] = 5;
        }
    }
    renderSystemSetting();
}
//==========================
// 套用付款方式
//==========================
function applyPaymentSetting() {
    // Detail Page
    var cashBtn = document.getElementById("cashBtn");
    var lineBtn = document.getElementById("linePayBtn");
    // Cart
    var cartCash = document.getElementById("cartCashBtn");
    var cartLine = document.getElementById("cartLineBtn");
    if (cashBtn) {
        cashBtn.disabled =
            !systemData.payment.cash;
    }
    if (lineBtn) {
        lineBtn.disabled =
            !systemData.payment.linepay;
    }
    if (cartCash) {
        cartCash.disabled =
            !systemData.payment.cash;
    }
    if (cartLine) {
        cartLine.disabled =
            !systemData.payment.linepay;
    }
}
