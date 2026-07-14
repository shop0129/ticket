// V7 Phase 1 Legacy Build | js/modules/businessMode.js
//==========================
// 開啟營業模式
//==========================
function openBusinessMode() {
    renderBusinessMode();
    showPage("businessModePage");
}
//==========================
// 顯示營業模式
//==========================
function renderBusinessMode() {
    var table = document.getElementById("businessModeTable");
    if (!table)
        return;
    var modes = {
        weekday: {
            title: "🌤️ 平日",
            description: "星期一至星期五使用",
            note: "寒暑假限定票不顯示"
        },
        holiday: {
            title: "🎈 假日",
            description: "星期六、星期日及國定假日使用",
            note: "早鳥票與寒暑假限定票不顯示"
        },
        summer: {
            title: "🏖️ 寒暑假",
            description: "寒假、暑假期間使用",
            note: "平日早鳥票不顯示"
        },
        event: {
            title: "🎉 特殊活動",
            description: "包場、節慶或活動期間使用",
            note: "票券顯示依活動設定"
        }
    };
    var html = "";
    for (var id in modes) {
        var mode = modes[id];
        var active = businessMode.mode === id;
        html += "\n\n<label class=\"business-mode-card ".concat(active ? "active" : "", "\">\n\n    <input\n        type=\"radio\"\n        name=\"businessMode\"\n        value=\"").concat(id, "\"\n        ").concat(active ? "checked" : "", "\n        onchange=\"previewBusinessMode('").concat(id, "')\">\n\n    <div class=\"business-mode-content\">\n\n        <div class=\"business-mode-top\">\n\n            <div class=\"business-mode-title\">\n                ").concat(mode.title, "\n            </div>\n\n            <div class=\"business-mode-status\">\n                ").concat(active ? "🟢 啟用中" : "⚪ 未啟用", "\n            </div>\n\n        </div>\n\n        <div class=\"business-mode-description\">\n            ").concat(mode.description, "\n        </div>\n\n        <div class=\"business-mode-note\">\n            ").concat(mode.note, "\n        </div>\n\n    </div>\n\n</label>\n\n");
    }
    html += "\n\n<div class=\"business-auto-card\">\n\n    <div class=\"business-auto-main\">\n\n        <div>\n\n            <div class=\"business-auto-title\">\n                \uD83D\uDCC5 \u81EA\u52D5\u4F9D\u65E5\u671F\u5207\u63DB\n            </div>\n\n            <div class=\"business-auto-description\">\n                \u7CFB\u7D71\u4F9D\u65E5\u671F\u81EA\u52D5\u5207\u63DB\u71DF\u696D\u6A21\u5F0F\n            </div>\n\n        </div>\n\n        <label class=\"business-auto-switch\">\n\n            <input\n                type=\"checkbox\"\n                id=\"autoMode\"\n                ".concat(businessMode.auto ? "checked" : "", ">\n\n            <span>\n                ").concat(businessMode.auto ? "已勾選" : "未勾選", "\n            </span>\n\n        </label>\n\n    </div>\n\n    <div class=\"business-development-status\">\n        \u26AA \u529F\u80FD\u958B\u767C\u4E2D\uFF0C\u52FE\u9078\u72C0\u614B\u53EF\u5132\u5B58\uFF0C\u4F46\u76EE\u524D\u4E0D\u6703\u81EA\u52D5\u5207\u63DB\n    </div>\n\n</div>\n\n");
    table.innerHTML = html;
}
//==========================
// 預覽選擇狀態
//==========================
function previewBusinessMode(id) {
    document
        .querySelectorAll(".business-mode-card")
        .forEach(function (card) {
        var input = card.querySelector("input[name='businessMode']");
        var status = card.querySelector(".business-mode-status");
        var active = input && input.value === id;
        card.classList.toggle("active", active);
        if (status) {
            status.innerHTML =
                active
                    ? "🟢 啟用中"
                    : "⚪ 未啟用";
        }
    });
}
//==========================
// 儲存
//==========================
function saveBusinessMode() {
    var selected = document.querySelector("input[name='businessMode']:checked");
    var autoMode = document.getElementById("autoMode");
    if (!selected) {
        alert("❌ 請選擇營業模式");
        return;
    }
    businessMode.mode =
        selected.value;
    businessMode.auto =
        autoMode
            ? autoMode.checked
            : false;
    localStorage.setItem("businessMode", JSON.stringify(businessMode));
    // 立即更新首頁票券
    updateTicketButtons();
    renderBusinessMode();
    alert("✅ 營業模式已儲存");
}
//==========================
// 恢復預設
//==========================
function resetBusinessMode() {
    if (!confirm("確定恢復預設營業模式？")) {
        return;
    }
    businessMode = {
        mode: "weekday",
        auto: false
    };
    localStorage.setItem("businessMode", JSON.stringify(businessMode));
    updateTicketButtons();
    renderBusinessMode();
}
