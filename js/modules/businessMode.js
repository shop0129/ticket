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

        🗓️ 目前營業模式

    </div>

    <div class="modeGrid">

        <label class="modeCard">

            <input
                type="radio"
                name="businessMode"
                value="weekday"
                ${businessMode.mode==="weekday"?"checked":""}>

            <div class="modeIcon">🌤️</div>

            <div class="modeTitle">

                平日

            </div>

            <div class="modeDesc">

                一般營運模式

            </div>

        </label>

        <label class="modeCard">

            <input
                type="radio"
                name="businessMode"
                value="holiday"
                ${businessMode.mode==="holiday"?"checked":""}>

            <div class="modeIcon">🎈</div>

            <div class="modeTitle">

                假日

            </div>

            <div class="modeDesc">

                六日、連假

            </div>

        </label>

        <label class="modeCard">

            <input
                type="radio"
                name="businessMode"
                value="summer"
                ${businessMode.mode==="summer"?"checked":""}>

            <div class="modeIcon">🏖️</div>

            <div class="modeTitle">

                寒暑假

            </div>

            <div class="modeDesc">

                寒假、暑假

            </div>

        </label>

    </div>

    <label class="autoMode">

        <input
            type="checkbox"
            id="autoMode"
            ${businessMode.auto?"checked":""}>

        自動依日期切換（之後開放）

    </label>

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
