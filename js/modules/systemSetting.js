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

<div class="tm-card">

    <div class="tm-field">

        <label>⏱ 自動回首頁（秒）</label>

        <input
            id="homeTimeout"
            type="number"
            value="${systemData.homeTimeout}">

    </div>

    <div class="tm-field">

        <label>💳 付款完成停留（秒）</label>

        <input
            id="paymentDelay"
            type="number"
            value="${systemData.paymentDelay}">

    </div>

    <div class="tm-field">

        <label>🖨️ 列印完成停留（秒）</label>

        <input
            id="printDelay"
            type="number"
            value="${systemData.printDelay}">

    </div>

    <div class="tm-field">

        <label>🧾 收據列印份數</label>

        <input
            id="receiptCopies"
            type="number"
            min="1"
            max="5"
            value="${systemData.receiptCopies}">

    </div>

    <div class="tm-field">

        <label>🔐 管理密碼</label>

        <input
            id="adminPassword"
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

    systemData.homeTimeout =
    Number(document.getElementById("homeTimeout").value);

    systemData.paymentDelay =
    Number(document.getElementById("paymentDelay").value);

    systemData.printDelay =
    Number(document.getElementById("printDelay").value);

    systemData.receiptCopies =
    Number(document.getElementById("receiptCopies").value);

    systemData.adminPassword =
    document.getElementById("adminPassword").value;

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
