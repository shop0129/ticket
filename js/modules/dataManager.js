// =========================================
// 小怪獸售票機 V5.8
// 資料管理：備份／還原
// =========================================

const backupFileInput =
document.getElementById("backupFileInput");

const backupStatus =
document.getElementById("backupStatus");

const lastBackupTime =
document.getElementById("lastBackupTime");

// =========================================
// 開啟資料管理
// =========================================
function openDataManager(){

    renderBackupInfo();

    showPage("dataManagerPage");

}

// =========================================
// 顯示最後備份時間
// =========================================
function renderBackupInfo(){

    if(!lastBackupTime) return;

    const value =
    localStorage.getItem("lastBackupTime");

    lastBackupTime.innerHTML =
    value
    ? `最後備份：${value}`
    : "尚未建立備份";

}

// =========================================
// 設定操作訊息
// =========================================
function setBackupStatus(message,type="normal"){

    if(!backupStatus) return;

    backupStatus.className =
    `backup-status ${type}`;

    backupStatus.innerHTML =
    message;

}

// =========================================
// 下載文字檔
// =========================================
function downloadTextFile(filename,content,mimeType){

    const blob =
    new Blob(
        [content],
        {type:mimeType}
    );

    const url =
    URL.createObjectURL(blob);

    const link =
    document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}

// =========================================
// 產生日期檔名
// =========================================
function getBackupFileDate(){

    const now = new Date();

    const year =
    now.getFullYear();

    const month =
    String(now.getMonth()+1)
    .padStart(2,"0");

    const day =
    String(now.getDate())
    .padStart(2,"0");

    const hour =
    String(now.getHours())
    .padStart(2,"0");

    const minute =
    String(now.getMinutes())
    .padStart(2,"0");

    return `${year}-${month}-${day}_${hour}-${minute}`;

}

// =========================================
// 收集完整 localStorage
// =========================================
function collectAllStorageData(){

    const storageData = {};

    for(let i=0;i<localStorage.length;i++){

        const key =
        localStorage.key(i);

        storageData[key] =
        localStorage.getItem(key);

    }

    return storageData;

}

// =========================================
// 匯出完整備份
// =========================================
function exportFullBackup(){

    playClick();

    try{

        const now =
        new Date();

        const backup = {

            app:"小怪獸售票機",

            version:"V5.8",

            exportedAt:
            now.toISOString(),

            storage:
            collectAllStorageData()

        };

        const filename =
        `monster-ticket-backup-${getBackupFileDate()}.json`;

        downloadTextFile(
            filename,
            JSON.stringify(backup,null,2),
            "application/json;charset=utf-8"
        );

        const displayTime =
        now.toLocaleString("zh-TW");

        localStorage.setItem(
            "lastBackupTime",
            displayTime
        );

        renderBackupInfo();

        setBackupStatus(
            "✅ 完整備份已匯出",
            "success"
        );

    }catch(error){

        console.error(error);

        setBackupStatus(
            "❌ 備份失敗，請重新操作",
            "error"
        );

    }

}

// =========================================
// 選擇備份檔
// =========================================
function chooseBackupFile(){

    playClick();

    if(!backupFileInput) return;

    backupFileInput.value = "";

    backupFileInput.click();

}

// =========================================
// 驗證備份格式
// =========================================
function validateBackupData(backup){

    return (
        backup &&
        typeof backup === "object" &&
        backup.storage &&
        typeof backup.storage === "object"
    );

}

// =========================================
// 匯入備份
// =========================================
async function importBackupFile(file){

    if(!file) return;

    try{

        const content =
        await file.text();

        const backup =
        JSON.parse(content);

        if(!validateBackupData(backup)){

            throw new Error(
                "不支援的備份格式"
            );

        }

        const keyCount =
        Object.keys(
            backup.storage
        ).length;

        const confirmed =
        confirm(
            `即將還原 ${keyCount} 筆資料。\n\n目前資料會被備份檔覆蓋，確定繼續？`
        );

        if(!confirmed){

            setBackupStatus(
                "已取消還原",
                "normal"
            );

            return;

        }

        localStorage.clear();

        Object.entries(
            backup.storage
        ).forEach(([key,value])=>{

            localStorage.setItem(
                key,
                value
            );

        });

        setBackupStatus(
            "✅ 資料還原完成，系統即將重新載入",
            "success"
        );

        setTimeout(()=>{

            location.reload();

        },800);

    }catch(error){

        console.error(error);

        setBackupStatus(
            "❌ 還原失敗：請確認檔案是正確的 JSON 備份",
            "error"
        );

    }

}

if(backupFileInput){

    backupFileInput.addEventListener(
        "change",
        event=>{

            const file =
            event.target.files[0];

            importBackupFile(file);

        }
    );

}

// =========================================
// 匯出售票紀錄
// =========================================
function exportSalesHistory(){

    playClick();

    try{

        const exportData = {

            app:"小怪獸售票機",

            version:"V5.8",

            exportedAt:
            new Date().toISOString(),

            salesHistory:
            Array.isArray(salesHistory)
            ? salesHistory
            : []

        };

        const filename =
        `monster-sales-history-${getBackupFileDate()}.json`;

        downloadTextFile(
            filename,
            JSON.stringify(exportData,null,2),
            "application/json;charset=utf-8"
        );

        setBackupStatus(
            `✅ 已匯出 ${exportData.salesHistory.length} 筆售票紀錄`,
            "success"
        );

    }catch(error){

        console.error(error);

        setBackupStatus(
            "❌ 售票紀錄匯出失敗",
            "error"
        );

    }

}

// =========================================
// 清除全部資料
// =========================================
function clearAllAppData(){

    playClick();

    const firstConfirm =
    confirm(
        "⚠️ 確定要清除全部售票機資料？\n\n包含售票紀錄、統計、票券設定、系統設定與管理密碼。"
    );

    if(!firstConfirm) return;

    const secondConfirm =
    confirm(
        "此操作無法復原。\n\n建議先匯出完整備份。\n\n仍要繼續清除嗎？"
    );

    if(!secondConfirm) return;

    localStorage.clear();

    alert(
        "✅ 全部資料已清除，系統將重新載入預設資料。"
    );

    location.reload();

}
