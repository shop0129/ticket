// V7 Phase 1 Legacy Build | js/modules/ticketManager.js
// =========================================
// 小怪獸售票機 V6.3
// 票券／商品管理
// =========================================

function saveTicketData(){

    localStorage.setItem(
        "ticketData",
        JSON.stringify(ticketData)
    );

    if(
        window.MonsterTicketCloud &&
        typeof window.MonsterTicketCloud.onLocalSave ===
        "function"
    ){
        window.MonsterTicketCloud.onLocalSave(
            ticketData
        );
    }
}

function openTicketManager() {
    renderTicketManager();
    showPage("ticketManagerPage");
}
function updateTicketButtons() {
    if (typeof renderTicketCatalog === "function") {
        renderTicketCatalog();
    }
}
function updateTicketPrices() {
    document
        .querySelectorAll(".ticket-btn")
        .forEach(function (btn) {
        var id = btn.dataset.id;
        var price = document.getElementById("price-" + id);
        if (price &&
            ticketData[id]) {
            price.textContent =
                "NT$" +
                    Number(ticketData[id].price || 0);
        }
    });
}
function getTicketCategoryLabel(category) {
    var labels = {
        general: "一般票",
        special: "限定票",
        other: "其他票種"
    };
    return labels[category] || "其他票種";
}
function renderAddTicketPanel() {
    return "\n\n<div class=\"ticket-add-card\">\n\n    <div class=\"ticket-add-title\">\n        \u2795 \u65B0\u589E\u7968\u5238\n    </div>\n\n    <div class=\"ticket-add-text\">\n        \u65B0\u589E\u5F8C\u6703\u7ACB\u5373\u51FA\u73FE\u5728\u7968\u5238\u7BA1\u7406\uFF0C\u5132\u5B58\u5F8C\u540C\u6B65\u5230\u524D\u53F0\u3002\n    </div>\n\n    <button\n        type=\"button\"\n        class=\"big-btn ticket-add-btn\"\n        onclick=\"addNewTicket()\">\n        \u65B0\u589E\u4E00\u5F35\u7968\u5238\n    </button>\n\n</div>\n\n";
}
function renderTicketManager() {
    var table = document.getElementById("ticketTable");
    if (!table)
        return;
    var html = renderAddTicketPanel();
    html += "\n\n<div class=\"image-library-card\">\n\n    <div class=\"image-library-title\">\n        \uD83D\uDDBC\uFE0F \u5DF2\u4E0A\u50B3\u5716\u7247\u5EAB\n    </div>\n\n    <div class=\"image-library-note\">\n        \u5716\u7247\u6703\u5132\u5B58\u5728\u76EE\u524D\u9019\u53F0\u552E\u7968\u6A5F\u7684\u700F\u89BD\u5668\u4E2D\uFF0C\u5099\u4EFD\u8CC7\u6599\u6642\u4E5F\u6703\u4E00\u8D77\u532F\u51FA\u3002\n    </div>\n\n    ".concat(renderImageLibraryPanel(), "\n\n</div>\n\n");
    for (var id in ticketData) {
        var ticket = ticketData[id];
        html += "\n\n<div\n    class=\"tm-card ticket-manager-card\"\n    data-ticket-manager-id=\"".concat(id, "\">\n\n    <div class=\"tm-card-header\">\n\n        <div class=\"tm-card-title\">\n            ").concat(ticket.title || id, "\n        </div>\n\n        <div class=\"ticket-manager-actions\">\n\n            <label class=\"tm-enable\">\n\n                <input\n                    type=\"checkbox\"\n                    id=\"enable-").concat(id, "\"\n                    ").concat(ticket.enable !== false ? "checked" : "", ">\n\n                \u555F\u7528\n\n            </label>\n\n            ").concat(ticket.custom
            ? "\n                <button\n                    type=\"button\"\n                    class=\"ticket-delete-btn\"\n                    onclick=\"deleteCustomTicket('".concat(id, "')\">\n                    \uD83D\uDDD1 \u522A\u9664\n                </button>\n                ")
            : "", "\n\n        </div>\n\n    </div>\n\n    <div class=\"tm-preview\">\n\n        <img\n            src=\"").concat(resolveTicketImageSrc(ticket.image || imageList[0]), "\"\n            class=\"tm-preview-img\"\n            id=\"preview-").concat(id, "\">\n\n        <div class=\"image-switch\">\n\n            <button\n                type=\"button\"\n                class=\"imageArrow\"\n                onclick=\"changeTicketImage('").concat(id, "',-1)\">\n                \u25C0\n            </button>\n\n            <div\n                class=\"tm-image-name\"\n                id=\"imageName-").concat(id, "\">\n                ").concat(getTicketImageLabel(ticket.image), "\n            </div>\n\n            <button\n                type=\"button\"\n                class=\"imageArrow\"\n                onclick=\"changeTicketImage('").concat(id, "',1)\">\n                \u25B6\n            </button>\n\n        </div>\n\n        <div class=\"ticket-image-upload-area\">\n\n            <select\n                onchange=\"selectUploadedTicketImage('").concat(id, "',this.value)\">\n\n                ").concat(renderUploadedImageOptions(ticket.image), "\n\n            </select>\n\n            <label class=\"ticket-upload-btn\">\n\n                \uD83D\uDCE4 \u4E0A\u50B3\u65B0\u5716\u7247\n\n                <input\n                    type=\"file\"\n                    accept=\"image/*\"\n                    onchange=\"uploadTicketImage('").concat(id, "',this)\"\n                    hidden>\n\n            </label>\n\n        </div>\n\n    </div>\n\n    <div class=\"ticket-manager-grid\">\n\n        <div class=\"tm-field ticket-title-field\">\n\n            <label>\u7968\u5238\u540D\u7A31</label>\n\n            <input\n                id=\"title-").concat(id, "\"\n                value=\"").concat(escapeTicketValue(ticket.title), "\">\n\n        </div>\n\n        <div class=\"tm-field\">\n\n            <label>\u5206\u985E</label>\n\n            <select id=\"category-").concat(id, "\">\n\n                <option\n                    value=\"general\"\n                    ").concat(ticket.category === "general" ? "selected" : "", ">\n                    \u4E00\u822C\u7968\n                </option>\n\n                <option\n                    value=\"special\"\n                    ").concat(ticket.category === "special" ? "selected" : "", ">\n                    \u9650\u5B9A\u7968\n                </option>\n\n                <option\n                    value=\"other\"\n                    ").concat(ticket.category === "other" ? "selected" : "", ">\n                    \u5176\u4ED6\u7968\u7A2E\n                </option>\n\n            </select>\n\n        </div>\n\n        <div class=\"tm-field\">\n\n            <label>\u50F9\u683C</label>\n\n            <input\n                id=\"priceInput-").concat(id, "\"\n                type=\"number\"\n                min=\"0\"\n                value=\"").concat(Number(ticket.price || 0), "\">\n\n        </div>\n\n        <div class=\"tm-field\">\n\n            <label>\u4EE3\u5E63</label>\n\n            <input\n                id=\"token-").concat(id, "\"\n                type=\"number\"\n                min=\"0\"\n                value=\"").concat(Number(ticket.token || 0), "\">\n\n        </div>\n\n        <div class=\"tm-field ticket-toy-field\">\n\n            <label>\u73A9\u5177</label>\n\n            <div class=\"toy-group\">\n\n                <button\n                    type=\"button\"\n                    class=\"toy-btn ").concat(ticket.toy === "none" ? "active" : "", "\"\n                    onclick=\"setToy(event,'").concat(id, "','none')\">\n                    \uD83D\uDEAB \u7121\n                </button>\n\n                <button\n                    type=\"button\"\n                    class=\"toy-btn ").concat(ticket.toy === "green" ? "active" : "", "\"\n                    onclick=\"setToy(event,'").concat(id, "','green')\">\n                    \uD83D\uDFE2 \u7DA0\u6A19\n                </button>\n\n                <button\n                    type=\"button\"\n                    class=\"toy-btn ").concat(ticket.toy === "red" ? "active" : "", "\"\n                    onclick=\"setToy(event,'").concat(id, "','red')\">\n                    \uD83D\uDD34 \u7D05\u6A19\n                </button>\n\n            </div>\n\n            <input\n                type=\"hidden\"\n                id=\"toy-").concat(id, "\"\n                value=\"").concat(ticket.toy || "none", "\">\n\n        </div>\n\n        <div class=\"tm-field ticket-description-field\">\n\n            <label>\u7968\u5238\u8AAA\u660E</label>\n\n            <textarea\n                id=\"description-").concat(id, "\"\n                placeholder=\"\u4F8B\u5982\uFF1A\u9650\u5E73\u65E5\u4F7F\u7528\u3001\u8D08\u9001\u4EE3\u5E63\u8207\u73A9\u5177\">").concat(escapeTicketValue(ticket.description), "</textarea>\n\n        </div>\n\n    </div>\n\n</div>\n\n");
    }
    table.innerHTML = html;
}
function escapeTicketValue(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
function addNewTicket() {
    playClick();
    var id = "custom_" + Date.now();
    ticketData[id] = {
        title: "新票券",
        price: 0,
        token: 0,
        toy: "none",
        reward: "",
        enable: true,
        image: imageList[0],
        category: "other",
        description: "",
        custom: true
    };
    renderTicketManager();
    setTimeout(function () {
        var card = document.querySelector("[data-ticket-manager-id=\"".concat(id, "\"]"));
        if (card) {
            card.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
            var input = document.getElementById("title-" + id);
            if (input) {
                input.focus();
                input.select();
            }
        }
    }, 50);
}
function deleteCustomTicket(id) {
    playClick();
    var ticket = ticketData[id];
    if (!ticket || !ticket.custom) {
        return;
    }
    if (!confirm("\u78BA\u5B9A\u522A\u9664\u300C".concat(ticket.title, "\u300D\uFF1F"))) {
        return;
    }
    delete ticketData[id];
    saveTicketData();
    renderTicketManager();
    updateTicketButtons();
}
function saveTicketManager() {
    for (var id in ticketData) {
        var ticket = ticketData[id];
        ticket.enable =
            document.getElementById("enable-".concat(id)).checked;
        ticket.title =
            document.getElementById("title-".concat(id)).value.trim() || "未命名票券";
        ticket.category =
            document.getElementById("category-".concat(id)).value;
        ticket.price =
            Math.max(0, Number(document.getElementById("priceInput-".concat(id)).value) || 0);
        ticket.token =
            Math.max(0, Number(document.getElementById("token-".concat(id)).value) || 0);
        ticket.toy =
            document.getElementById("toy-".concat(id)).value;
        ticket.description =
            document.getElementById("description-".concat(id)).value.trim();
        ticket.reward =
            buildTicketReward(ticket);
    }
    saveTicketData();
    updateTicketButtons();
    updateTicketPrices();
    renderTicketManager();
    alert("✅ 票券設定已儲存");
}
function buildTicketReward(ticket) {
    var rewards = [];
    if (Number(ticket.token || 0) > 0) {
        rewards.push("token");
    }
    if (ticket.toy !== "none") {
        rewards.push("toy");
    }
    if (ticket.category === "general" ||
        ticket.category === "special") {
        rewards.push("band");
    }
    return rewards.join(",");
}
function resetTicketManager() {
    if (!confirm("確定恢復預設票券？")) {
        return;
    }

    localStorage.setItem(
        "monsterTicketForceLocalReset",
        "1"
    );

    localStorage.removeItem("ticketData");

    location.reload();
}
function setToy(clickEvent, id, toy) {
    var hidden = document.getElementById("toy-".concat(id));
    if (!hidden)
        return;
    hidden.value = toy;
    var group = hidden.parentElement;
    group
        .querySelectorAll(".toy-btn")
        .forEach(function (button) {
        button.classList.remove("active");
    });
    clickEvent.currentTarget
        .classList.add("active");
}
function changeTicketImage(id, step) {
    var ticket = ticketData[id];
    if (!ticket)
        return;
    var index = imageList.indexOf(ticket.image);
    if (index === -1) {
        index = 0;
    }
    index += step;
    if (index < 0) {
        index = imageList.length - 1;
    }
    if (index >= imageList.length) {
        index = 0;
    }
    ticket.image =
        imageList[index];
    var preview = document.getElementById("preview-".concat(id));
    var name = document.getElementById("imageName-".concat(id));
    if (preview) {
        preview.src =
            resolveTicketImageSrc(ticket.image);
    }
    if (name) {
        name.textContent =
            getTicketImageLabel(ticket.image);
    }
}
