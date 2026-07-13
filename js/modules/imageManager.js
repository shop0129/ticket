// =========================================
// 小怪獸售票機 V6.3.1
// 票券圖片管理
// =========================================

const TICKET_IMAGE_LIBRARY_KEY =
"ticketImageLibrary";

let ticketImageLibrary =
loadTicketImageLibrary();

// =========================================
// 讀取圖片庫
// =========================================
function loadTicketImageLibrary(){

    try{

        const saved =
        JSON.parse(
            localStorage.getItem(
                TICKET_IMAGE_LIBRARY_KEY
            ) || "[]"
        );

        return Array.isArray(saved)
        ? saved
        : [];

    }catch(error){

        console.error(
            "圖片庫讀取失敗",
            error
        );

        return [];

    }

}

// =========================================
// 儲存圖片庫
// =========================================
function saveTicketImageLibrary(){

    localStorage.setItem(
        TICKET_IMAGE_LIBRARY_KEY,
        JSON.stringify(ticketImageLibrary)
    );

}

// =========================================
// 取得圖片網址
// =========================================
function resolveTicketImageSrc(imageValue){

    if(!imageValue){

        return "images/ticket-2h-green.png";

    }

    if(
        imageValue.startsWith("data:") ||
        imageValue.startsWith("blob:") ||
        imageValue.startsWith("http://") ||
        imageValue.startsWith("https://")
    ){

        return imageValue;

    }

    if(imageValue.startsWith("upload:")){

        const imageId =
        imageValue.substring(7);

        const image =
        ticketImageLibrary.find(
            item =>
            item.id === imageId
        );

        return image
        ? image.data
        : "images/ticket-2h-green.png";

    }

    return "images/" + imageValue;

}

// =========================================
// 圖片名稱
// =========================================
function getTicketImageLabel(imageValue){

    if(!imageValue){

        return "未選擇";

    }

    if(imageValue.startsWith("upload:")){

        const imageId =
        imageValue.substring(7);

        const image =
        ticketImageLibrary.find(
            item =>
            item.id === imageId
        );

        return image
        ? image.name
        : "圖片已不存在";

    }

    return (
        typeof imageNames !== "undefined" &&
        imageNames[imageValue]
    )
    ? imageNames[imageValue]
    : imageValue;

}

// =========================================
// 壓縮上傳圖片
// =========================================
function compressTicketImage(file){

    return new Promise(
        (resolve,reject)=>{

            const reader =
            new FileReader();

            reader.onload = ()=>{

                const image =
                new Image();

                image.onload = ()=>{

                    const maxWidth = 1000;
                    const maxHeight = 1000;

                    let width =
                    image.naturalWidth;

                    let height =
                    image.naturalHeight;

                    const scale =
                    Math.min(
                        1,
                        maxWidth / width,
                        maxHeight / height
                    );

                    width =
                    Math.round(width * scale);

                    height =
                    Math.round(height * scale);

                    const canvas =
                    document.createElement(
                        "canvas"
                    );

                    canvas.width = width;
                    canvas.height = height;

                    const context =
                    canvas.getContext("2d");

                    context.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );

                    const data =
                    canvas.toDataURL(
                        "image/webp",
                        0.88
                    );

                    resolve(data);

                };

                image.onerror = ()=>{

                    reject(
                        new Error(
                            "圖片格式無法讀取"
                        )
                    );

                };

                image.src =
                reader.result;

            };

            reader.onerror = ()=>{

                reject(
                    new Error(
                        "圖片讀取失敗"
                    )
                );

            };

            reader.readAsDataURL(file);

        }
    );

}

