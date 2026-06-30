// ==========================
// Monster Ticket System V3.8
// Ticket Data
// ==========================

const ticketData = {

    ticket2hGreen:{

        category:"general",

        title:"2H 小怪獸",

        image:"images/ticket-2h-green.png",

        price:250,

        hour:2,

        token:10,

        toy:"綠標玩具",

        reward:"token,band,toy",

        info:
`🪙 贈送代幣：10 枚<br>
🎁 贈送玩具：綠標玩具`,

        enable:true

    },

    ticket2hRed:{

        category:"general",

        title:"2H 小怪獸Plus",

        image:"images/ticket-2h-red.png",

        price:300,

        hour:2,

        token:15,

        toy:"紅標玩具",

        reward:"token,band,toy",

        info:
`🪙 贈送代幣：15 枚<br>
🎁 贈送玩具：紅標玩具`,

        enable:true

    },

    ticket3hGreen:{

        category:"general",

        title:"3H 大怪獸",

        image:"images/ticket-3h-green.png",

        price:300,

        hour:3,

        token:15,

        toy:"綠標玩具",

        reward:"token,band,toy",

        info:
`🪙 贈送代幣：15 枚<br>
🎁 贈送玩具：綠標玩具`,

        enable:true

    },

    ticket3hRed:{

        category:"general",

        title:"3H 大怪獸Plus",

        image:"images/ticket-3h-red.png",

        price:350,

        hour:3,

        token:20,

        toy:"紅標玩具",

        reward:"token,band,toy",

        info:
`🪙 贈送代幣：20 枚<br>
🎁 贈送玩具：紅標玩具`,

        enable:true

    },

    early:{

        category:"event",

        title:"平日早鳥",

        image:"images/ticket-early.png",

        price:300,

        reward:"token,band,toy",

        info:
`🕙 入場14:00~15:30<br>
🎮 暢玩至18:00<br>
🪙 贈送15枚代幣<br>
🎁 紅標玩具`,

        enable:true

    },

    summer:{

        category:"event",

        title:"寒暑假早鳥",

        image:"images/ticket-summer.png",

        price:350,

        reward:"token,band,toy",

        info:
`🕙 入場10:00~11:30<br>
🎮 暢玩至16:00<br>
🪙 贈送20枚代幣<br>
🎁 紅標玩具`,

        enable:true

    },

    baby:{

        category:"other",

        title:"幼幼票",

        image:"images/ticket-baby.png",

        price:100,

        reward:"band",

        info:
`限未滿12個月<br>
免費陪同1位家長<br>
不送玩具、不送代幣`,

        enable:true

    },

    parent:{

        category:"other",

        title:"陪同票",

        image:"images/ticket-parent.png",

        price:80,

        reward:"band",

        info:
`限陪同家長使用<br>
須有兒童同行`,

        enable:true

    },

    token10:{

        category:"other",

        title:"10枚代幣",

        image:"images/ticket-token10.png",

        price:100,

        reward:"token10",

        info:
`兌換10枚遊戲代幣`,

        enable:true

    },

    token25:{

        category:"other",

        title:"25枚代幣",

        image:"images/ticket-token25.png",

        price:200,

        reward:"token25",

        info:
`兌換25枚遊戲代幣`,

        enable:true

    },

    powerbank:{

        category:"single",

        title:"🔋 行動電源租借",

        image:"images/ticket-powerbank.png",

        price:50,

        reward:"powerbank",

        info:
`限館內租借<br>
離場前請歸還<br>
〔需抵押證件〕`,

        enable:true

    }

};
