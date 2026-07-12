// =========================
// 票價設定
// =========================

let ticketData =
JSON.parse(localStorage.getItem("ticketData")) || {

    ticket2hGreen:{
    title:"2H 小怪獸",
    price:250,
    hour:2,
    token:10,
    toy:"green",
    reward:"token,band,toy",
    enable:true

       },

ticket2hRed:{
    title:"2H 小怪獸 Plus",
    price:300,
    hour:2,
    token:15,
    toy:"red",
    reward:"token,band,toy",
    enable:true
},

    ticket3hGreen:{
        title:"3H 大怪獸",
        price:300,
        hour:3,
        token:15,
        toy:"green",
        reward:"token,band,toy",
enable:true
   
    },

    ticket3hRed:{
        title:"3H 大怪獸 Plus",
        price:350,
        hour:3,
        token:20,
        toy:"red",
        reward:"token,band,toy",
enable:true
   
    },

   early:{
    title:"平日早鳥",
    price:300,
    token:15,
    toy:"red",
    reward:"token,band,toy",
enable:true
   
},

    summer:{
    title:"寒暑假限定",
    price:350,
    token:20,
    toy:"red",
    reward:"token,band,toy",
enable:true
},

    baby:{
    title:"幼幼票",
    price:100,
    reward:"band",
        enable:true
},

    parent:{
    title:"陪同票",
    price:80,
    reward:"band",
        enable:true
},

    token10:{
    title:"10枚代幣",
    price:100,
    reward:"token10",
        enable:true
},

    token25:{
    title:"25枚代幣",
    price:200,
    reward:"token25",
        enable:true
},

    powerbank:{
    title:"行動電源",
    price:50,
    reward:"powerbank",
        enable:true
},

};
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
console.log(JSON.stringify(ticketData, null, 2));
localStorage.setItem(
    "ticketData",
    JSON.stringify(ticketData)
);
