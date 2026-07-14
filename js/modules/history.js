// =========================================
// 小怪獸售票機 V5.9
// 硬體測試中心
// =========================================

const hardwareStatus =
document.getElementById("hardwareStatus");

const deviceInfoBox =
document.getElementById("deviceInfoBox");

const hardwareTestTicket =
document.getElementById("hardwareTestTicket");

// =========================================
// 開啟硬體測試中心
// =========================================
function openHardwareTest(){

    renderDeviceInfo();

    resetHardwareTestStatus();

    showPage("hardwareTestPage");

}

// =========================================
// 測試狀態
// =========================================
function setHardwareStatus(message,type="normal"){

    if(!hardwareStatus) return;

    hardwareStatus.className =
    `hardware-status ${type}`;

    hardwareStatus.innerHTML =
    message;

}

function resetHardwareTestStatus(){

    setHardwareStatus(
        "請選擇要執行的測試項目",
        "normal"
    );

}

// =========================================
// 裝置資訊
// =========================================
function renderDeviceInfo(){

    if(!deviceInfoBox) return;

    const info = {

        platform:
        navigator.platform || "未知",

        language:
        navigator.language || "未知",

        online:
        navigator.onLine
        ? "已連線"
        : "離線",

        screen:
        `${window.screen.width} × ${window.screen.height}`,

        viewport:
        `${window.innerWidth} × ${window.innerHeight}`,

        userAgent:
        navigator.userAgent || "未知"

    };

    deviceInfoBox.innerHTML = `

<div class="device-info-row">
    <span>作業平台</span>
    <strong>${info.platform}</strong>
</div>

<div class="device-info-row">
    <span>語言</span>
    <strong>${info.language}</strong>
</div>

<div class="device-info-row">
    <span>網路狀態</span>
    <strong>${info.online}</strong>
</div>

<div class="device-info-row">
    <span>螢幕解析度</span>
    <strong>${info.screen}</strong>
</div>

<div class="device-info-row">
    <span>瀏覽器視窗</span>
    <strong>${info.viewport}</strong>
</div>

<div class="device-info-row device-info-agent">
    <span>User Agent</span>
    <strong>${info.userAgent}</strong>
</div>

`;

}

// =========================================
// 音效測試
// =========================================
function testClickSound(){

    playClick();

    setHardwareStatus(
        "✅ 點擊音效播放完成",
        "success"
    );

}

function testSuccessSound(){

    playSuccess();

    setHardwareStatus(
        "✅ 付款成功音效播放完成",
        "success"
    );

}

// =========================================
// 顯示測試票券
// =========================================
function showHardwareTestTicket(){

    if(!hardwareTestTicket) return;

    hardwareTestTicket.innerHTML = `

<div class="hardware-ticket-paper">

    <div class="hardware-ticket-title">
        小怪獸放電所
    </div>

    <div class="hardware-ticket-subtitle">
        硬體測試票券
    </div>

    <div class="hardware-ticket-line"></div>

    <div class="hardware-ticket-row">
        <span>票券類型</span>
        <strong>測試票券</strong>
    </div>

    <div class="hardware-ticket-row">
        <span>付款方式</span>
        <strong>測試模式</strong>
    </div>

    <div class="hardware-ticket-row">
        <span>金額</span>
        <strong>NT$0</strong>
    </div>

    <div class="hardware-ticket-row">
        <span>狀態</span>
        <strong>不記錄訂單</strong>
    </div>

    <div class="hardware-ticket-line"></div>

    <div class="hardware-ticket-footer">
        此票券僅供硬體測試使用
    </div>

</div>

`;

}

// =========================================
// 瀏覽器列印測試
// =========================================
function testBrowserPrint(){

    playClick();

    showHardwareTestTicket();

    setHardwareStatus(
        "🖨️ 已開啟瀏覽器列印視窗",
        "success"
    );

    setTimeout(()=>{

        window.print();

    },150);

}

// =========================================
// 列印動畫測試
// 不建立訂單、不更新統計
// =========================================
function testPrintAnimation(){

    playClick();

    const previousOrder =
    currentPrintOrder;

    const previousReprint =
    isReprint;

    currentPrintOrder = {

        orderNo:"TEST-" + Date.now(),

        date:
        new Date().toLocaleDateString("zh-TW"),

        time:
        new Date().toLocaleTimeString("zh-TW",{

            hour:"2-digit",

            minute:"2-digit"

        }),

        payment:"測試模式",

        amount:0,

        items:[{

            id:"hardwareTest",

            title:"硬體測試票券",

            price:0,

            token:0,

            toy:"none",

            reward:""

        }],

        status:"normal"

    };

    isReprint = true;

    showPage("successPage");

    countdownNumber.innerHTML = "";

    updateSuccessItems();

    startPrintAnimation();

    setTimeout(()=>{

        currentPrintOrder =
        previousOrder;

        isReprint =
        previousReprint;

    },100);

}

// =========================================
// 全螢幕測試
// =========================================
async function testFullscreen(){

    playClick();

    try{

        if(!document.fullscreenElement){

            await document.documentElement.requestFullscreen();

            setHardwareStatus(
                "✅ 已進入全螢幕模式",
                "success"
            );

        }else{

            await document.exitFullscreen();

            setHardwareStatus(
                "✅ 已離開全螢幕模式",
                "success"
            );

        }

    }catch(error){

        console.error(error);

        setHardwareStatus(
            "❌ 此裝置或瀏覽器不支援全螢幕切換",
            "error"
        );

    }

}

// =========================================
// 重新整理測試
// =========================================
function testReload(){

    playClick();

    const confirmed =
    confirm(
        "確定要重新整理售票機頁面？"
    );

    if(!confirmed) return;

    location.reload();

}
