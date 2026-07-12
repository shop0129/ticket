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

        目前營業模式

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="mode"
                value="weekday"
                ${businessMode.mode==="weekday"?"checked":""}>

            平日

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="mode"
                value="holiday"
                ${businessMode.mode==="holiday"?"checked":""}>

            假日

        </label>

    </div>

    <div class="tm-field">

        <label>

            <input
                type="radio"
                name="mode"
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

            自動依日期切換

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
        "input[name=mode]:checked"
    ).value;

    businessMode.auto =
    document.getElementById("autoMode").checked;

    localStorage.setItem(

        "businessMode",

        JSON.stringify(businessMode)

    );

    alert("✅ 已儲存");

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