// =========================================
// 上傳票券圖片
// =========================================
async function uploadTicketImage(
    ticketId,
    input
){

    playClick();

    const file =
    input.files &&
    input.files[0];

    if(!file) return;

    if(!file.type.startsWith("image/")){

        alert("❌ 請選擇圖片檔案");

        input.value = "";

        return;

    }

    if(file.size > 8 * 1024 * 1024){

        alert(
            "❌ 圖片不可超過 8MB"
        );

        input.value = "";

        return;

    }

    try{

        const data =
        await compressTicketImage(file);

        const imageId =
        "img_" + Date.now();

        ticketImageLibrary.unshift({

            id:imageId,

            name:file.name,

            data:data,

            createdAt:
            new Date().toISOString()

        });

        saveTicketImageLibrary();

        if(ticketData[ticketId]){

            ticketData[ticketId].image =
            "upload:" + imageId;

        }

        localStorage.setItem(
            "ticketData",
            JSON.stringify(ticketData)
        );

        renderTicketManager();

        updateTicketButtons();

        alert(
            "✅ 圖片已上傳並套用"
        );

    }catch(error){

        console.error(error);

        alert(
            "❌ 圖片上傳失敗"
        );

    }finally{

        input.value = "";

    }

}

// =========================================
// 套用圖片庫圖片
// =========================================
function selectUploadedTicketImage(
    ticketId,
    imageId
){

    playClick();

    if(
        !ticketData[ticketId] ||
        !imageId
    ){

        return;

    }

    ticketData[ticketId].image =
    "upload:" + imageId;

    const preview =
    document.getElementById(
        "preview-" + ticketId
    );

    const name =
    document.getElementById(
        "imageName-" + ticketId
    );

    if(preview){

        preview.src =
        resolveTicketImageSrc(
            ticketData[ticketId].image
        );

    }

    if(name){

        name.textContent =
        getTicketImageLabel(
            ticketData[ticketId].image
        );

    }

}

// =========================================
// 刪除圖片庫圖片
// =========================================
function deleteUploadedTicketImage(imageId){

    playClick();

    const image =
    ticketImageLibrary.find(
        item =>
        item.id === imageId
    );

    if(!image) return;

    const inUse =
    Object.values(ticketData)
    .some(ticket=>
        ticket.image ===
        "upload:" + imageId
    );

    if(inUse){

        alert(
            "❌ 此圖片仍有票券使用，請先替換票券圖片"
        );

        return;

    }

    if(
        !confirm(
            `確定刪除圖片「${image.name}」？`
        )
    ){

        return;

    }

    ticketImageLibrary =
    ticketImageLibrary.filter(
        item =>
        item.id !== imageId
    );

    saveTicketImageLibrary();

    renderTicketManager();

}

// =========================================
// 圖片庫選項
// =========================================
function renderUploadedImageOptions(
    selectedValue
){

    if(ticketImageLibrary.length === 0){

        return `
<option value="">
    尚未上傳圖片
</option>
`;

    }

    let html = `

<option value="">
    選擇已上傳圖片
</option>

`;

    ticketImageLibrary.forEach(image=>{

        const value =
        "upload:" + image.id;

        html += `

<option
    value="${image.id}"
    ${selectedValue === value ? "selected" : ""}>
    ${escapeImageManagerText(image.name)}
</option>

`;

    });

    return html;

}

// =========================================
// 圖片庫管理畫面
// =========================================
function renderImageLibraryPanel(){

    if(ticketImageLibrary.length === 0){

        return `

<div class="image-library-empty">

    尚未上傳圖片。可在任一票券卡片按「上傳新圖片」。

</div>

`;

    }

    let html =
    '<div class="image-library-grid">';

    ticketImageLibrary.forEach(image=>{

        html += `

<div class="image-library-item">

    <img
        src="${image.data}"
        alt="${escapeImageManagerText(image.name)}">

    <div class="image-library-name">
        ${escapeImageManagerText(image.name)}
    </div>

    <button
        type="button"
        onclick="deleteUploadedTicketImage('${image.id}')">
        刪除圖片
    </button>

</div>

`;

    });

    html += "</div>";

    return html;

}

function escapeImageManagerText(value){

    return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}
