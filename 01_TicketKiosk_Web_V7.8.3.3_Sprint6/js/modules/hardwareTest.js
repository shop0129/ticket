// V7 Phase 1 Legacy Build | js/modules/hardwareTest.js
// FILE: js/modules/hardwareTest.js | V6.5 Legacy R2
// =========================================
// 小怪獸售票機 V5.9
// 硬體測試中心
// =========================================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var hardwareStatus = document.getElementById("hardwareStatus");
var deviceInfoBox = document.getElementById("deviceInfoBox");
var hardwareTestTicket = document.getElementById("hardwareTestTicket");
// =========================================
// 開啟硬體測試中心
// =========================================
function openHardwareTest() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("hardware.manage", "❌ 只有店長可以使用硬體測試")) {
        return;
    }
    renderDeviceInfo();
    resetHardwareTestStatus();
    showPage("hardwareTestPage");
}
// =========================================
// 測試狀態
// =========================================
function setHardwareStatus(message, type) {
    if (type === void 0) { type = "normal"; }
    if (!hardwareStatus)
        return;
    hardwareStatus.className =
        "hardware-status ".concat(type);
    hardwareStatus.innerHTML =
        message;
}
function resetHardwareTestStatus() {
    setHardwareStatus("請選擇要執行的測試項目", "normal");
}
// =========================================
// 裝置資訊
// =========================================
function renderDeviceInfo() {
    if (!deviceInfoBox)
        return;
    var info = {
        platform: navigator.platform || "未知",
        language: navigator.language || "未知",
        online: navigator.onLine
            ? "已連線"
            : "離線",
        screen: "".concat(window.screen.width, " \u00D7 ").concat(window.screen.height),
        viewport: "".concat(window.innerWidth, " \u00D7 ").concat(window.innerHeight),
        userAgent: navigator.userAgent || "未知"
    };
    deviceInfoBox.innerHTML = "\n\n<div class=\"device-info-row\">\n    <span>\u4F5C\u696D\u5E73\u53F0</span>\n    <strong>".concat(info.platform, "</strong>\n</div>\n\n<div class=\"device-info-row\">\n    <span>\u8A9E\u8A00</span>\n    <strong>").concat(info.language, "</strong>\n</div>\n\n<div class=\"device-info-row\">\n    <span>\u7DB2\u8DEF\u72C0\u614B</span>\n    <strong>").concat(info.online, "</strong>\n</div>\n\n<div class=\"device-info-row\">\n    <span>\u87A2\u5E55\u89E3\u6790\u5EA6</span>\n    <strong>").concat(info.screen, "</strong>\n</div>\n\n<div class=\"device-info-row\">\n    <span>\u700F\u89BD\u5668\u8996\u7A97</span>\n    <strong>").concat(info.viewport, "</strong>\n</div>\n\n<div class=\"device-info-row device-info-agent\">\n    <span>User Agent</span>\n    <strong>").concat(info.userAgent, "</strong>\n</div>\n\n");
}
// =========================================
// 音效測試
// =========================================
function testClickSound() {
    playClick();
    setHardwareStatus("✅ 點擊音效播放完成", "success");
}
function testSuccessSound() {
    playSuccess();
    setHardwareStatus("✅ 付款成功音效播放完成", "success");
}
// =========================================
// 顯示測試票券
// =========================================
function showHardwareTestTicket() {
    if (!hardwareTestTicket)
        return;
    hardwareTestTicket.innerHTML = "\n\n<div class=\"hardware-ticket-paper\">\n\n    <div class=\"hardware-ticket-title\">\n        \u5C0F\u602A\u7378\u653E\u96FB\u6240\n    </div>\n\n    <div class=\"hardware-ticket-subtitle\">\n        \u786C\u9AD4\u6E2C\u8A66\u7968\u5238\n    </div>\n\n    <div class=\"hardware-ticket-line\"></div>\n\n    <div class=\"hardware-ticket-row\">\n        <span>\u7968\u5238\u985E\u578B</span>\n        <strong>\u6E2C\u8A66\u7968\u5238</strong>\n    </div>\n\n    <div class=\"hardware-ticket-row\">\n        <span>\u4ED8\u6B3E\u65B9\u5F0F</span>\n        <strong>\u6E2C\u8A66\u6A21\u5F0F</strong>\n    </div>\n\n    <div class=\"hardware-ticket-row\">\n        <span>\u91D1\u984D</span>\n        <strong>NT$0</strong>\n    </div>\n\n    <div class=\"hardware-ticket-row\">\n        <span>\u72C0\u614B</span>\n        <strong>\u4E0D\u8A18\u9304\u8A02\u55AE</strong>\n    </div>\n\n    <div class=\"hardware-ticket-line\"></div>\n\n    <div class=\"hardware-ticket-footer\">\n        \u6B64\u7968\u5238\u50C5\u4F9B\u786C\u9AD4\u6E2C\u8A66\u4F7F\u7528\n    </div>\n\n</div>\n\n";
}
// =========================================
// 瀏覽器列印測試
// =========================================
function testBrowserPrint() {
    playClick();
    showHardwareTestTicket();
    setHardwareStatus("🖨️ 已開啟瀏覽器列印視窗", "success");
    setTimeout(function () {
        window.print();
    }, 150);
}
// =========================================
// 列印動畫測試
// 不建立訂單、不更新統計
// =========================================
function testPrintAnimation() {
    playClick();
    var previousOrder = currentPrintOrder;
    var previousReprint = isReprint;
    currentPrintOrder = {
        orderNo: "TEST-" + Date.now(),
        date: new Date().toLocaleDateString("zh-TW"),
        time: new Date().toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit"
        }),
        payment: "測試模式",
        amount: 0,
        items: [{
                id: "hardwareTest",
                title: "硬體測試票券",
                price: 0,
                token: 0,
                toy: "none",
                reward: ""
            }],
        status: "normal"
    };
    isReprint = true;
    showPage("successPage");
    countdownNumber.innerHTML = "";
    updateSuccessItems();
    startPrintAnimation();
    setTimeout(function () {
        currentPrintOrder =
            previousOrder;
        isReprint =
            previousReprint;
    }, 100);
}
// =========================================
// 全螢幕測試
// =========================================
function testFullscreen() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    playClick();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    if (!!document.fullscreenElement) return [3 /*break*/, 3];
                    return [4 /*yield*/, document.documentElement.requestFullscreen()];
                case 2:
                    _a.sent();
                    setHardwareStatus("✅ 已進入全螢幕模式", "success");
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, document.exitFullscreen()];
                case 4:
                    _a.sent();
                    setHardwareStatus("✅ 已離開全螢幕模式", "success");
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error(error_1);
                    setHardwareStatus("❌ 此裝置或瀏覽器不支援全螢幕切換", "error");
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// =========================================
// 重新整理測試
// =========================================
function testReload() {
    playClick();
    var confirmed = confirm("確定要重新整理售票機頁面？");
    if (!confirmed)
        return;
    location.reload();
}
