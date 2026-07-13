//==========================
// 開啟系統設定
//==========================

function openSystemSetting(){

    renderSystemSetting();

    showPage("systemSettingPage");

}

//==========================
// 顯示系統設定
//==========================

function renderSystemSetting(){

    const table =
    document.getElementById("systemSettingTable");

  table.innerHTML = `

<!-- ==========================
系統
========================== -->

<div class="tm-card">

    <div class="tm-card-title">

        ⏱️ 系統

    </div>

    <div class="tm-field">

        <label>自動回首頁</label>

        <div class="settingStepper">

            <button
                class="stepBtn"
                onclick="changeSetting('homeTimeout',-10)">

                －

            </button>

            <span id="homeTimeoutText">

                ${systemData.homeTimeout} 秒

            </span>

            <button
                class="stepBtn"
                onclick="changeSetting('homeTimeout',10)">

                ＋

            </button>

        </div>

    </div>

    <div class="tm-field">

        <label>列印完成倒數</label>

        <div class="settingStepper">

            <button
                class="stepBtn"
                onclick="changeSetting('printDelay',-1)">

                －

            </button>

            <span id="printDelayText">

                ${systemData.printDelay} 秒

            </span>

            <button
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

<div class="tm-card">

    <div class="tm-card-title">

        🖨️ 列印

    </div>

    <div class="tm-field">

        <label>收據列印份數</label>

        <div class="settingStepper">

            <button
                class="stepBtn"
                onclick="changeSetting('receiptCopies',-1)">

                －

            </button>

            <span id="receiptCopiesText">

                ${systemData.receiptCopies} 份

            </span>

            <button
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

<div class="tm-card">

    <div class="tm-card-title">

        💳 付款方式

    </div>

    <div class="tm-field">

        <label>

            <input
                type="checkbox"
                id="cashEnable"
                ${systemData.payment.cash ? "checked" : ""}>

            現金付款

            🟢 正常

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="checkbox"
                id="lineEnable"
                ${systemData.payment.linepay ? "checked" : ""}>

            LINE Pay

            ⚪ 未串接

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="checkbox"
                id="easyEnable"
                ${systemData.payment.easycard ? "checked" : ""}>

            悠遊卡

            ⚪ 未安裝

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="checkbox"
                id="creditEnable"
                ${systemData.payment.credit ? "checked" : ""}>

            信用卡

            ⚪ 未安裝

        </label>

    </div>

</div>
<!-- ==========================
管理
========================== -->

<div class="tm-card">

    <div class="tm-card-title">

        🔐 管理

    </div>

    <div class="tm-field">

        <label>管理密碼</label>

        <input
            id="adminSettingPassword"
            type="password"
            value="${systemData.adminPassword}">

    </div>

</div>

`;

}

//==========================
// 儲存
//==========================

function saveSystemSetting(){

    // 只有管理密碼還需要從 input 讀取
    systemData.adminPassword =
document.getElementById("adminSettingPassword").value;

    // 儲存全部設定
    localStorage.setItem(
        "systemData",
        JSON.stringify(systemData)
    );

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
