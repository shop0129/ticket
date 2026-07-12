//==========================
// 開啟營業模式
//==========================

function openBusinessMode(){

    renderBusinessMode();

    showPage("businessModePage");

}

//==========================
// 顯示
//==========================

function renderBusinessMode(){

    const table =
    document.getElementById("businessModeTable");

    table.innerHTML = `

<div class="tm-card">

    <div class="tm-card-title">

        🗓️ 請選擇目前營業模式

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="businessMode"
                value="weekday"
                ${businessMode.mode==="weekday"?"checked":""}>

            平日

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="businessMode"
                value="holiday"
                ${businessMode.mode==="holiday"?"checked":""}>

            假日

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="businessMode"
                value="summer"
                ${businessMode.mode==="summer"?"checked":""}>

            寒暑假

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="checkbox"
                id="autoMode"
                ${businessMode.auto?"checked":""}>

            自動依日期切換（之後開放）

        </label>

    </div>

</div>

`;

}

//==========================
// 儲存
//==========================

function saveBusinessMode(){

    businessMode.mode =
    document.querySelector(
        "input[name='businessMode']:checked"
    ).value;

    businessMode.auto =
    document.getElementById("autoMode").checked;

    localStorage.setItem(

        "businessMode",

        JSON.stringify(businessMode)

    );

    alert("✅ 營業模式已儲存");

}

//==========================
// 恢復預設
//==========================

function resetBusinessMode(){

    businessMode={

        mode:"weekday",

        auto:false

    };

    localStorage.setItem(

        "businessMode",

        JSON.stringify(businessMode)

    );

    renderBusinessMode();

}
