// V7 Phase 1 Legacy Build | js/config/data.js
var ticketData = JSON.parse(localStorage.getItem("ticketData")) || {
    ticket2hGreen: {
        title: "2H 小怪獸",
        price: 250,
        hour: 2,
        token: 10,
        toy: "green",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-2h-green.png"
    },
    ticket2hRed: {
        title: "2H 小怪獸 Plus",
        price: 300,
        hour: 2,
        token: 15,
        toy: "red",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-2h-red.png"
    },
    ticket3hGreen: {
        title: "3H 大怪獸",
        price: 300,
        hour: 3,
        token: 15,
        toy: "green",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-3h-green.png"
    },
    ticket3hRed: {
        title: "3H 大怪獸 Plus",
        price: 350,
        hour: 3,
        token: 20,
        toy: "red",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-3h-red.png"
    },
    early: {
        title: "平日早鳥",
        price: 300,
        token: 15,
        toy: "red",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-early.png"
    },
    summer: {
        title: "寒暑假限定",
        price: 350,
        token: 20,
        toy: "red",
        reward: "token,band,toy",
        enable: true,
        image: "ticket-summer.png"
    },
    baby: {
        title: "幼幼票",
        price: 100,
        reward: "band",
        enable: true,
        image: "ticket-baby.png"
    },
    parent: {
        title: "陪同票",
        price: 80,
        reward: "band",
        enable: true,
        image: "ticket-parent.png"
    },
    token10: {
        title: "10枚代幣",
        price: 100,
        reward: "token10",
        enable: true,
        image: "ticket-token10.png"
    },
    token25: {
        title: "25枚代幣",
        price: 200,
        reward: "token25",
        enable: true,
        image: "ticket-token25.png"
    },
    powerbank: {
        title: "行動電源",
        price: 50,
        reward: "powerbank",
        enable: true,
        image: "ticket-powerbank.png"
    },
};
//=========================
// 營業模式
//==========================
var businessMode = JSON.parse(localStorage.getItem("businessMode")) || {
    mode: "weekday",
    auto: false
};
//==========================
// 系統設定
//==========================
var systemData = JSON.parse(localStorage.getItem("systemData")) || {
    // ==========================
    // 系統
    // ==========================
    homeTimeout: 60,
    paymentDelay: 8,
    printDelay: 5,
    // ==========================
    // 列印
    // ==========================
    receiptCopies: 1,
    autoPrint: true,
    showPrintAnimation: true,
    // ==========================
    // 售票
    // ==========================
    autoHome: true,
    saveHistory: true,
    successAnimation: true,
    playSound: true,
    // ==========================
    // 付款方式
    // ==========================
    payment: {
        cash: true,
        linepay: true,
        easycard: false,
        credit: false
    },
    // ==========================
    // 管理
    // ==========================
    adminPassword: "1234",
    staffPassword: "0000"
};
// ==========================
// 補齊 systemData 預設值（相容舊版本）
// ==========================
if (systemData.homeTimeout === undefined || systemData.homeTimeout === null) {
    systemData.homeTimeout = 60;
}
if (systemData.paymentDelay === undefined || systemData.paymentDelay === null) {
    systemData.paymentDelay = 8;
}
if (systemData.printDelay === undefined || systemData.printDelay === null) {
    systemData.printDelay = 5;
}
if (systemData.receiptCopies === undefined || systemData.receiptCopies === null) {
    systemData.receiptCopies = 1;
}
if (systemData.autoPrint === undefined || systemData.autoPrint === null) {
    systemData.autoPrint = true;
}
if (systemData.showPrintAnimation === undefined || systemData.showPrintAnimation === null) {
    systemData.showPrintAnimation = true;
}
if (systemData.autoHome === undefined || systemData.autoHome === null) {
    systemData.autoHome = true;
}
if (systemData.saveHistory === undefined || systemData.saveHistory === null) {
    systemData.saveHistory = true;
}
if (systemData.successAnimation === undefined || systemData.successAnimation === null) {
    systemData.successAnimation = true;
}
if (systemData.playSound === undefined || systemData.playSound === null) {
    systemData.playSound = true;
}
if (systemData.payment === undefined || systemData.payment === null) {
    systemData.payment = {};
}
if (systemData.payment.cash === undefined || systemData.payment.cash === null) {
    systemData.payment.cash = true;
}
if (systemData.payment.linepay === undefined || systemData.payment.linepay === null) {
    systemData.payment.linepay = true;
}
if (systemData.payment.easycard === undefined || systemData.payment.easycard === null) {
    systemData.payment.easycard = false;
}
if (systemData.payment.credit === undefined || systemData.payment.credit === null) {
    systemData.payment.credit = false;
}
if (systemData.adminPassword === undefined || systemData.adminPassword === null) {
    systemData.adminPassword = "1234";
}
if (systemData.staffPassword === undefined || systemData.staffPassword === null) {
    systemData.staffPassword = "0000";
}
localStorage.setItem("systemData", JSON.stringify(systemData));
//==========================
// 票券名稱
//==========================
var ticketNames = {
    ticket2hGreen: "🟢 2H 小怪獸",
    ticket2hRed: "🔴 2H 小怪獸 Plus",
    ticket3hGreen: "🟢 3H 大怪獸",
    ticket3hRed: "🔴 3H 大怪獸 Plus",
    early: "🌞 平日早鳥",
    summer: "🏖 寒暑假限定",
    baby: "👶 幼幼票",
    parent: "👨 陪同票",
    token10: "🪙 10枚代幣",
    token25: "🪙 25枚代幣",
    powerbank: "🔋 行動電源"
};
//==========================
// 圖片名稱
//==========================
var imageNames = {
    "ticket-2h-green.png": "🟢 2H 綠色票卡",
    "ticket-2h-red.png": "🔴 2H 紅色票卡",
    "ticket-3h-green.png": "🟢 3H 綠色票卡",
    "ticket-3h-red.png": "🔴 3H 紅色票卡",
    "ticket-early.png": "🌞 平日早鳥",
    "ticket-summer.png": "🏖 寒暑假限定",
    "ticket-baby.png": "👶 幼幼票",
    "ticket-parent.png": "👨 陪同票",
    "ticket-token10.png": "🪙 10枚代幣",
    "ticket-token25.png": "🪙 25枚代幣",
    "ticket-powerbank.png": "🔋 行動電源"
};
//==========================
// 可選圖片
//==========================
var imageList = [
    "ticket-2h-green.png",
    "ticket-2h-red.png",
    "ticket-3h-green.png",
    "ticket-3h-red.png",
    "ticket-early.png",
    "ticket-summer.png",
    "ticket-baby.png",
    "ticket-parent.png",
    "ticket-token10.png",
    "ticket-token25.png",
    "ticket-powerbank.png"
];
if (!ticketData.early.token) {
    ticketData.early.token = 15;
    ticketData.early.toy = "red";
}
if (!ticketData.summer.token) {
    ticketData.summer.token = 20;
    ticketData.summer.toy = "red";
}
// ===== 補上 enable 預設值 =====
for (var id in ticketData) {
    if (ticketData[id].enable === undefined) {
        ticketData[id].enable = true;
    }
}
// ===== 補上 image 預設值 =====
var defaultImages = {
    ticket2hGreen: "ticket-2h-green.png",
    ticket2hRed: "ticket-2h-red.png",
    ticket3hGreen: "ticket-3h-green.png",
    ticket3hRed: "ticket-3h-red.png",
    early: "ticket-early.png",
    summer: "ticket-summer.png",
    baby: "ticket-baby.png",
    parent: "ticket-parent.png",
    token10: "ticket-token10.png",
    token25: "ticket-token25.png",
    powerbank: "ticket-powerbank.png"
};
for (var id in ticketData) {
    if (!ticketData[id].image) {
        ticketData[id].image = defaultImages[id];
    }
}

localStorage.setItem("ticketData", JSON.stringify(ticketData));
// ==========================
// V6.3 票券分類與自訂票券相容
// ==========================
var ticketCategoryDefaults = {
    ticket2hGreen: "general",
    ticket2hRed: "general",
    ticket3hGreen: "general",
    ticket3hRed: "general",
    early: "special",
    summer: "special",
    baby: "other",
    parent: "other",
    token10: "other",
    token25: "other",
    powerbank: "other"
};
for (var id in ticketData) {
    if (ticketData[id].category === undefined || ticketData[id].category === null) {
        ticketData[id].category = ticketCategoryDefaults[id] || "other";
    }
    if (ticketData[id].description === undefined || ticketData[id].description === null) {
        ticketData[id].description = "";
    }
    if (ticketData[id].custom === undefined || ticketData[id].custom === null) {
        ticketData[id].custom = id.startsWith("custom_");
    }
    if (ticketData[id].toy === undefined || ticketData[id].toy === null) {
        ticketData[id].toy = "none";
    }
    if (ticketData[id].token === undefined || ticketData[id].token === null) {
        ticketData[id].token = 0;
    }
    if (ticketData[id].reward === undefined || ticketData[id].reward === null) {
        ticketData[id].reward = "";
    }
}
