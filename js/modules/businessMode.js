// =========================================
// 小怪獸售票機 V7.8 Business Mode Engine
// 日期規則、特殊日期、公休日、寒暑假與跨裝置同步
// =========================================
(function(){
    "use strict";

    var STORAGE_KEY = "businessMode";
    var CLOUD_PATH = "monsterTicket/v1/system/businessMode";
    var midnightTimer = null;
    var cloudRef = null;
    var applyingCloud = false;

    var MODE_META = {
        weekday:{title:"🌤️ 平日", note:"一般平日營業"},
        holiday:{title:"🎈 假日", note:"星期六、星期日或指定假日"},
        summer:{title:"🏖️ 寒暑假", note:"寒假或暑假期間"},
        event:{title:"🎉 特殊活動", note:"活動、包場或節慶模式"},
        closed:{title:"🔴 公休", note:"停止販售入場票券"}
    };

    function pad(value){ return String(value).padStart ? String(value).padStart(2,"0") : (Number(value)<10?"0":"")+value; }
    function dateKey(date){ return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate()); }
    function monthDayKey(date){ return pad(date.getMonth()+1)+"-"+pad(date.getDate()); }
    function clone(value){ return JSON.parse(JSON.stringify(value)); }

    function defaultConfig(){
        return {
            version:780,
            auto:true,
            mode:"weekday",
            resolvedMode:"weekday",
            resolvedReason:"尚未判斷",
            resolvedDate:"",
            weekdayMode:"weekday",
            weekendMode:"holiday",
            closedWeekdays:[1],
            seasons:[
                {id:"winter",name:"寒假",enabled:true,start:"01-20",end:"02-15",mode:"summer"},
                {id:"summer",name:"暑假",enabled:true,start:"07-01",end:"08-31",mode:"summer"}
            ],
            specialDates:[],
            openingHours:{
                weekday:{open:"14:00",close:"21:00"},
                holiday:{open:"10:00",close:"21:00"},
                summer:{open:"10:00",close:"21:00"},
                event:{open:"10:00",close:"21:00"},
                closed:{open:"",close:""}
            },
            updatedAt:0,
            updatedBy:""
        };
    }

    function normalizeConfig(raw){
        var base = defaultConfig();
        raw = raw && typeof raw === "object" ? raw : {};
        Object.keys(base).forEach(function(key){
            if(raw[key] !== undefined) base[key] = raw[key];
        });
        base.auto = raw.auto !== false;
        base.mode = MODE_META[base.mode] ? base.mode : "weekday";
        base.resolvedMode = MODE_META[base.resolvedMode] ? base.resolvedMode : base.mode;
        base.closedWeekdays = Array.isArray(base.closedWeekdays) ? base.closedWeekdays.map(Number).filter(function(v){return v>=0&&v<=6;}) : [1];
        base.seasons = Array.isArray(base.seasons) ? base.seasons : [];
        base.specialDates = Array.isArray(base.specialDates) ? base.specialDates : [];
        base.openingHours = Object.assign(defaultConfig().openingHours, base.openingHours || {});
        return base;
    }

    function loadConfig(){
        var raw = null;
        try{ raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); }catch(error){ raw = null; }
        // 舊版只有 mode/auto 時也能自動遷移
        window.businessMode = normalizeConfig(raw || window.businessMode || {});
        return window.businessMode;
    }

    function saveLocal(config){
        window.businessMode = normalizeConfig(config);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.businessMode));
    }

    function isMonthDayInRange(md,start,end){
        if(!start || !end) return false;
        if(start <= end) return md >= start && md <= end;
        return md >= start || md <= end; // 跨年度，例如 12-20 ~ 01-10
    }

    function resolve(date, config){
        config = normalizeConfig(config || window.businessMode);
        date = date || new Date();
        if(!config.auto){
            return {mode:config.mode,reason:"手動模式",date:dateKey(date),source:"manual"};
        }
        var key = dateKey(date);
        var special = config.specialDates.filter(function(item){ return item && item.enabled !== false && item.date === key; })[0];
        if(special){
            return {mode:MODE_META[special.mode] ? special.mode : "event",reason:"特殊日期："+(special.name||key),date:key,source:"special"};
        }
        if(config.closedWeekdays.indexOf(date.getDay()) >= 0){
            return {mode:"closed",reason:"每週固定公休",date:key,source:"weekly-closed"};
        }
        var md = monthDayKey(date);
        var season = config.seasons.filter(function(item){
            return item && item.enabled !== false && isMonthDayInRange(md,item.start,item.end);
        })[0];
        if(season){
            return {mode:MODE_META[season.mode] ? season.mode : "summer",reason:(season.name||"季節期間")+"："+season.start+"～"+season.end,date:key,source:"season"};
        }
        var weekend = date.getDay() === 0 || date.getDay() === 6;
        return {
            mode:weekend ? config.weekendMode : config.weekdayMode,
            reason:weekend ? "週末自動切換" : "平日自動切換",
            date:key,
            source:weekend ? "weekend" : "weekday"
        };
    }

    function applyResolved(options){
        options = options || {};
        var result = resolve(options.date || new Date(), window.businessMode);
        var changed = window.businessMode.resolvedMode !== result.mode || window.businessMode.resolvedDate !== result.date;
        window.businessMode.resolvedMode = result.mode;
        window.businessMode.resolvedReason = result.reason;
        window.businessMode.resolvedDate = result.date;
        if(window.businessMode.auto) window.businessMode.mode = result.mode;
        saveLocal(window.businessMode);
        if(typeof window.updateTicketButtons === "function") window.updateTicketButtons();
        if(typeof window.renderTicketCatalog === "function") window.renderTicketCatalog();
        updateStatusBadge();
        if(changed && typeof window.renderBusinessMode === "function" && document.getElementById("businessModePage") && document.getElementById("businessModePage").classList.contains("active")){
            window.renderBusinessMode();
        }
        return result;
    }

    function currentMode(){
        var cfg = loadConfig();
        return cfg.auto ? (cfg.resolvedMode || resolve(new Date(),cfg).mode) : cfg.mode;
    }

    function modeLabel(mode){ return MODE_META[mode] ? MODE_META[mode].title : mode; }

    function updateStatusBadge(){
        var badge = document.getElementById("businessModeStatusBadge");
        if(!badge){
            badge = document.createElement("div");
            badge.id = "businessModeStatusBadge";
            badge.className = "business-mode-floating-badge";
            document.body.appendChild(badge);
        }
        var cfg = window.businessMode;
        var mode = currentMode();
        var hours = cfg.openingHours[mode] || {};
        badge.innerHTML = "<strong>"+modeLabel(mode)+"</strong><span>"+(mode === "closed" ? "今日公休" : ((hours.open||"--:--")+"～"+(hours.close||"--:--")))+"</span>";
        badge.classList.toggle("is-closed",mode === "closed");
    }

    function scheduleMidnightRefresh(){
        if(midnightTimer) clearTimeout(midnightTimer);
        var now = new Date();
        var next = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,2,0);
        midnightTimer = setTimeout(function(){ applyResolved(); scheduleMidnightRefresh(); },Math.max(1000,next.getTime()-now.getTime()));
    }

    function escapeHtml(value){
        return String(value == null ? "" : value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});
    }

    function modeOptions(selected){
        return Object.keys(MODE_META).map(function(id){ return "<option value=\""+id+"\" "+(selected===id?"selected":"")+">"+MODE_META[id].title+"</option>"; }).join("");
    }

    function openBusinessMode(){
        if(window.MonsterPermission && !MonsterPermission.requirePermission("business.update","❌ 只有店長可以修改營業模式")) return;
        renderBusinessMode();
        showPage("businessModePage");
    }

    function renderBusinessMode(){
        var table = document.getElementById("businessModeTable");
        if(!table) return;
        var cfg = loadConfig();
        var resolved = resolve(new Date(),cfg);
        var weekdays = ["日","一","二","三","四","五","六"];
        var closedChecks = weekdays.map(function(name,index){
            return "<label class=\"bm-check\"><input type=\"checkbox\" data-bm-closed=\""+index+"\" "+(cfg.closedWeekdays.indexOf(index)>=0?"checked":"")+">星期"+name+"</label>";
        }).join("");
        var seasonRows = cfg.seasons.map(function(item,index){
            return "<div class=\"bm-rule-row\" data-season-row=\""+index+"\">"+
                "<input class=\"bm-name\" data-season-name value=\""+escapeHtml(item.name)+"\" placeholder=\"名稱\">"+
                "<input type=\"text\" data-season-start value=\""+escapeHtml(item.start)+"\" placeholder=\"07-01\" maxlength=\"5\">"+
                "<span>～</span><input type=\"text\" data-season-end value=\""+escapeHtml(item.end)+"\" placeholder=\"08-31\" maxlength=\"5\">"+
                "<select data-season-mode>"+modeOptions(item.mode)+"</select>"+
                "<label class=\"bm-mini-check\"><input type=\"checkbox\" data-season-enabled "+(item.enabled!==false?"checked":"")+">啟用</label>"+
                "<button type=\"button\" class=\"bm-remove\" onclick=\"removeBusinessSeason("+index+")\">刪除</button></div>";
        }).join("") || "<div class=\"bm-empty\">尚未設定寒暑假日期</div>";
        var specialRows = cfg.specialDates.map(function(item,index){
            return "<div class=\"bm-rule-row bm-special-row\" data-special-row=\""+index+"\">"+
                "<input type=\"date\" data-special-date value=\""+escapeHtml(item.date)+"\">"+
                "<input class=\"bm-name\" data-special-name value=\""+escapeHtml(item.name)+"\" placeholder=\"例如：春節公休\">"+
                "<select data-special-mode>"+modeOptions(item.mode)+"</select>"+
                "<label class=\"bm-mini-check\"><input type=\"checkbox\" data-special-enabled "+(item.enabled!==false?"checked":"")+">啟用</label>"+
                "<button type=\"button\" class=\"bm-remove\" onclick=\"removeBusinessSpecialDate("+index+")\">刪除</button></div>";
        }).join("") || "<div class=\"bm-empty\">尚未設定特殊日期</div>";

        table.innerHTML = "<div class=\"bm-status-card "+(resolved.mode==="closed"?"is-closed":"")+"\"><div><small>今天自動判斷</small><h2>"+modeLabel(resolved.mode)+"</h2><p>"+escapeHtml(resolved.reason)+"</p></div><div class=\"bm-date\">"+resolved.date+"</div></div>"+
            "<div class=\"bm-panel\"><div class=\"bm-panel-title\"><div><h3>📅 自動依日期切換</h3><p>優先順序：特殊日期 → 固定公休 → 寒暑假 → 週末／平日</p></div><label class=\"business-auto-switch\"><input type=\"checkbox\" id=\"autoMode\" "+(cfg.auto?"checked":"")+"><span>"+(cfg.auto?"已啟用":"未啟用")+"</span></label></div>"+
            "<div class=\"bm-grid-two\"><label>平日預設模式<select id=\"bmWeekdayMode\">"+modeOptions(cfg.weekdayMode)+"</select></label><label>週末預設模式<select id=\"bmWeekendMode\">"+modeOptions(cfg.weekendMode)+"</select></label></div>"+
            "<div class=\"bm-subtitle\">每週固定公休日</div><div class=\"bm-check-grid\">"+closedChecks+"</div></div>"+
            "<div class=\"bm-panel\"><div class=\"bm-panel-title\"><div><h3>🏖️ 寒暑假期間</h3><p>使用 MM-DD，可設定跨年度日期</p></div><button type=\"button\" class=\"bm-add\" onclick=\"addBusinessSeason()\">＋新增期間</button></div><div id=\"bmSeasonRows\">"+seasonRows+"</div></div>"+
            "<div class=\"bm-panel\"><div class=\"bm-panel-title\"><div><h3>⭐ 特殊日期</h3><p>指定日期會覆蓋所有其他規則，可設為公休或活動</p></div><button type=\"button\" class=\"bm-add\" onclick=\"addBusinessSpecialDate()\">＋新增日期</button></div><div id=\"bmSpecialRows\">"+specialRows+"</div></div>"+
            "<div class=\"bm-panel\"><h3>🕒 各模式營業時間</h3><div class=\"bm-hours-grid\">"+
            ["weekday","holiday","summer","event"].map(function(mode){var h=cfg.openingHours[mode]||{};return "<div class=\"bm-hours-row\"><strong>"+modeLabel(mode)+"</strong><input type=\"time\" data-hours-open=\""+mode+"\" value=\""+(h.open||"")+"\"><span>～</span><input type=\"time\" data-hours-close=\""+mode+"\" value=\""+(h.close||"")+"\"></div>";}).join("")+"</div></div>"+
            "<div class=\"bm-panel bm-manual\"><h3>✋ 手動模式（關閉自動切換時使用）</h3><div class=\"bm-grid-two\"><label>手動指定模式<select id=\"bmManualMode\">"+modeOptions(cfg.mode)+"</select></label><div class=\"bm-preview-note\">目前實際模式：<strong>"+modeLabel(currentMode())+"</strong></div></div></div>";
    }

    function collectForm(){
        var cfg = normalizeConfig(window.businessMode);
        var auto = document.getElementById("autoMode");
        cfg.auto = !!(auto && auto.checked);
        cfg.weekdayMode = (document.getElementById("bmWeekdayMode")||{}).value || "weekday";
        cfg.weekendMode = (document.getElementById("bmWeekendMode")||{}).value || "holiday";
        cfg.mode = (document.getElementById("bmManualMode")||{}).value || cfg.mode;
        cfg.closedWeekdays = Array.prototype.slice.call(document.querySelectorAll("[data-bm-closed]:checked")).map(function(el){return Number(el.getAttribute("data-bm-closed"));});
        cfg.seasons = Array.prototype.slice.call(document.querySelectorAll("[data-season-row]")).map(function(row,index){
            return {id:"season_"+index,name:(row.querySelector("[data-season-name]")||{}).value||"季節期間",start:(row.querySelector("[data-season-start]")||{}).value||"",end:(row.querySelector("[data-season-end]")||{}).value||"",mode:(row.querySelector("[data-season-mode]")||{}).value||"summer",enabled:!!(row.querySelector("[data-season-enabled]")||{}).checked};
        });
        cfg.specialDates = Array.prototype.slice.call(document.querySelectorAll("[data-special-row]")).map(function(row,index){
            return {id:"special_"+index,date:(row.querySelector("[data-special-date]")||{}).value||"",name:(row.querySelector("[data-special-name]")||{}).value||"特殊日期",mode:(row.querySelector("[data-special-mode]")||{}).value||"event",enabled:!!(row.querySelector("[data-special-enabled]")||{}).checked};
        }).filter(function(item){return !!item.date;});
        ["weekday","holiday","summer","event"].forEach(function(mode){
            var open=document.querySelector("[data-hours-open='"+mode+"']"), close=document.querySelector("[data-hours-close='"+mode+"']");
            cfg.openingHours[mode]={open:open?open.value:"",close:close?close.value:""};
        });
        cfg.updatedAt = Date.now();
        cfg.updatedBy = window.MonsterAuth && MonsterAuth.getCurrentUser ? ((MonsterAuth.getCurrentUser()||{}).name||"") : "";
        return cfg;
    }

    function validateConfig(cfg){
        var md=/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
        for(var i=0;i<cfg.seasons.length;i++){
            if(!md.test(cfg.seasons[i].start)||!md.test(cfg.seasons[i].end)) return "寒暑假日期格式請使用 MM-DD，例如 07-01";
        }
        return "";
    }

    function saveCloud(cfg){
        if(!window.MonsterCloud || !MonsterCloud.database) return Promise.resolve(false);
        return MonsterCloud.database.ref(CLOUD_PATH).set(cfg).then(function(){return true;}).catch(function(error){console.warn("[BusinessMode] cloud save failed",error);return false;});
    }

    function saveBusinessMode(){
        if(window.MonsterPermission && !MonsterPermission.requirePermission("business.update","❌ 只有店長可以修改營業模式")) return;
        var cfg=collectForm(), error=validateConfig(cfg);
        if(error){alert("❌ "+error);return;}
        saveLocal(cfg);
        applyResolved();
        saveCloud(window.businessMode).then(function(synced){
            if(window.MonsterAuth) MonsterAuth.audit("business.update","營業模式規則已更新",{source:"admin",targetType:"business",targetId:"mode",auto:cfg.auto});
            renderBusinessMode();
            alert("✅ 營業模式已儲存"+(synced?"，並同步至其他裝置":"（目前使用本機設定，連線後會再同步）"));
        });
    }

    function addBusinessSeason(){ var cfg=collectForm(); cfg.seasons.push({id:"season_"+Date.now(),name:"新期間",start:"07-01",end:"08-31",mode:"summer",enabled:true}); saveLocal(cfg); renderBusinessMode(); }
    function removeBusinessSeason(index){ var cfg=collectForm(); cfg.seasons.splice(index,1); saveLocal(cfg); renderBusinessMode(); }
    function addBusinessSpecialDate(){ var cfg=collectForm(); cfg.specialDates.push({id:"special_"+Date.now(),date:dateKey(new Date()),name:"特殊日期",mode:"event",enabled:true}); saveLocal(cfg); renderBusinessMode(); }
    function removeBusinessSpecialDate(index){ var cfg=collectForm(); cfg.specialDates.splice(index,1); saveLocal(cfg); renderBusinessMode(); }

    function resetBusinessMode(){
        if(window.MonsterPermission && !MonsterPermission.requirePermission("business.update","❌ 只有店長可以恢復營業模式")) return;
        if(!confirm("確定恢復 V7.8 預設營業模式？")) return;
        var cfg=defaultConfig(); cfg.updatedAt=Date.now(); saveLocal(cfg); applyResolved(); saveCloud(window.businessMode); renderBusinessMode();
    }

    function startCloudSync(){
        if(!window.MonsterCloud || typeof MonsterCloud.onReady!=="function") return;
        MonsterCloud.onReady(function(cloud){
            try{
                cloudRef=cloud.database.ref(CLOUD_PATH);
                cloudRef.on("value",function(snapshot){
                    var remote=snapshot.val();
                    if(!remote) return;
                    var local=loadConfig();
                    if(Number(remote.updatedAt||0) < Number(local.updatedAt||0)) return;
                    applyingCloud=true;
                    saveLocal(remote);
                    applyResolved();
                    applyingCloud=false;
                });
            }catch(error){console.warn("[BusinessMode] cloud listen failed",error);}
        });
    }

    window.MonsterBusinessMode={
        resolve:resolve,
        apply:applyResolved,
        getCurrentMode:currentMode,
        getConfig:function(){return clone(loadConfig());},
        getModeMeta:function(mode){return clone(MODE_META[mode]||{});},
        dateKey:dateKey
    };
    window.openBusinessMode=openBusinessMode;
    window.renderBusinessMode=renderBusinessMode;
    window.saveBusinessMode=saveBusinessMode;
    window.resetBusinessMode=resetBusinessMode;
    window.addBusinessSeason=addBusinessSeason;
    window.removeBusinessSeason=removeBusinessSeason;
    window.addBusinessSpecialDate=addBusinessSpecialDate;
    window.removeBusinessSpecialDate=removeBusinessSpecialDate;

    loadConfig();
    function init(){ applyResolved(); scheduleMidnightRefresh(); startCloudSync(); }
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
