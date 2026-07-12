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

    table.innerHTML = "";

    const modeNames = {

        weekday:"🌤️ 平日",

        holiday:"🎈 假日",

        summer:"🏖️ 寒暑假",

        event:"🎉 特殊活動"

    };

    for(const id in modeNames){

        table.innerHTML += `

<div class="tm-card">

    <div class="tm-card-header">

        <div class="tm-card-title">

            ${modeNames[id]}

        </div>

        <label class="tm-enable">

            <input
                type="radio"
                name="businessMode"
                value="${id}"
                ${businessMode.mode===id?"checked":""}>

            啟用

        </label>

    </div>

</div>

`;

    }

    table.innerHTML += `

<div class="tm-card">

    <label class="tm-enable">

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

    // ⭐ 立即更新首頁票券
    updateTicketButtons();

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
