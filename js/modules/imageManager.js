// V7 Phase 1 Legacy Build | js/modules/imageManager.js
// =========================================
// 小怪獸售票機 V6.3.1
// 票券圖片管理
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
var TICKET_IMAGE_LIBRARY_KEY = "ticketImageLibrary";
var ticketImageLibrary = loadTicketImageLibrary();
// =========================================
// 讀取圖片庫
// =========================================
function loadTicketImageLibrary() {
    try {
        var saved = JSON.parse(localStorage.getItem(TICKET_IMAGE_LIBRARY_KEY) || "[]");
        return Array.isArray(saved)
            ? saved
            : [];
    }
    catch (error) {
        console.error("圖片庫讀取失敗", error);
        return [];
    }
}
// =========================================
// 儲存圖片庫
// =========================================
function saveTicketImageLibrary() {
    localStorage.setItem(TICKET_IMAGE_LIBRARY_KEY, JSON.stringify(ticketImageLibrary));
}
// =========================================
// 取得圖片網址
// =========================================
function resolveTicketImageSrc(imageValue) {
    if (!imageValue) {
        return "images/ticket-2h-green.png";
    }
    if (imageValue.startsWith("data:") ||
        imageValue.startsWith("blob:") ||
        imageValue.startsWith("http://") ||
        imageValue.startsWith("https://")) {
        return imageValue;
    }
    if (imageValue.startsWith("upload:")) {
        var imageId_1 = imageValue.substring(7);
        var image = ticketImageLibrary.find(function (item) {
            return item.id === imageId_1;
        });
        return image
            ? image.data
            : "images/ticket-2h-green.png";
    }
    return "images/" + imageValue;
}
// =========================================
// 圖片名稱
// =========================================
function getTicketImageLabel(imageValue) {
    if (!imageValue) {
        return "未選擇";
    }
    if (imageValue.startsWith("upload:")) {
        var imageId_2 = imageValue.substring(7);
        var image = ticketImageLibrary.find(function (item) {
            return item.id === imageId_2;
        });
        return image
            ? image.name
            : "圖片已不存在";
    }
    return (typeof imageNames !== "undefined" &&
        imageNames[imageValue])
        ? imageNames[imageValue]
        : imageValue;
}
// =========================================
// 壓縮上傳圖片
// =========================================
function compressTicketImage(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            var image = new Image();
            image.onload = function () {
                var maxWidth = 1000;
                var maxHeight = 1000;
                var width = image.naturalWidth;
                var height = image.naturalHeight;
                var scale = Math.min(1, maxWidth / width, maxHeight / height);
                width =
                    Math.round(width * scale);
                height =
                    Math.round(height * scale);
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                var context = canvas.getContext("2d");
                context.drawImage(image, 0, 0, width, height);
                var data = canvas.toDataURL("image/webp", 0.88);
                resolve(data);
            };
            image.onerror = function () {
                reject(new Error("圖片格式無法讀取"));
            };
            image.src =
                reader.result;
        };
        reader.onerror = function () {
            reject(new Error("圖片讀取失敗"));
        };
        reader.readAsDataURL(file);
    });
}
// =========================================
// 上傳票券圖片
// =========================================
function uploadTicketImage(ticketId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var file, data, imageId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    playClick();
                    file = input.files &&
                        input.files[0];
                    if (!file)
                        return [2 /*return*/];
                    if (!file.type.startsWith("image/")) {
                        alert("❌ 請選擇圖片檔案");
                        input.value = "";
                        return [2 /*return*/];
                    }
                    if (file.size > 8 * 1024 * 1024) {
                        alert("❌ 圖片不可超過 8MB");
                        input.value = "";
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, compressTicketImage(file)];
                case 2:
                    data = _a.sent();
                    imageId = "img_" + Date.now();
                    ticketImageLibrary.unshift({
                        id: imageId,
                        name: file.name,
                        data: data,
                        createdAt: new Date().toISOString()
                    });
                    saveTicketImageLibrary();
                    if (ticketData[ticketId]) {
                        ticketData[ticketId].image =
                            "upload:" + imageId;
                    }
                    localStorage.setItem("ticketData", JSON.stringify(ticketData));
                    renderTicketManager();
                    updateTicketButtons();
                    alert("✅ 圖片已上傳並套用");
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error(error_1);
                    alert("❌ 圖片上傳失敗");
                    return [3 /*break*/, 5];
                case 4:
                    input.value = "";
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// =========================================
// 套用圖片庫圖片
// =========================================
function selectUploadedTicketImage(ticketId, imageId) {
    playClick();
    if (!ticketData[ticketId] ||
        !imageId) {
        return;
    }
    ticketData[ticketId].image =
        "upload:" + imageId;
    var preview = document.getElementById("preview-" + ticketId);
    var name = document.getElementById("imageName-" + ticketId);
    if (preview) {
        preview.src =
            resolveTicketImageSrc(ticketData[ticketId].image);
    }
    if (name) {
        name.textContent =
            getTicketImageLabel(ticketData[ticketId].image);
    }
}
// =========================================
// 刪除圖片庫圖片
// =========================================
function deleteUploadedTicketImage(imageId) {
    playClick();
    var image = ticketImageLibrary.find(function (item) {
        return item.id === imageId;
    });
    if (!image)
        return;
    var inUse = Object.values(ticketData)
        .some(function (ticket) {
        return ticket.image ===
            "upload:" + imageId;
    });
    if (inUse) {
        alert("❌ 此圖片仍有票券使用，請先替換票券圖片");
        return;
    }
    if (!confirm("\u78BA\u5B9A\u522A\u9664\u5716\u7247\u300C".concat(image.name, "\u300D\uFF1F"))) {
        return;
    }
    ticketImageLibrary =
        ticketImageLibrary.filter(function (item) {
            return item.id !== imageId;
        });
    saveTicketImageLibrary();
    renderTicketManager();
}
// =========================================
// 圖片庫選項
// =========================================
function renderUploadedImageOptions(selectedValue) {
    if (ticketImageLibrary.length === 0) {
        return "\n<option value=\"\">\n    \u5C1A\u672A\u4E0A\u50B3\u5716\u7247\n</option>\n";
    }
    var html = "\n\n<option value=\"\">\n    \u9078\u64C7\u5DF2\u4E0A\u50B3\u5716\u7247\n</option>\n\n";
    ticketImageLibrary.forEach(function (image) {
        var value = "upload:" + image.id;
        html += "\n\n<option\n    value=\"".concat(image.id, "\"\n    ").concat(selectedValue === value ? "selected" : "", ">\n    ").concat(escapeImageManagerText(image.name), "\n</option>\n\n");
    });
    return html;
}
// =========================================
// 圖片庫管理畫面
// =========================================
function renderImageLibraryPanel() {
    if (ticketImageLibrary.length === 0) {
        return "\n\n<div class=\"image-library-empty\">\n\n    \u5C1A\u672A\u4E0A\u50B3\u5716\u7247\u3002\u53EF\u5728\u4EFB\u4E00\u7968\u5238\u5361\u7247\u6309\u300C\u4E0A\u50B3\u65B0\u5716\u7247\u300D\u3002\n\n</div>\n\n";
    }
    var html = '<div class="image-library-grid">';
    ticketImageLibrary.forEach(function (image) {
        html += "\n\n<div class=\"image-library-item\">\n\n    <img\n        src=\"".concat(image.data, "\"\n        alt=\"").concat(escapeImageManagerText(image.name), "\">\n\n    <div class=\"image-library-name\">\n        ").concat(escapeImageManagerText(image.name), "\n    </div>\n\n    <button\n        type=\"button\"\n        onclick=\"deleteUploadedTicketImage('").concat(image.id, "')\">\n        \u522A\u9664\u5716\u7247\n    </button>\n\n</div>\n\n");
    });
    html += "</div>";
    return html;
}
function escapeImageManagerText(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
