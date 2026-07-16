// V7 Phase 1 Legacy Build | js/modules/dataManager.js
// =========================================
// 小怪獸售票機 V5.8
// 資料管理：備份／還原
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var backupFileInput = document.getElementById("backupFileInput");
var backupStatus = document.getElementById("backupStatus");
var lastBackupTime = document.getElementById("lastBackupTime");
// =========================================
// 開啟資料管理
// =========================================
function openDataManager() {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.backup", "❌ 只有店長可以使用資料管理")) {
        return;
    }
    renderBackupInfo();
    showPage("dataManagerPage");
}
// =========================================
// 顯示最後備份時間
// =========================================
function renderBackupInfo() {
    if (!lastBackupTime)
        return;
    var value = localStorage.getItem("lastBackupTime");
    lastBackupTime.innerHTML =
        value
            ? "\u6700\u5F8C\u5099\u4EFD\uFF1A".concat(value)
            : "尚未建立備份";
}
// =========================================
// 設定操作訊息
// =========================================
function setBackupStatus(message, type) {
    if (type === void 0) { type = "normal"; }
    if (!backupStatus)
        return;
    backupStatus.className =
        "backup-status ".concat(type);
    backupStatus.innerHTML =
        message;
}
// =========================================
// 下載文字檔
// =========================================
function downloadTextFile(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
// =========================================
// 產生日期檔名
// =========================================
function getBackupFileDate() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1)
        .padStart(2, "0");
    var day = String(now.getDate())
        .padStart(2, "0");
    var hour = String(now.getHours())
        .padStart(2, "0");
    var minute = String(now.getMinutes())
        .padStart(2, "0");
    return "".concat(year, "-").concat(month, "-").concat(day, "_").concat(hour, "-").concat(minute);
}
// =========================================
// 收集完整 localStorage
// =========================================
function collectAllStorageData() {
    var storageData = {};
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        storageData[key] =
            localStorage.getItem(key);
    }
    return storageData;
}
// =========================================
// 匯出完整備份
// =========================================
function exportFullBackup() {
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.backup", "❌ 只有店長可以備份資料")) {
        return;
    }
    try {
        var now = new Date();
        var backup = {
            app: "小怪獸售票機",
            version: "V5.8",
            exportedAt: now.toISOString(),
            storage: collectAllStorageData()
        };
        var filename = "monster-ticket-backup-".concat(getBackupFileDate(), ".json");
        downloadTextFile(filename, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
        var displayTime = now.toLocaleString("zh-TW");
        localStorage.setItem("lastBackupTime", displayTime);
        renderBackupInfo();
        setBackupStatus("✅ 完整備份已匯出", "success");
        if (window.MonsterAuth) {
            MonsterAuth.audit("data.backup", "匯出完整備份", { source: "admin", targetType: "data", targetId: "backup" });
        }
    }
    catch (error) {
        console.error(error);
        setBackupStatus("❌ 備份失敗，請重新操作", "error");
    }
}
// =========================================
// 選擇備份檔
// =========================================
function chooseBackupFile() {
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.restore", "❌ 只有店長可以還原資料")) {
        return;
    }
    if (!backupFileInput)
        return;
    backupFileInput.value = "";
    backupFileInput.click();
}
// =========================================
// 驗證備份格式
// =========================================
function validateBackupData(backup) {
    return (backup &&
        typeof backup === "object" &&
        backup.storage &&
        typeof backup.storage === "object");
}
// =========================================
// 匯入備份
// =========================================
function importBackupFile(file) {
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.restore", "❌ 只有店長可以還原資料")) {
        return Promise.resolve();
    }
    return __awaiter(this, void 0, void 0, function () {
        var content, backup, keyCount, confirmed, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!file)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, file.text()];
                case 2:
                    content = _a.sent();
                    backup = JSON.parse(content);
                    if (!validateBackupData(backup)) {
                        throw new Error("不支援的備份格式");
                    }
                    keyCount = Object.keys(backup.storage).length;
                    confirmed = confirm("\u5373\u5C07\u9084\u539F ".concat(keyCount, " \u7B46\u8CC7\u6599\u3002\n\n\u76EE\u524D\u8CC7\u6599\u6703\u88AB\u5099\u4EFD\u6A94\u8986\u84CB\uFF0C\u78BA\u5B9A\u7E7C\u7E8C\uFF1F"));
                    if (!confirmed) {
                        setBackupStatus("已取消還原", "normal");
                        return [2 /*return*/];
                    }
                    localStorage.clear();
                    Object.entries(backup.storage).forEach(function (_a) {
                        var _b = __read(_a, 2), key = _b[0], value = _b[1];
                        localStorage.setItem(key, value);
                    });
                    setBackupStatus("✅ 資料還原完成，系統即將重新載入", "success");
                    setTimeout(function () {
                        location.reload();
                    }, 800);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error(error_1);
                    setBackupStatus("❌ 還原失敗：請確認檔案是正確的 JSON 備份", "error");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
if (backupFileInput) {
    backupFileInput.addEventListener("change", function (event) {
        var file = event.target.files[0];
        importBackupFile(file);
    });
}
// =========================================
// 匯出售票紀錄
// =========================================
function exportSalesHistory() {
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.backup", "❌ 只有店長可以匯出售票紀錄")) {
        return;
    }
    try {
        var exportData = {
            app: "小怪獸售票機",
            version: "V5.8",
            exportedAt: new Date().toISOString(),
            salesHistory: Array.isArray(salesHistory)
                ? salesHistory
                : []
        };
        var filename = "monster-sales-history-".concat(getBackupFileDate(), ".json");
        downloadTextFile(filename, JSON.stringify(exportData, null, 2), "application/json;charset=utf-8");
        setBackupStatus("\u2705 \u5DF2\u532F\u51FA ".concat(exportData.salesHistory.length, " \u7B46\u552E\u7968\u7D00\u9304"), "success");
    }
    catch (error) {
        console.error(error);
        setBackupStatus("❌ 售票紀錄匯出失敗", "error");
    }
}
// =========================================
// 清除全部資料
// =========================================
function clearAllAppData() {
    playClick();
    if (window.MonsterPermission && !MonsterPermission.requirePermission("data.clear", "❌ 只有店長可以清除資料")) {
        return;
    }
    var firstConfirm = confirm("⚠️ 確定要清除全部售票機資料？\n\n包含售票紀錄、統計、票券設定、系統設定與管理密碼。");
    if (!firstConfirm)
        return;
    var secondConfirm = confirm("此操作無法復原。\n\n建議先匯出完整備份。\n\n仍要繼續清除嗎？");
    if (!secondConfirm)
        return;
    localStorage.clear();
    alert("✅ 全部資料已清除，系統將重新載入預設資料。");
    location.reload();
}
