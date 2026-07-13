//==========================
// 開啟營業模式
//==========================

function openBusinessMode(){

    renderBusinessMode();

    showPage("businessModePage");

}

//==========================
// 顯示營業模式
//==========================

function renderBusinessMode(){

    const table =
        document.getElementById("businessModeTable");

    if(!table) return;

    const modes = {

        weekday:{
            title:"🌤️ 平日",
            description:"星期一至星期五使用",
            note:"寒暑假限定票不顯示"
        },

        holiday:{
            title:"🎈 假日",
            description:"星期六、星期日及國定假日使用",
            note:"早鳥票與寒暑假限定票不顯示"
        },

        summer:{
            title:"🏖️ 寒暑假",
            description:"寒假、暑假期間使用",
            note:"平日早鳥票不顯示"
        },

        event:{
            title:"🎉 特殊活動",
            description:"包場、節慶或活動期間使用",
            note:"票券顯示依活動設定"
        }

    };

    let html = "";

    for(const id in modes){

        const mode = modes[id];

        const active =
            businessMode.mode === id;

        html += `

<label class="business-mode-card ${active ? "active" : ""}">

    <input
        type="radio"
        name="businessMode"
        value="${id}"
        ${active ? "checked" : ""}
        onchange="previewBusinessMode('${id}')">

    <div class="business-mode-content">

        <div class="business-mode-top">

            <div class="business-mode-title">
                ${mode.title}
            </div>

            <div class="business-mode-status">
                ${active ? "🟢 啟用中" : "⚪ 未啟用"}
            </div>

        </div>

        <div class="business-mode-description">
            ${mode.description}
        </div>

        <div class="business-mode-note">
            ${mode.note}
        </div>

    </div>

</label>

`;

    }

    html += `

<div class="business-auto-card">

    <div class="business-auto-main">

        <div>

            <div class="business-auto-title">
                📅 自動依日期切換
            </div>

            <div class="business-auto-description">
                系統依日期自動切換營業模式
            </div>

        </div>

        <label class="business-auto-switch">

            <input
                type="checkbox"
                id="autoMode"
                ${businessMode.auto ? "checked" : ""}>

            <span>
                ${businessMode.auto ? "已勾選" : "未勾選"}
            </span>

        </label>

    </div>

    <div class="business-development-status">
        ⚪ 功能開發中，勾選狀態可儲存，但目前不會自動切換
    </div>

</div>

`;

    table.innerHTML = html;

}

//==========================
// 預覽選擇狀態
//==========================

function previewBusinessMode(id){

    document
    .querySelectorAll(".business-mode-card")
    .forEach(card=>{

        const input =
            card.querySelector(
                "input[name='businessMode']"
            );

        const status =
            card.querySelector(
                ".business-mode-status"
            );

        const active =
            input && input.value === id;

        card.classList.toggle(
            "active",
            active
        );

        if(status){

            status.innerHTML =
                active
                ? "🟢 啟用中"
                : "⚪ 未啟用";

        }

    });

}

//==========================
// 儲存
//==========================

function saveBusinessMode(){

    const selected =
        document.querySelector(
            "input[name='businessMode']:checked"
        );

    const autoMode =
        document.getElementById("autoMode");

    if(!selected){

        alert("❌ 請選擇營業模式");

        return;

    }

    businessMode.mode =
        selected.value;

    businessMode.auto =
        autoMode
        ? autoMode.checked
        : false;

    localStorage.setItem(
        "businessMode",
        JSON.stringify(businessMode)
    );

    // 立即更新首頁票券
    updateTicketButtons();

    renderBusinessMode();

    alert("✅ 營業模式已儲存");

}

//==========================
// 恢復預設
//==========================

function resetBusinessMode(){

    if(!confirm("確定恢復預設營業模式？")){

        return;

    }

    businessMode = {

        mode:"weekday",

        auto:false

    };

    localStorage.setItem(
        "businessMode",
        JSON.stringify(businessMode)
    );

    updateTicketButtons();

    renderBusinessMode();

}
