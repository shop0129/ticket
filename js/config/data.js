let ticketData =
JSON.parse(localStorage.getItem("ticketData")) || {

    ticket2hGreen:{
    title:"2H 小怪獸",
    price:250,
    hour:2,
    token:10,
    toy:"green",
    reward:"token,band,toy",
    enable:true,
image:"ticket-2h-green.png"
       },

ticket2hRed:{
    title:"2H 小怪獸 Plus",
    price:300,
    hour:2,
    token:15,
    toy:"red",
    reward:"token,band,toy",
    enable:true,
    image:"ticket-2h-red.png"
},

    ticket3hGreen:{
        title:"3H 大怪獸",
        price:300,
        hour:3,
        token:15,
        toy:"green",
        reward:"token,band,toy",
enable:true,
   image:"ticket-3h-green.png"
    },

    ticket3hRed:{
        title:"3H 大怪獸 Plus",
        price:350,
        hour:3,
        token:20,
        toy:"red",
        reward:"token,band,toy",
enable:true,
   image:"ticket-3h-red.png"
    },

   early:{
    title:"平日早鳥",
    price:300,
    token:15,
    toy:"red",
    reward:"token,band,toy",
enable:true,
   image:"ticket-early.png"
},

    summer:{
    title:"寒暑假限定",
    price:350,
    token:20,
    toy:"red",
    reward:"token,band,toy",
enable:true,
        image:"ticket-summer.png"
},

    baby:{
    title:"幼幼票",
    price:100,
    reward:"band",
        enable:true,
        image:"ticket-baby.png"
},

    parent:{
    title:"陪同票",
    price:80,
    reward:"band",
        enable:true,
        image:"ticket-parent.png"
},

    token10:{
    title:"10枚代幣",
    price:100,
    reward:"token10",
        enable:true,
        image:"ticket-token10.png"
},

    token25:{
    title:"25枚代幣",
    price:200,
    reward:"token25",
        enable:true,
        image:"ticket-token25.png"
},

    powerbank:{
    title:"行動電源",
    price:50,
    reward:"powerbank",
        enable:true,
        image:"ticket-powerbank.png"
},

};
//==========================
// 營業模式
//==========================

let businessMode =
JSON.parse(localStorage.getItem("businessMode")) || {

    mode:"weekday",

    auto:false

};
//==========================
// 系統設定
//==========================

let systemData =
JSON.parse(localStorage.getItem("systemData")) || {

    // 自動回首頁秒數
    homeTimeout:60,

    // 付款完成停留
    paymentDelay:8,

    // 列印完成停留
    printDelay:5,

    // 收據列印份數
    receiptCopies:1,

    // 管理密碼
    adminPassword:"1234"

};

localStorage.setItem(
    "systemData",
    JSON.stringify(systemData)
);
//==========================
// 票券名稱
//==========================

const ticketNames = {

    ticket2hGreen:"🟢 2H 小怪獸",
    ticket2hRed:"🔴 2H 小怪獸 Plus",
    ticket3hGreen:"🟢 3H 大怪獸",
    ticket3hRed:"🔴 3H 大怪獸 Plus",

    early:"🌞 平日早鳥",
    summer:"🏖 寒暑假限定",

    baby:"👶 幼幼票",
    parent:"👨 陪同票",

    token10:"🪙 10枚代幣",
    token25:"🪙 25枚代幣",

    powerbank:"🔋 行動電源"

};

//==========================
// 圖片名稱
//==========================

const imageNames = {

    "ticket-2h-green.png":"🟢 2H 綠色票卡",
    "ticket-2h-red.png":"🔴 2H 紅色票卡",

    "ticket-3h-green.png":"🟢 3H 綠色票卡",
    "ticket-3h-red.png":"🔴 3H 紅色票卡",

    "ticket-early.png":"🌞 平日早鳥",
    "ticket-summer.png":"🏖 寒暑假限定",

    "ticket-baby.png":"👶 幼幼票",
    "ticket-parent.png":"👨 陪同票",

    "ticket-token10.png":"🪙 10枚代幣",
    "ticket-token25.png":"🪙 25枚代幣",

    "ticket-powerbank.png":"🔋 行動電源"

};

//==========================
// 可選圖片
//==========================

const imageList = [

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

for(const id in ticketData){

    if(ticketData[id].enable === undefined){

        ticketData[id].enable = true;

    }

}
// ===== 補上 image 預設值 =====

const defaultImages = {

    ticket2hGreen:"ticket-2h-green.png",
    ticket2hRed:"ticket-2h-red.png",
    ticket3hGreen:"ticket-3h-green.png",
    ticket3hRed:"ticket-3h-red.png",
    early:"ticket-early.png",
    summer:"ticket-summer.png",
    baby:"ticket-baby.png",
    parent:"ticket-parent.png",
    token10:"ticket-token10.png",
    token25:"ticket-token25.png",
    powerbank:"ticket-powerbank.png"

};

for(const id in ticketData){

    if(!ticketData[id].image){

        ticketData[id].image = defaultImages[id];

    }

}
console.log(JSON.stringify(ticketData, null, 2));
localStorage.setItem(
    "ticketData",
    JSON.stringify(ticketData)
);
