// =========================================
// 小怪獸售票機 V7.8.3.3 FIX61
// 首頁主題圖庫：手機與售票機雲端同步、一鍵套用
// =========================================
(function(){
    "use strict";

    var ROOT = "monsterTicket/v1/system/homeThemes";
    var LOCAL_ACTIVE_KEY = "monsterHomeThemeActive";
    var DEFAULT_ID = "default";
    var DEFAULT_SRC = "images/home-bg.webp";
    var MAX_THEMES = 8;
    var database = null;
    var themeRef = null;
    var activeId = DEFAULT_ID;
    var items = {};
    var started = false;
    var modalReady = false;

    function byId(id){ return document.getElementById(id); }
    function escapeText(value){
        return String(value || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
    }
    function safeKey(value){
        return String(value || "")
        .replace(/[.#$\[\]\/]/g,"_");
    }
    function currentActor(){
        if(window.MonsterAuth && MonsterAuth.getActor){
            return MonsterAuth.getActor("home-theme");
        }
        return {name:"店長",id:"manager"};
    }
    function homeImage(){
        return byId("homeThemeImage") ||
        document.querySelector("#homePage .home-bg");
    }
    function saveLocalActive(theme){
        try{
            localStorage.setItem(
                LOCAL_ACTIVE_KEY,
                JSON.stringify(theme || {id:DEFAULT_ID,src:DEFAULT_SRC})
            );
        }catch(error){}
    }
    function applyTheme(theme){
        var image = homeImage();
        var usable = theme && theme.id !== DEFAULT_ID && theme.imageData;
        var src = usable ? theme.imageData : DEFAULT_SRC;
        activeId = usable ? theme.id : DEFAULT_ID;

        if(image){
            image.src = src;
            image.setAttribute("data-home-theme-id",activeId);
            image.onerror = function(){
                image.onerror = null;
                image.src = DEFAULT_SRC;
            };
        }

        saveLocalActive({
            id:activeId,
            title:usable ? theme.title : "預設首頁",
            imageData:usable ? theme.imageData : "",
            src:src
        });
        updateCurrentLabel();
    }
    function loadLocalActive(){
        try{
            var saved = JSON.parse(localStorage.getItem(LOCAL_ACTIVE_KEY) || "null");
            if(saved){
                applyTheme(saved.id === DEFAULT_ID ? null : saved);
            }
        }catch(error){}
    }
    function updateCurrentLabel(){
        var label = byId("homeThemeCurrent");
        if(!label){ return; }
        var title = activeId === DEFAULT_ID
        ? "預設首頁"
        : ((items[activeId] && items[activeId].title) || "自訂首頁");
        label.textContent = "目前使用：" + title;
    }
    function loadActiveTheme(id){
        id = id || DEFAULT_ID;
        activeId = id;
        if(id === DEFAULT_ID || !themeRef){
            applyTheme(null);
            renderThemeList();
            return;
        }
        themeRef.child("items/" + safeKey(id))
        .once("value")
        .then(function(snapshot){
            var theme = snapshot.val();
            if(theme && theme.imageData){
                theme.id = theme.id || id;
                items[id] = theme;
                applyTheme(theme);
            }else{
                applyTheme(null);
            }
            renderThemeList();
        })
        .catch(function(){
            loadLocalActive();
        });
    }
    function getDatabase(){
        if(window.MonsterCloud && window.MonsterCloud.database){
            return window.MonsterCloud.database;
        }
        if(
            window.firebase && firebase.apps && firebase.apps.length &&
            firebase.auth && firebase.auth().currentUser
        ){
            return firebase.database();
        }
        return null;
    }
    function startSync(){
        if(started){ return; }
        database = getDatabase();
        if(!database){ return; }
        started = true;
        themeRef = database.ref(ROOT);
        themeRef.child("activeId").on("value",function(snapshot){
            loadActiveTheme(snapshot.val() || DEFAULT_ID);
        },function(error){
            console.error("[MonsterHomeTheme] active read error:",error);
        });
    }
    function waitForCloud(attempt){
        startSync();
        if(started || Number(attempt || 0) >= 80){ return; }
        setTimeout(function(){ waitForCloud(Number(attempt || 0) + 1); },250);
    }
    function ensureModal(){
        if(modalReady || byId("homeThemeModal")){ return; }
        modalReady = true;
        var modal = document.createElement("div");
        modal.id = "homeThemeModal";
        modal.className = "home-theme-modal";
        modal.style.display = "none";
        modal.innerHTML =
        '<div class="home-theme-shell">' +
          '<div class="home-theme-head"><div><h2>🎨 首頁主題管理</h2><p id="homeThemeCurrent">目前使用：預設首頁</p></div><button type="button" id="homeThemeClose">✕ 關閉</button></div>' +
          '<div class="home-theme-upload">' +
            '<label>主題名稱<input id="homeThemeTitle" maxlength="30" placeholder="例如：萬聖節首頁"></label>' +
            '<label>選擇圖片<input id="homeThemeFile" type="file" accept="image/*"></label>' +
            '<button type="button" id="homeThemeUpload">📤 上傳並立即套用</button>' +
            '<button type="button" id="homeThemeDefault">↩ 套用預設首頁</button>' +
          '</div>' +
          '<div class="home-theme-note">建議使用直式圖片；系統會自動縮圖後上傳，最多保留 ' + MAX_THEMES + ' 張。</div>' +
          '<div id="homeThemeStatus" class="home-theme-status"></div>' +
          '<div id="homeThemeList" class="home-theme-list"><div class="home-theme-loading">正在載入主題…</div></div>' +
        '</div>';
        document.body.appendChild(modal);

        byId("homeThemeClose").onclick = closeManager;
        byId("homeThemeDefault").onclick = function(){ setActive(DEFAULT_ID); };
        byId("homeThemeUpload").onclick = uploadTheme;
        byId("homeThemeList").onclick = handleListAction;
        modal.onclick = function(event){ if(event.target === modal){ closeManager(); } };
    }
    function setStatus(text,isError){
        var status = byId("homeThemeStatus");
        if(!status){ return; }
        status.textContent = text || "";
        status.className = "home-theme-status" + (isError ? " error" : "");
    }
    function openManager(){
        ensureModal();
        if(!started){ waitForCloud(0); }
        var modal = byId("homeThemeModal");
        if(modal){ modal.style.display = "flex"; }
        setStatus("");
        loadThemeList();
    }
    function closeManager(){
        var modal = byId("homeThemeModal");
        if(modal){ modal.style.display = "none"; }
    }
    function loadThemeList(){
        if(!themeRef){
            setStatus("雲端連線中，請稍候…",false);
            setTimeout(loadThemeList,500);
            return;
        }
        themeRef.child("items").once("value")
        .then(function(snapshot){
            items = snapshot.val() || {};
            renderThemeList();
        })
        .catch(function(error){
            setStatus("主題圖載入失敗：" + (error.message || "請檢查網路"),true);
        });
    }
    function renderThemeList(){
        var list = byId("homeThemeList");
        if(!list){ return; }
        var rows = [{id:DEFAULT_ID,title:"預設首頁",imageData:DEFAULT_SRC,builtin:true}];
        Object.keys(items || {}).forEach(function(id){
            var item = items[id];
            if(item && item.imageData){
                item.id = item.id || id;
                rows.push(item);
            }
        });
        rows.sort(function(a,b){
            if(a.builtin){ return -1; }
            if(b.builtin){ return 1; }
            return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
        });
        list.innerHTML = rows.map(function(theme){
            var selected = theme.id === activeId;
            return '<article class="home-theme-card' + (selected ? ' active' : '') + '" data-theme-id="' + escapeText(theme.id) + '">' +
                '<img src="' + escapeText(theme.imageData) + '" alt="">' +
                '<div class="home-theme-card-copy"><strong>' + escapeText(theme.title || "未命名主題") + '</strong><span>' + (selected ? '✅ 目前使用中' : '可一鍵套用') + '</span></div>' +
                '<div class="home-theme-actions"><button type="button" data-theme-action="apply"' + (selected ? ' disabled' : '') + '>立即套用</button>' +
                (theme.builtin ? '' : '<button type="button" class="danger" data-theme-action="delete">刪除</button>') + '</div>' +
            '</article>';
        }).join("");
        updateCurrentLabel();
    }
    function handleListAction(event){
        var button = event.target;
        while(button && button !== byId("homeThemeList") && !button.getAttribute("data-theme-action")){
            button = button.parentNode;
        }
        if(!button || button === byId("homeThemeList")){ return; }
        var card = button;
        while(card && !card.getAttribute("data-theme-id")){ card = card.parentNode; }
        if(!card){ return; }
        var id = card.getAttribute("data-theme-id");
        if(button.getAttribute("data-theme-action") === "delete"){
            deleteTheme(id);
        }else{
            setActive(id);
        }
    }
    function setActive(id){
        if(!themeRef){ setStatus("雲端尚未連線，請稍候再試",true); return; }
        setStatus("正在切換首頁…",false);
        themeRef.child("activeId").set(id || DEFAULT_ID)
        .then(function(){
            activeId = id || DEFAULT_ID;
            setStatus("✅ 首頁已切換，所有售票機會自動同步",false);
            renderThemeList();
        })
        .catch(function(error){
            setStatus("切換失敗：" + (error.message || "請檢查網路"),true);
        });
    }
    function deleteTheme(id){
        if(!id || id === DEFAULT_ID || !items[id]){ return; }
        if(!confirm("確定刪除「" + (items[id].title || "這張主題") + "」？")){ return; }
        var change = activeId === id
        ? themeRef.child("activeId").set(DEFAULT_ID)
        : Promise.resolve();
        change.then(function(){ return themeRef.child("items/" + safeKey(id)).remove(); })
        .then(function(){
            delete items[id];
            setStatus("已刪除主題",false);
            renderThemeList();
        })
        .catch(function(error){
            setStatus("刪除失敗：" + (error.message || "請檢查網路"),true);
        });
    }
    function compressImage(file){
        return new Promise(function(resolve,reject){
            if(!file || !/^image\//i.test(file.type || "")){
                reject(new Error("請選擇圖片檔"));
                return;
            }
            if(Number(file.size || 0) > 12 * 1024 * 1024){
                reject(new Error("圖片請不要超過 12MB"));
                return;
            }
            var reader = new FileReader();
            reader.onerror = function(){ reject(new Error("無法讀取圖片")); };
            reader.onload = function(){
                var image = new Image();
                image.onerror = function(){ reject(new Error("圖片格式無法使用")); };
                image.onload = function(){
                    var maxWidth = 1080;
                    var maxHeight = 1920;
                    var ratio = Math.min(1,maxWidth/image.width,maxHeight/image.height);
                    var width = Math.max(1,Math.round(image.width * ratio));
                    var height = Math.max(1,Math.round(image.height * ratio));
                    var canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    var context = canvas.getContext("2d");
                    context.fillStyle = "#ffffff";
                    context.fillRect(0,0,width,height);
                    context.drawImage(image,0,0,width,height);
                    var data = canvas.toDataURL("image/jpeg",0.82);
                    if(data.length > 1400000){
                        data = canvas.toDataURL("image/jpeg",0.65);
                    }
                    if(data.length > 1800000){
                        reject(new Error("壓縮後圖片仍過大，請換小一點的圖"));
                        return;
                    }
                    resolve(data);
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }
    function uploadTheme(){
        var titleInput = byId("homeThemeTitle");
        var fileInput = byId("homeThemeFile");
        var title = String(titleInput && titleInput.value || "").trim();
        var file = fileInput && fileInput.files && fileInput.files[0];
        if(!title){ setStatus("請輸入主題名稱",true); return; }
        if(!file){ setStatus("請選擇首頁圖片",true); return; }
        if(Object.keys(items || {}).length >= MAX_THEMES){
            setStatus("已達 " + MAX_THEMES + " 張上限，請先刪除不需要的主題",true);
            return;
        }
        if(!themeRef){ setStatus("雲端尚未連線，請稍候再試",true); return; }
        var button = byId("homeThemeUpload");
        button.disabled = true;
        button.textContent = "圖片處理中…";
        setStatus("正在壓縮與上傳圖片…",false);
        compressImage(file)
        .then(function(imageData){
            var id = "theme_" + Date.now();
            var actor = currentActor();
            var theme = {
                id:id,
                title:title,
                imageData:imageData,
                createdAt:Date.now(),
                updatedAt:Date.now(),
                updatedBy:actor.name || actor.id || "manager"
            };
            return themeRef.child("items/" + id).set(theme)
            .then(function(){
                items[id] = theme;
                return themeRef.child("activeId").set(id);
            });
        })
        .then(function(){
            titleInput.value = "";
            fileInput.value = "";
            setStatus("✅ 上傳完成，新首頁已立即套用",false);
            renderThemeList();
        })
        .catch(function(error){
            setStatus(error.message || "上傳失敗，請再試一次",true);
        })
        .then(function(){
            button.disabled = false;
            button.textContent = "📤 上傳並立即套用";
        });
    }

    window.MonsterHomeTheme = {
        open:openManager,
        close:closeManager,
        setActive:setActive,
        getActiveId:function(){ return activeId; }
    };
    window.openHomeThemeManager = openManager;

    function init(){
        ensureModal();
        loadLocalActive();
        waitForCloud(0);
    }
    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded",init);
    }else{
        init();
    }
})();
