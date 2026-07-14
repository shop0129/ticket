// V7 Phase 1 Legacy Build | js/modules/member.js
// =========================================
// 小怪獸售票機 V6.4C
// 會員完整整合
// =========================================
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var _a, _b;
var MEMBER_KEY = "memberData";
var CONSUME_POINT_RATE = 100;
var TOY_POINT_GREEN = 1;
var TOY_POINT_RED = 2;
var MEMBER_LEVELS = [
    { name: "VIP會員", minSpend: 30000 },
    { name: "金卡會員", minSpend: 15000 },
    { name: "銀卡會員", minSpend: 5000 },
    { name: "一般會員", minSpend: 0 }
];
var memberData = loadMembers();
var currentMember = null;
var currentMemberHistoryId = "";
function loadMembers() {
    try {
        var data = JSON.parse(localStorage.getItem(MEMBER_KEY) || "[]");
        return Array.isArray(data)
            ? data
            : [];
    }
    catch (error) {
        console.error(error);
        return [];
    }
}
function normalizeMemberPointFields() {
    memberData.forEach(function (member) {
        member.points =
            Number(member.points || 0);
        member.toyPoints =
            Number(member.toyPoints || 0);
        member.pointHistory =
            Array.isArray(member.pointHistory)
                ? member.pointHistory
                : [];
        member.toyPointHistory =
            Array.isArray(member.toyPointHistory)
                ? member.toyPointHistory
                : [];
    });
}
normalizeMemberPointFields();
function getMemberLevel(member) {
    var spend = Number((member === null || member === void 0 ? void 0 : member.totalSpend) || 0);
    return MEMBER_LEVELS.find(function (level) {
        return spend >= level.minSpend;
    }) || MEMBER_LEVELS[MEMBER_LEVELS.length - 1];
}
function saveMembers() {
    localStorage.setItem(MEMBER_KEY, JSON.stringify(memberData));
}
function memberPhone(value) {
    return String(value || "")
        .replace(/\D/g, "");
}
function memberEsc(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
function memberMoney(value) {
    return Number(value || 0)
        .toLocaleString("zh-TW");
}
function newMemberNo() {
    var now = new Date();
    var datePart = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");
    var randomPart = String(Date.now()).slice(-5);
    return "M" + datePart + randomPart;
}
// =========================================
// 會員訂單資料
// =========================================
function getMemberOrders(memberId) {
    return (Array.isArray(salesHistory)
        ? salesHistory
        : []).filter(function (order) {
        return order.memberId === memberId;
    });
}
function getNormalMemberOrders(memberId) {
    return getMemberOrders(memberId)
        .filter(function (order) {
        return order.status !== "cancel";
    });
}
function getMemberOrderCount(memberId) {
    return getNormalMemberOrders(memberId)
        .length;
}
function getMemberLastPurchase(memberId) {
    var order = getNormalMemberOrders(memberId)[0];
    if (!order) {
        return "尚無消費";
    }
    return "".concat(order.date || "", " ").concat(order.time || "").trim();
}
// =========================================
// 開啟會員管理
// =========================================
function openMemberManager() {
    renderMemberList();
    closeMemberEditor();
    showPage("memberManagerPage");
}
function renderMemberList() {
    var _a;
    var box = document.getElementById("memberManagerList");
    if (!box)
        return;
    var query = (((_a = document.getElementById("memberSearchInput")) === null || _a === void 0 ? void 0 : _a.value) || "")
        .trim()
        .toLowerCase();
    var rows = memberData.filter(function (member) {
        return !query ||
            [
                member.memberNo,
                member.name,
                member.phone,
                member.birthday,
                member.note
            ]
                .join(" ")
                .toLowerCase()
                .includes(query);
    });
    if (rows.length === 0) {
        box.innerHTML = "\n\n<div class=\"member-empty-card\">\n\n    <div class=\"member-empty-icon\">\n        \uD83D\uDC64\n    </div>\n\n    <div class=\"member-empty-title\">\n        \u627E\u4E0D\u5230\u6703\u54E1\n    </div>\n\n    <div class=\"member-empty-text\">\n        \u53EF\u65B0\u589E\u6703\u54E1\u6216\u8ABF\u6574\u641C\u5C0B\u689D\u4EF6\n    </div>\n\n</div>\n\n";
        return;
    }
    box.innerHTML =
        rows.map(function (member) {
            var orderCount = getMemberOrderCount(member.id);
            var lastPurchase = getMemberLastPurchase(member.id);
            return "\n\n<div class=\"member-card\">\n\n    <div class=\"member-card-header\">\n\n        <div>\n\n            <div class=\"member-card-name\">\n                ".concat(memberEsc(member.name), "\n            </div>\n\n            <div class=\"member-card-number\">\n                ").concat(memberEsc(member.memberNo), "\n            </div>\n\n        </div>\n\n        <div class=\"member-card-phone\">\n            \uD83D\uDCF1 ").concat(memberEsc(member.phone), "\n        </div>\n\n    </div>\n\n    <div class=\"member-card-grid\">\n\n        <div>\n            <span>\u751F\u65E5</span>\n            <strong>").concat(member.birthday || "未填寫", "</strong>\n        </div>\n\n        <div>\n            <span>\u52A0\u5165\u65E5\u671F</span>\n            <strong>").concat(member.joinDate || "", "</strong>\n        </div>\n\n        <div>\n            <span>\u7D2F\u7A4D\u6D88\u8CBB</span>\n            <strong>NT$").concat(memberMoney(member.totalSpend), "</strong>\n        </div>\n\n        <div>\n            <span>\u6D88\u8CBB\u9EDE\u6578</span>\n            <strong>").concat(Number(member.points || 0), " \u9EDE</strong>\n        </div>\n\n        <div class=\"member-toy-point-box\">\n            <span>\u73A9\u5177\u9EDE\u6578</span>\n            <strong>").concat(Number(member.toyPoints || 0), " \u9EDE</strong>\n        </div>\n\n        <div>\n            <span>\u6703\u54E1\u7B49\u7D1A</span>\n            <strong>").concat(getMemberLevel(member).name, "</strong>\n        </div>\n\n        <div>\n            <span>\u6D88\u8CBB\u6B21\u6578</span>\n            <strong>").concat(orderCount, " \u6B21</strong>\n        </div>\n\n        <div>\n            <span>\u6700\u8FD1\u6D88\u8CBB</span>\n            <strong>").concat(lastPurchase, "</strong>\n        </div>\n\n    </div>\n\n    ").concat(member.note
                ? "\n        <div class=\"member-card-note\">\n            \u5099\u8A3B\uFF1A".concat(memberEsc(member.note), "\n        </div>\n        ")
                : "", "\n\n    <div class=\"member-card-actions\">\n\n        <button\n            class=\"member-toy-adjust-btn\"\n            onclick=\"adjustToyPoints('").concat(member.id, "')\">\n            \u73A9\u5177\u9EDE\u6578\u64CD\u4F5C\n        </button>\n\n        <button\n            class=\"member-history-btn\"\n            onclick=\"openMemberHistory('").concat(member.id, "')\">\n            \u6D88\u8CBB\u7D00\u9304\n        </button>\n\n        <button\n            class=\"member-edit-btn member-admin-only\"\n            onclick=\"openMemberEditor('").concat(member.id, "')\">\n            \u7DE8\u8F2F\n        </button>\n\n        <button\n            class=\"member-delete-btn member-admin-only\"\n            onclick=\"deleteMember('").concat(member.id, "')\">\n            \u522A\u9664\n        </button>\n\n    </div>\n\n</div>\n\n");
        }).join("");
}
(_a = document
    .getElementById("memberSearchInput")) === null || _a === void 0 ? void 0 : _a.addEventListener("input", renderMemberList);
// =========================================
// 會員消費紀錄
// =========================================
function openMemberHistory(memberId) {
    playClick();
    currentMemberHistoryId =
        memberId;
    renderMemberHistory();
    showPage("memberHistoryPage");
}
function renderMemberHistory() {
    var content = document.getElementById("memberHistoryContent");
    if (!content)
        return;
    var member = memberData.find(function (item) {
        return item.id === currentMemberHistoryId;
    });
    if (!member) {
        content.innerHTML =
            "找不到會員資料";
        return;
    }
    var orders = getMemberOrders(member.id);
    var orderHtml = "";
    if (orders.length === 0) {
        orderHtml = "\n\n<div class=\"member-history-empty\">\n    \u6B64\u6703\u54E1\u76EE\u524D\u6C92\u6709\u6D88\u8CBB\u7D00\u9304\n</div>\n\n";
    }
    else {
        orderHtml =
            orders.map(function (order) {
                var originalIndex = salesHistory.indexOf(order);
                var items = Array.isArray(order.items)
                    ? order.items
                    : [];
                var itemText = items.map(function (item) {
                    return item.title || item.id || "票券";
                }).join("、");
                var cancelled = order.status === "cancel";
                return "\n\n<button\n    type=\"button\"\n    class=\"member-history-order ".concat(cancelled ? "cancelled" : "", "\"\n    onclick=\"playClick(); openOrderDetail(").concat(originalIndex, ")\">\n\n    <div>\n\n        <div class=\"member-history-order-date\">\n            ").concat(order.date || "", " ").concat(order.time || "", "\n        </div>\n\n        <div class=\"member-history-order-items\">\n            ").concat(memberEsc(itemText), "\n        </div>\n\n        <div class=\"member-history-order-no\">\n            ").concat(memberEsc(order.orderNo || ""), "\n        </div>\n\n    </div>\n\n    <div class=\"member-history-order-right\">\n\n        <strong>\n            NT$").concat(memberMoney(order.amount), "\n        </strong>\n\n        <span>\n            ").concat(cancelled ? "已作廢" : order.payment || "", "\n        </span>\n\n    </div>\n\n</button>\n\n");
            }).join("");
    }
    content.innerHTML = "\n\n<div class=\"member-history-summary\">\n\n    <div class=\"member-history-name\">\n        \uD83D\uDC64 ".concat(memberEsc(member.name), "\n    </div>\n\n    <div class=\"member-history-phone\">\n        ").concat(memberEsc(member.phone), "\n    </div>\n\n    <div class=\"member-history-summary-grid\">\n\n        <div>\n            <span>\u6703\u54E1\u7DE8\u865F</span>\n            <strong>").concat(memberEsc(member.memberNo), "</strong>\n        </div>\n\n        <div>\n            <span>\u7D2F\u7A4D\u6D88\u8CBB</span>\n            <strong>NT$").concat(memberMoney(member.totalSpend), "</strong>\n        </div>\n\n        <div>\n            <span>\u6B63\u5E38\u4EA4\u6613</span>\n            <strong>").concat(getMemberOrderCount(member.id), " \u6B21</strong>\n        </div>\n\n        <div>\n            <span>\u6D88\u8CBB\u9EDE\u6578</span>\n            <strong>").concat(Number(member.points || 0), " \u9EDE</strong>\n        </div>\n\n        <div>\n            <span>\u73A9\u5177\u9EDE\u6578</span>\n            <strong>").concat(Number(member.toyPoints || 0), " \u9EDE</strong>\n        </div>\n\n        <div>\n            <span>\u6703\u54E1\u7B49\u7D1A</span>\n            <strong>").concat(getMemberLevel(member).name, "</strong>\n        </div>\n\n    </div>\n\n</div>\n\n").concat(renderToyPointHistory(member), "\n\n<div class=\"member-history-list\">\n    ").concat(orderHtml, "\n</div>\n\n");
}
function renderToyPointHistory(member) {
    var rows = Array.isArray(member.toyPointHistory)
        ? member.toyPointHistory.slice(0, 20)
        : [];
    if (rows.length === 0) {
        return "\n\n<div class=\"toy-point-history-card\">\n\n    <div class=\"toy-point-history-title\">\n        \uD83C\uDF81 \u73A9\u5177\u9EDE\u6578\u7D00\u9304\n    </div>\n\n    <div class=\"toy-point-history-empty\">\n        \u5C1A\u7121\u73A9\u5177\u9EDE\u6578\u7D00\u9304\n    </div>\n\n</div>\n\n";
    }
    var html = rows.map(function (row) {
        var amount = Number(row.amount || 0);
        return "\n\n<div class=\"toy-point-history-row\">\n\n    <div>\n\n        <strong>\n            ".concat(memberEsc(row.reason || "玩具點數調整"), "\n        </strong>\n\n        <span>\n            ").concat(memberEsc(row.date || ""), "\n            ").concat(row.orderNo ? "\u30FB".concat(memberEsc(row.orderNo)) : "", "\n            ").concat(row.operator ? "\u30FB".concat(memberEsc(row.operator)) : "", "\n        </span>\n\n        ").concat(row.note
            ? "<small>".concat(memberEsc(row.note), "</small>")
            : "", "\n\n    </div>\n\n    <div class=\"").concat(amount >= 0 ? "toy-point-plus" : "toy-point-minus", "\">\n\n        ").concat(amount >= 0 ? "+" : "").concat(amount, " \u9EDE\n\n        <small>\n            \u9918\u984D ").concat(Number(row.balance || 0), "\n        </small>\n\n    </div>\n\n</div>\n\n");
    }).join("");
    return "\n\n<div class=\"toy-point-history-card\">\n\n    <div class=\"toy-point-history-title\">\n        \uD83C\uDF81 \u73A9\u5177\u9EDE\u6578\u7D00\u9304\n    </div>\n\n    ".concat(html, "\n\n</div>\n\n");
}
// =========================================
// 新增／編輯會員
// =========================================
function openMemberEditor(id) {
    if (id === void 0) { id = ""; }
    playClick();
    var box = document.getElementById("memberEditorPanel");
    if (!box)
        return;
    var member = memberData.find(function (item) {
        return item.id === id;
    }) || {
        id: "",
        name: "",
        phone: "",
        birthday: "",
        joinDate: new Date().toLocaleDateString("zh-TW"),
        totalSpend: 0,
        points: 0,
        note: ""
    };
    box.style.display = "block";
    box.innerHTML = "\n\n<div class=\"member-editor-card\">\n\n    <div class=\"member-editor-title\">\n        ".concat(member.id ? "編輯會員" : "新增會員", "\n    </div>\n\n    <input\n        type=\"hidden\"\n        id=\"memberEditId\"\n        value=\"").concat(memberEsc(member.id), "\">\n\n    <div class=\"member-editor-grid\">\n\n        <div class=\"member-form-field\">\n\n            <label>\u59D3\u540D *</label>\n\n            <input\n                id=\"memberEditName\"\n                value=\"").concat(memberEsc(member.name), "\">\n\n        </div>\n\n        <div class=\"member-form-field\">\n\n            <label>\u624B\u6A5F *</label>\n\n            <input\n                id=\"memberEditPhone\"\n                inputmode=\"tel\"\n                value=\"").concat(memberEsc(member.phone), "\">\n\n        </div>\n\n        <div class=\"member-form-field\">\n\n            <label>\u751F\u65E5</label>\n\n            <input\n                id=\"memberEditBirthday\"\n                type=\"date\"\n                value=\"").concat(memberEsc(member.birthday), "\">\n\n        </div>\n\n        <div class=\"member-form-field\">\n\n            <label>\u52A0\u5165\u65E5\u671F</label>\n\n            <input\n                id=\"memberEditJoinDate\"\n                value=\"").concat(memberEsc(member.joinDate), "\">\n\n        </div>\n\n        <div class=\"member-form-field\">\n\n            <label>\u7D2F\u7A4D\u6D88\u8CBB</label>\n\n            <input\n                id=\"memberEditSpend\"\n                type=\"number\"\n                min=\"0\"\n                value=\"").concat(Number(member.totalSpend || 0), "\">\n\n        </div>\n\n        <div class=\"member-form-field\">\n\n            <label>\u7D2F\u7A4D\u9EDE\u6578</label>\n\n            <input\n                id=\"memberEditPoints\"\n                type=\"number\"\n                min=\"0\"\n                value=\"").concat(Number(member.points || 0), "\">\n\n        </div>\n\n        <div class=\"member-form-field member-note-field\">\n\n            <label>\u5099\u8A3B</label>\n\n            <textarea id=\"memberEditNote\">").concat(memberEsc(member.note), "</textarea>\n\n        </div>\n\n    </div>\n\n    <div class=\"member-editor-actions\">\n\n        <button\n            class=\"member-cancel-btn\"\n            onclick=\"closeMemberEditor()\">\n            \u53D6\u6D88\n        </button>\n\n        <button\n            class=\"member-save-btn\"\n            onclick=\"saveMemberEditor()\">\n            \u5132\u5B58\u6703\u54E1\n        </button>\n\n    </div>\n\n</div>\n\n");
}
function closeMemberEditor() {
    var box = document.getElementById("memberEditorPanel");
    if (box) {
        box.style.display = "none";
        box.innerHTML = "";
    }
}
function saveMemberEditor() {
    playClick();
    var id = document.getElementById("memberEditId").value;
    var name = document.getElementById("memberEditName").value.trim();
    var phone = memberPhone(document.getElementById("memberEditPhone").value);
    if (!name || !phone) {
        alert("❌ 姓名與手機不可空白");
        return;
    }
    if (memberData.some(function (member) {
        return member.phone === phone &&
            member.id !== id;
    })) {
        alert("❌ 此手機已經是會員");
        return;
    }
    var values = {
        name: name,
        phone: phone,
        birthday: document.getElementById("memberEditBirthday").value,
        joinDate: document.getElementById("memberEditJoinDate").value.trim() ||
            new Date().toLocaleDateString("zh-TW"),
        totalSpend: Math.max(0, Number(document.getElementById("memberEditSpend").value) || 0),
        points: Math.max(0, Number(document.getElementById("memberEditPoints").value) || 0),
        note: document.getElementById("memberEditNote").value.trim()
    };
    if (id) {
        Object.assign(memberData.find(function (member) {
            return member.id === id;
        }), values);
    }
    else {
        memberData.unshift(__assign(__assign({ id: "member_" + Date.now(), memberNo: newMemberNo() }, values), { lastPurchaseDate: "", toyPoints: 0, pointHistory: [], toyPointHistory: [] }));
    }
    saveMembers();
    closeMemberEditor();
    renderMemberList();
    alert("✅ 會員資料已儲存");
}
function deleteMember(id) {
    playClick();
    var member = memberData.find(function (item) {
        return item.id === id;
    });
    if (!member ||
        !confirm("\u78BA\u5B9A\u522A\u9664\u6703\u54E1\u300C".concat(member.name, "\u300D\uFF1F"))) {
        return;
    }
    memberData =
        memberData.filter(function (item) {
            return item.id !== id;
        });
    if ((currentMember === null || currentMember === void 0 ? void 0 : currentMember.id) === id) {
        currentMember = null;
    }
    saveMembers();
    renderMemberList();
    renderSelectedMember();
}
// =========================================
// 前台快速會員
// =========================================
function toggleMemberQuickPanel() {
    var _a;
    playClick();
    var panel = document.getElementById("memberQuickPanel");
    if (!panel)
        return;
    panel.style.display =
        panel.style.display === "block"
            ? "none"
            : "block";
    (_a = document
        .getElementById("memberQuickPhone")) === null || _a === void 0 ? void 0 : _a.focus();
}
function findMemberByPhone(phoneValue) {
    var phone = memberPhone(phoneValue);
    return memberData.find(function (member) {
        return member.phone === phone;
    }) || null;
}
function searchQuickMember() {
    var _a;
    playClick();
    var phone = memberPhone((_a = document.getElementById("memberQuickPhone")) === null || _a === void 0 ? void 0 : _a.value);
    if (!phone) {
        alert("請先輸入手機");
        return;
    }
    var member = findMemberByPhone(phone);
    if (member) {
        currentMember = member;
        renderQuickResult();
        renderSelectedMember();
    }
    else {
        renderQuickJoin(phone);
    }
}
function renderQuickJoin(phone) {
    var box = document.getElementById("memberQuickResult");
    if (!box)
        return;
    box.innerHTML = "\n\n<div class=\"quick-join-card\">\n\n    <div class=\"quick-join-title\">\n        \u627E\u4E0D\u5230\u6703\u54E1\uFF0C\u53EF\u5FEB\u901F\u52A0\u5165\n    </div>\n\n    <input\n        id=\"quickJoinName\"\n        placeholder=\"\u6703\u54E1\u59D3\u540D\">\n\n    <input\n        id=\"quickJoinBirthday\"\n        type=\"date\">\n\n    <textarea\n        id=\"quickJoinNote\"\n        placeholder=\"\u5099\u8A3B\uFF08\u53EF\u4E0D\u586B\uFF09\"></textarea>\n\n    <button\n        onclick=\"createQuickMember('".concat(phone, "')\">\n        \u52A0\u5165\u6703\u54E1\u4E26\u5957\u7528\n    </button>\n\n</div>\n\n");
}
function createQuickMember(phone) {
    playClick();
    var name = document.getElementById("quickJoinName").value.trim();
    if (!name) {
        alert("請輸入會員姓名");
        return;
    }
    var member = {
        id: "member_" + Date.now(),
        memberNo: newMemberNo(),
        name: name,
        phone: memberPhone(phone),
        birthday: document.getElementById("quickJoinBirthday").value,
        joinDate: new Date().toLocaleDateString("zh-TW"),
        totalSpend: 0,
        points: 0,
        note: document.getElementById("quickJoinNote").value.trim(),
        lastPurchaseDate: "",
        toyPoints: 0,
        pointHistory: [],
        toyPointHistory: []
    };
    memberData.unshift(member);
    saveMembers();
    currentMember = member;
    renderQuickResult();
    renderSelectedMember();
    alert("✅ 已加入會員");
}
function renderQuickResult() {
    var box = document.getElementById("memberQuickResult");
    if (!box ||
        !currentMember) {
        return;
    }
    box.innerHTML = "\n\n<div class=\"quick-member-found\">\n\n    <div>\n\n        <strong>\n            ".concat(memberEsc(currentMember.name), "\n        </strong>\n\n        <span>\n            ").concat(memberEsc(currentMember.phone), "\n        </span>\n\n        <small>\n            \u7D2F\u7A4D\u6D88\u8CBB NT$").concat(memberMoney(currentMember.totalSpend), "\n            \u30FB\u6D88\u8CBB ").concat(getMemberOrderCount(currentMember.id), " \u6B21\n        </small>\n\n    </div>\n\n    <button\n        onclick=\"clearCurrentMember()\">\n        \u53D6\u6D88\u5957\u7528\n    </button>\n\n</div>\n\n");
}
function clearCurrentMember() {
    playClick();
    currentMember = null;
    var phone = document.getElementById("memberQuickPhone");
    var result = document.getElementById("memberQuickResult");
    if (phone) {
        phone.value = "";
    }
    if (result) {
        result.innerHTML = "";
    }
    renderSelectedMember();
}
function renderSelectedMember() {
    document
        .querySelectorAll(".selected-member-display")
        .forEach(function (element) {
        if (currentMember) {
            element.className =
                "selected-member-display active";
            element.innerHTML = "\n\n<span>\n    \uD83D\uDC64 ".concat(memberEsc(currentMember.name), "\n</span>\n\n<strong>\n    ").concat(memberEsc(currentMember.phone), "\n</strong>\n\n<small>\n    \u7D2F\u7A4D NT$").concat(memberMoney(currentMember.totalSpend), "\n    \u30FB").concat(getMemberOrderCount(currentMember.id), " \u6B21\u6D88\u8CBB\n</small>\n\n");
        }
        else {
            element.className =
                "selected-member-display";
            element.textContent =
                "目前為非會員交易";
        }
    });
}
function getCurrentMemberOrderInfo() {
    return currentMember
        ? {
            memberId: currentMember.id,
            memberNo: currentMember.memberNo,
            memberName: currentMember.name,
            memberPhone: currentMember.phone
        }
        : {
            memberId: "",
            memberNo: "",
            memberName: "",
            memberPhone: ""
        };
}
function calculateConsumePoints(amount) {
    return Math.floor(Number(amount || 0) /
        CONSUME_POINT_RATE);
}
function applyMemberPurchase(amount, order) {
    if (!currentMember)
        return;
    var member = memberData.find(function (item) {
        return item.id === currentMember.id;
    });
    if (!member)
        return;
    var spend = Number(amount || 0);
    var earnedPoints = calculateConsumePoints(spend);
    member.totalSpend =
        Number(member.totalSpend || 0) +
            spend;
    member.points =
        Number(member.points || 0) +
            earnedPoints;
    member.lastPurchaseDate =
        new Date().toLocaleString("zh-TW");
    member.pointHistory.unshift({
        id: "point_" + Date.now(),
        date: new Date().toLocaleString("zh-TW"),
        amount: earnedPoints,
        reason: "消費累積",
        orderNo: (order === null || order === void 0 ? void 0 : order.orderNo) || "",
        balance: member.points
    });
    if (order) {
        order.earnedPoints =
            earnedPoints;
        order.memberLevel =
            getMemberLevel(member).name;
        saveSalesHistory();
    }
    saveMembers();
}
function canRollbackMemberOrder(order) {
    var _a;
    if (!order ||
        !order.memberId) {
        return true;
    }
    var member = memberData.find(function (item) {
        return item.id === order.memberId;
    });
    if (!member) {
        return true;
    }
    var earnedPoints = Number(order.earnedPoints || 0);
    var toyPoints = Number(((_a = order.toyPointConversion) === null || _a === void 0 ? void 0 : _a.points) ||
        0);
    if (member.points < earnedPoints) {
        alert("❌ 會員消費點數已被使用，無法直接作廢此訂單。請先由店長調整點數。");
        return false;
    }
    if (member.toyPoints < toyPoints) {
        alert("❌ 此訂單轉入的玩具點數已被使用，無法直接作廢。請先補足玩具點數。");
        return false;
    }
    return true;
}
function rollbackMemberPurchase(order) {
    var _a;
    if (!order ||
        !order.memberId) {
        return;
    }
    var member = memberData.find(function (item) {
        return item.id === order.memberId;
    });
    if (!member)
        return;
    var earnedPoints = Number(order.earnedPoints || 0);
    var toyPoints = Number(((_a = order.toyPointConversion) === null || _a === void 0 ? void 0 : _a.points) ||
        0);
    member.totalSpend =
        Math.max(0, Number(member.totalSpend || 0) -
            Number(order.amount || 0));
    member.points =
        Math.max(0, Number(member.points || 0) -
            earnedPoints);
    member.toyPoints =
        Math.max(0, Number(member.toyPoints || 0) -
            toyPoints);
    if (earnedPoints > 0) {
        member.pointHistory.unshift({
            id: "point_" + Date.now(),
            date: new Date().toLocaleString("zh-TW"),
            amount: -earnedPoints,
            reason: "訂單作廢扣回",
            orderNo: order.orderNo || "",
            balance: member.points
        });
    }
    if (toyPoints > 0) {
        member.toyPointHistory.unshift({
            id: "toy_" + Date.now(),
            date: new Date().toLocaleString("zh-TW"),
            amount: -toyPoints,
            reason: "訂單作廢扣回",
            orderNo: order.orderNo || "",
            operator: currentUserRole === "staff"
                ? "員工"
                : "店長",
            balance: member.toyPoints
        });
    }
    saveMembers();
}
// =========================================
// 玩具點數手動調整
// =========================================
function adjustToyPoints(memberId) {
    playClick();
    var member = memberData.find(function (item) {
        return item.id === memberId;
    });
    if (!member)
        return;
    var rawAmount = prompt("\u76EE\u524D\u73A9\u5177\u9EDE\u6578\uFF1A".concat(member.toyPoints, " \u9EDE\n\n\u589E\u52A0\u8ACB\u8F38\u5165\u6B63\u6578\uFF0C\u514C\u63DB\u6263\u9664\u8ACB\u8F38\u5165\u8CA0\u6578\uFF1A"));
    if (rawAmount === null)
        return;
    var amount = Number(rawAmount);
    if (!Number.isInteger(amount) ||
        amount === 0) {
        alert("❌ 請輸入非 0 的整數點數");
        return;
    }
    if (amount < 0 &&
        member.toyPoints < Math.abs(amount)) {
        alert("❌ 玩具點數不足");
        return;
    }
    var reason = prompt(amount > 0
        ? "請輸入增加點數原因："
        : "請輸入兌換獎品名稱或扣點原因：");
    if (reason === null ||
        !reason.trim()) {
        alert("❌ 必須填寫原因");
        return;
    }
    var note = prompt("備註（可留空）：");
    var newBalance = Number(member.toyPoints || 0) +
        amount;
    if (!confirm("\u6703\u54E1\uFF1A".concat(member.name, "\n\u76EE\u524D\uFF1A").concat(member.toyPoints, " \u9EDE\n\u672C\u6B21\uFF1A").concat(amount > 0 ? "+" : "").concat(amount, " \u9EDE\n\u64CD\u4F5C\u5F8C\uFF1A").concat(newBalance, " \u9EDE\n\n\u78BA\u5B9A\u57F7\u884C\uFF1F"))) {
        return;
    }
    member.toyPoints =
        newBalance;
    member.toyPointHistory.unshift({
        id: "toy_" + Date.now(),
        date: new Date().toLocaleString("zh-TW"),
        amount: amount,
        reason: reason.trim(),
        note: (note || "").trim(),
        orderNo: "",
        operator: currentUserRole === "staff"
            ? "員工"
            : "店長",
        balance: member.toyPoints
    });
    saveMembers();
    renderMemberList();
    if (currentMemberHistoryId ===
        member.id) {
        renderMemberHistory();
    }
    alert("✅ 玩具點數已更新");
}
// =========================================
// 訂單玩具轉點與離場補綁會員
// =========================================
function getOrderToyCounts(order) {
    var result = {
        green: 0,
        red: 0
    };
    (Array.isArray(order === null || order === void 0 ? void 0 : order.items)
        ? order.items
        : []).forEach(function (item) {
        if (item.toy === "green") {
            result.green++;
        }
        if (item.toy === "red") {
            result.red++;
        }
    });
    return result;
}
function renderToyPointOrderPanel(orderNo) {
    var panel = document.getElementById("toyPointOrderPanel");
    if (!panel)
        return;
    var order = salesHistory.find(function (item) {
        return item.orderNo === orderNo;
    });
    if (!order) {
        panel.innerHTML = "";
        return;
    }
    var counts = getOrderToyCounts(order);
    var converted = order.toyPointConversion || {
        greenQty: 0,
        redQty: 0,
        points: 0
    };
    var greenRemaining = Math.max(0, counts.green -
        Number(converted.greenQty || 0));
    var redRemaining = Math.max(0, counts.red -
        Number(converted.redQty || 0));
    if (counts.green === 0 &&
        counts.red === 0) {
        panel.innerHTML = "\n\n<div class=\"toy-order-card disabled\">\n    \u6B64\u8A02\u55AE\u6C92\u6709\u8D08\u9001\u73A9\u5177\n</div>\n\n";
        return;
    }
    if (order.status === "cancel") {
        panel.innerHTML = "\n\n<div class=\"toy-order-card disabled\">\n    \u5DF2\u4F5C\u5EE2\u8A02\u55AE\u4E0D\u53EF\u8F49\u63DB\u73A9\u5177\u9EDE\u6578\n</div>\n\n";
        return;
    }
    if (!order.memberId) {
        panel.innerHTML = "\n\n<div class=\"toy-order-card\">\n\n    <div class=\"toy-order-title\">\n        \uD83C\uDF81 \u96E2\u5834\u88DC\u7D81\u6703\u54E1\uFF0B\u73A9\u5177\u8F49\u9EDE\n    </div>\n\n    <div class=\"toy-order-description\">\n        \u6B64\u8A02\u55AE\u8CFC\u7968\u6642\u672A\u7D81\u6703\u54E1\u3002\u8F38\u5165\u624B\u6A5F\u5F8C\uFF0C\u53EF\u7D81\u5B9A\u73FE\u6709\u6703\u54E1\uFF1B\u627E\u4E0D\u5230\u6642\u53EF\u5FEB\u901F\u5EFA\u7ACB\u3002\n    </div>\n\n    <div class=\"toy-order-bind-row\">\n\n        <input\n            id=\"lateBindPhone\"\n            inputmode=\"tel\"\n            placeholder=\"\u8F38\u5165\u6703\u54E1\u624B\u6A5F\">\n\n        <button\n            onclick=\"lateBindOrderMember('".concat(orderNo, "')\">\n            \u641C\u5C0B\uFF0F\u5EFA\u7ACB\u6703\u54E1\n        </button>\n\n    </div>\n\n</div>\n\n");
        return;
    }
    var member = memberData.find(function (item) {
        return item.id === order.memberId;
    });
    panel.innerHTML = "\n\n<div class=\"toy-order-card\">\n\n    <div class=\"toy-order-title\">\n        \uD83C\uDF81 \u73A9\u5177\u8F49\u9EDE\n    </div>\n\n    <div class=\"toy-order-member\">\n        \u6703\u54E1\uFF1A".concat(memberEsc(order.memberName || (member === null || member === void 0 ? void 0 : member.name) || ""), "\n        \u30FB\u73A9\u5177\u9EDE\u6578 ").concat(Number((member === null || member === void 0 ? void 0 : member.toyPoints) || 0), " \u9EDE\n    </div>\n\n    <div class=\"toy-order-rate\">\n        \u7DA0\u6A19 1 \u500B = ").concat(TOY_POINT_GREEN, " \u9EDE\u3000\n        \u7D05\u6A19 1 \u500B = ").concat(TOY_POINT_RED, " \u9EDE\n    </div>\n\n    <div class=\"toy-order-grid\">\n\n        <label>\n\n            <span>\n                \uD83D\uDFE2 \u7DA0\u6A19\u53EF\u8F49 ").concat(greenRemaining, " \u500B\n            </span>\n\n            <input\n                id=\"convertGreenQty\"\n                type=\"number\"\n                min=\"0\"\n                max=\"").concat(greenRemaining, "\"\n                value=\"0\"\n                ").concat(greenRemaining === 0 ? "disabled" : "", ">\n\n        </label>\n\n        <label>\n\n            <span>\n                \uD83D\uDD34 \u7D05\u6A19\u53EF\u8F49 ").concat(redRemaining, " \u500B\n            </span>\n\n            <input\n                id=\"convertRedQty\"\n                type=\"number\"\n                min=\"0\"\n                max=\"").concat(redRemaining, "\"\n                value=\"0\"\n                ").concat(redRemaining === 0 ? "disabled" : "", ">\n\n        </label>\n\n    </div>\n\n    ").concat(converted.points > 0
        ? "\n        <div class=\"toy-order-converted\">\n            \u6B64\u8A02\u55AE\u5DF2\u7D2F\u7A4D ".concat(converted.points, " \u73A9\u5177\u9EDE\n        </div>\n        ")
        : "", "\n\n    ").concat(greenRemaining > 0 ||
        redRemaining > 0
        ? "\n        <button\n            class=\"toy-order-convert-btn\"\n            onclick=\"convertOrderToysToPoints('".concat(orderNo, "')\">\n            \u78BA\u8A8D\u653E\u68C4\u73A9\u5177\u4E26\u7D2F\u7A4D\u9EDE\u6578\n        </button>\n        ")
        : "\n        <div class=\"toy-order-complete\">\n            \u6B64\u8A02\u55AE\u73A9\u5177\u5DF2\u5168\u90E8\u8655\u7406\u5B8C\u6210\n        </div>\n        ", "\n\n</div>\n\n");
}
function lateBindOrderMember(orderNo) {
    playClick();
    var phoneInput = document.getElementById("lateBindPhone");
    var phone = memberPhone(phoneInput === null || phoneInput === void 0 ? void 0 : phoneInput.value);
    if (!phone) {
        alert("請輸入手機");
        return;
    }
    var member = findMemberByPhone(phone);
    if (!member) {
        if (!confirm("此手機尚未加入會員，是否快速建立？")) {
            return;
        }
        var name = prompt("請輸入會員姓名：");
        if (name === null ||
            !name.trim()) {
            alert("❌ 姓名不可空白");
            return;
        }
        var birthday = prompt("生日（可留空，例如 2020-05-10）：");
        member = {
            id: "member_" + Date.now(),
            memberNo: newMemberNo(),
            name: name.trim(),
            phone: phone,
            birthday: (birthday || "").trim(),
            joinDate: new Date().toLocaleDateString("zh-TW"),
            totalSpend: 0,
            points: 0,
            toyPoints: 0,
            note: "離場玩具轉點快速入會",
            lastPurchaseDate: "",
            pointHistory: [],
            toyPointHistory: []
        };
        memberData.unshift(member);
        saveMembers();
    }
    var order = salesHistory.find(function (item) {
        return item.orderNo === orderNo;
    });
    if (!order)
        return;
    order.memberId =
        member.id;
    order.memberNo =
        member.memberNo;
    order.memberName =
        member.name;
    order.memberPhone =
        member.phone;
    order.memberBoundAt =
        new Date().toLocaleString("zh-TW");
    order.memberBoundType =
        "late-toy-only";
    saveSalesHistory();
    renderToyPointOrderPanel(orderNo);
    alert("✅ 訂單已補綁會員\n此筆只可累積玩具點數，不補發消費點數與累積消費。");
}
function convertOrderToysToPoints(orderNo) {
    var _a, _b;
    playClick();
    var order = salesHistory.find(function (item) {
        return item.orderNo === orderNo;
    });
    if (!order ||
        !order.memberId ||
        order.status === "cancel") {
        return;
    }
    var member = memberData.find(function (item) {
        return item.id === order.memberId;
    });
    if (!member) {
        alert("❌ 找不到會員資料");
        return;
    }
    var counts = getOrderToyCounts(order);
    var converted = order.toyPointConversion || {
        greenQty: 0,
        redQty: 0,
        points: 0
    };
    var greenRemaining = Math.max(0, counts.green -
        Number(converted.greenQty || 0));
    var redRemaining = Math.max(0, counts.red -
        Number(converted.redQty || 0));
    var greenQty = Math.max(0, Number(((_a = document.getElementById("convertGreenQty")) === null || _a === void 0 ? void 0 : _a.value) || 0));
    var redQty = Math.max(0, Number(((_b = document.getElementById("convertRedQty")) === null || _b === void 0 ? void 0 : _b.value) || 0));
    if (!Number.isInteger(greenQty) ||
        !Number.isInteger(redQty) ||
        greenQty > greenRemaining ||
        redQty > redRemaining) {
        alert("❌ 玩具數量不正確");
        return;
    }
    var points = greenQty * TOY_POINT_GREEN +
        redQty * TOY_POINT_RED;
    if (points <= 0) {
        alert("請選擇要放棄的玩具數量");
        return;
    }
    if (!confirm("\u653E\u68C4\u7DA0\u6A19 ".concat(greenQty, " \u500B\u3001\u7D05\u6A19 ").concat(redQty, " \u500B\n\u672C\u6B21\u589E\u52A0 ").concat(points, " \u73A9\u5177\u9EDE\n\n\u78BA\u8A8D\u5F8C\u4E0D\u53EF\u518D\u6B21\u9818\u53D6\u9019\u4E9B\u73A9\u5177\uFF0C\u78BA\u5B9A\u7E7C\u7E8C\uFF1F"))) {
        return;
    }
    member.toyPoints =
        Number(member.toyPoints || 0) +
            points;
    member.toyPointHistory.unshift({
        id: "toy_" + Date.now(),
        date: new Date().toLocaleString("zh-TW"),
        amount: points,
        reason: "放棄票券贈送玩具",
        note: "\u7DA0\u6A19 ".concat(greenQty, " \u500B\u3001\u7D05\u6A19 ").concat(redQty, " \u500B"),
        orderNo: order.orderNo || "",
        operator: currentUserRole === "staff"
            ? "員工"
            : "店長",
        balance: member.toyPoints
    });
    order.toyPointConversion = {
        greenQty: Number(converted.greenQty || 0) +
            greenQty,
        redQty: Number(converted.redQty || 0) +
            redQty,
        points: Number(converted.points || 0) +
            points,
        memberId: member.id,
        convertedAt: new Date().toLocaleString("zh-TW"),
        operator: currentUserRole === "staff"
            ? "員工"
            : "店長"
    };
    saveMembers();
    saveSalesHistory();
    renderToyPointOrderPanel(orderNo);
    alert("\u2705 \u5DF2\u589E\u52A0 ".concat(points, " \u73A9\u5177\u9EDE\n\u76EE\u524D\u9918\u984D\uFF1A").concat(member.toyPoints, " \u9EDE"));
}
function resetCurrentMemberSelection() {
    currentMember = null;
    var panel = document.getElementById("memberQuickPanel");
    var phone = document.getElementById("memberQuickPhone");
    var result = document.getElementById("memberQuickResult");
    if (panel) {
        panel.style.display = "none";
    }
    if (phone) {
        phone.value = "";
    }
    if (result) {
        result.innerHTML = "";
    }
    renderSelectedMember();
}
// =========================================
// 會員匯出／匯入
// =========================================
function exportMemberData() {
    playClick();
    var data = {
        app: "小怪獸售票機",
        version: "V6.4C",
        exportedAt: new Date().toISOString(),
        members: memberData
    };
    downloadTextFile("monster-members-".concat(Date.now(), ".json"), JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}
function chooseMemberImportFile() {
    playClick();
    var input = document.getElementById("memberImportInput");
    if (input) {
        input.value = "";
        input.click();
    }
}
function importMemberFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var data, _a, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!file)
                        return [2 /*return*/];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, file.text()];
                case 2:
                    data = _b.apply(_a, [_c.sent()]);
                    if (!Array.isArray(data.members)) {
                        throw new Error();
                    }
                    if (!confirm("\u5373\u5C07\u532F\u5165 ".concat(data.members.length, " \u7B46\u6703\u54E1\u8CC7\u6599\uFF0C\u78BA\u5B9A\u7E7C\u7E8C\uFF1F"))) {
                        return [2 /*return*/];
                    }
                    memberData =
                        data.members;
                    saveMembers();
                    renderMemberList();
                    alert("✅ 會員資料已匯入");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    alert("❌ 會員資料匯入失敗");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
(_b = document
    .getElementById("memberImportInput")) === null || _b === void 0 ? void 0 : _b.addEventListener("change", function (event) {
    return importMemberFile(event.target.files[0]);
});
renderSelectedMember();
