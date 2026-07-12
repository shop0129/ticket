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

        <label>🏪 店名</label>

        <input
            id="shopName"
            value="${systemData.shopName}">

    </div>

    <div class="tm-field">

        <label>⏱ 自動回首頁（秒）</label>

        <input
            id="homeTimeout"
            type="number"
            value="${systemData.homeTimeout}">

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

    systemData.shopName =
    document.getElementById("shopName").value;

    systemData.homeTimeout =
    Number(document.getElementById("homeTimeout").value);

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

        shopName:"小怪獸放電所",

        homeTimeout:60,

        adminPassword:"1234"

    };

    localStorage.setItem(
        "systemData",
        JSON.stringify(systemData)
    );

    renderSystemSetting();

}
