//==========================
// 開啟系統設定
//==========================

function openSystemSetting(){

    renderSystemSetting();

    showPage("systemSettingPage");

}

//=========================
// 顯示系統設定
//==========================

//==========================
// 顯示系統設定
//==========================

function renderSystemSetting(){

    const table =
        document.getElementById("systemSettingTable");

    if(!table) return;

    table.innerHTML = `

<!-- ==========================
系統
========================== -->

<div class="system-card">

    <div class="system-card-title">
        ⏱️ 系統
    </div>

    <div class="system-setting-row">

        <div class="system-setting-label">
            自動回首頁
        </div>

        <div class="settingStepper">

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('homeTimeout',-10)">
                −
            </button>

            <span id="homeTimeoutText">
                ${systemData.homeTimeout} 秒
            </span>

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('homeTimeout',10)">
                ＋
            </button>

        </div>

    </div>

    <div class="system-setting-row">

        <div class="system-setting-label">
            列印完成倒數
        </div>

        <div class="settingStepper">

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('printDelay',-1)">
                −
            </button>

            <span id="printDelayText">
                ${systemData.printDelay} 秒
            </span>

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('printDelay',1)">
                ＋
            </button>

        </div>

    </div>

</div>

<!-- ==========================
列印
========================== -->

<div class="system-card">

    <div class="system-card-title">
        🖨️ 列印
    </div>

    <div class="system-setting-row">

        <div class="system-setting-label">
            收據列印份數
        </div>

        <div class="settingStepper">

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('receiptCopies',-1)">
                −
            </button>

            <span id="receiptCopiesText">
                ${systemData.receiptCopies} 份
            </span>

            <button
                type="button"
                class="stepBtn"
                onclick="changeSetting('receiptCopies',1)">
                ＋
            </button>

        </div>

    </div>

</div>

<!-- ==========================
付款方式
========================== -->

<div class="system-card">

    <div class="system-card-title">
        💳 付款方式
    </div>

    <label class="payment-setting-row">

        <input
            type="checkbox"
            id="cashEnable"
            ${systemData.payment.cash ? "checked" : ""}>

        <span class="payment-setting-name">
            現金付款
        </span>

        <span class="payment-setting-status status-ready">
            🟢 正常
        </span>

    </label>

    <label class="payment-setting-row">

        <input
            type="checkbox"
            id="lineEnable"
            ${systemData.payment.linepay ? "checked" : ""}>

        <span class="payment-setting-name">
            LINE Pay
        </span>

        <span class="payment-setting-status status-pending">
            ⚪ 未串接
        </span>

    </label>

    <label class="payment-setting-row">

        <input
            type="checkbox"
            id="easyEnable"
            ${systemData.payment.easycard ? "checked" : ""}>

        <span class="payment-setting-name">
            悠遊卡
        </span>

        <span class="payment-setting-status status-pending">
            ⚪ 未安裝
        </span>

    </label>

    <label class="payment-setting-row">

        <input
            type="checkbox"
            id="creditEnable"
            ${systemData.payment.credit ? "checked" : ""}>

        <span class="payment-setting-name">
            信用卡
        </span>

        <span class="payment-setting-status status-pending">
            ⚪ 未安裝
        </span>

    </label>

</div>

<!-- ==========================
管理
========================== -->

<div class="system-card">

    <div class="system-card-title">
        🔐 管理
    </div>

    <div class="password-setting-box">

        <label for="adminSettingPassword">
            管理密碼
        </label>

        <input
            id="adminSettingPassword"
            type="password"
            autocomplete="new-password"
            value="${systemData.adminPassword}">

    </div>

</div>

`;

}

//==========================
// 儲存
//==========================

function saveSystemSetting(){

    //==========================
// 付款方式
//==========================

systemData.payment.cash =
document.getElementById("cashEnable").checked;

systemData.payment.linepay =
document.getElementById("lineEnable").checked;

systemData.payment.easycard =
document.getElementById("easyEnable").checked;

systemData.payment.credit =
document.getElementById("creditEnable").checked;
    // 只有管理密碼還需要從 input 讀取
    systemData.adminPassword =
document.getElementById("adminSettingPassword").value;

    // 儲存全部設定
    localStorage.setItem(
        "systemData",
        JSON.stringify(systemData)
    );

    applyPaymentSetting();

alert("✅ 系統設定已儲存");

}

//==========================
// 恢復預設
//==========================

function resetSystemSetting(){

    if(!confirm("確定恢復預設？")) return;

    systemData = {

    homeTimeout:60,
    paymentDelay:8,
    printDelay:5,

    receiptCopies:1,

    autoPrint:true,
    showPrintAnimation:true,

    autoHome:true,
    saveHistory:true,
    successAnimation:true,
    playSound:true,

    payment:{
        cash:true,
        linepay:true,
        easycard:false,
        credit:false
    },

    adminPassword:"1234"

};

    localStorage.setItem(
        "systemData",
        JSON.stringify(systemData)
    );

    renderSystemSetting();

}
function changeSetting(key, step){

    systemData[key] += step;

    if(key=="homeTimeout"){

        if(systemData[key] < 10){

            systemData[key] = 10;

        }

    }

    if(key=="printDelay"){

        if(systemData[key] < 1){

            systemData[key] = 1;

        }

    }

    if(key=="receiptCopies"){

        if(systemData[key] < 1){

            systemData[key] = 1;

        }

        if(systemData[key] > 5){

            systemData[key] = 5;

        }

    }

    renderSystemSetting();

}
//==========================
// 套用付款方式
//==========================

function applyPaymentSetting(){

    // Detail Page
    const cashBtn =
    document.getElementById("cashBtn");

    const lineBtn =
    document.getElementById("linePayBtn");

    // Cart
    const cartCash =
    document.getElementById("cartCashBtn");

    const cartLine =
    document.getElementById("cartLineBtn");

    if(cashBtn){

        cashBtn.disabled =
            !systemData.payment.cash;

    }

    if(lineBtn){

        lineBtn.disabled =
            !systemData.payment.linepay;

    }

    if(cartCash){

        cartCash.disabled =
            !systemData.payment.cash;

    }

    if(cartLine){

        cartLine.disabled =
            !systemData.payment.linepay;

    }

}
