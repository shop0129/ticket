// =========================================
// 小怪獸售票機 V7 Phase 3C
// Lobby / Play 電視即時看板
// =========================================
(function(){

    "use strict";

    var ROOT = "monsterTicket/v1";
    var mode =
    document.body.getAttribute("data-display-mode") ||
    "play";

    var orders = {};
    var venueSettings = {
        maxPlayers:40,
        countGuardians:false
    };

    function esc(value){
        return String(value || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");
    }

    function pad(v){
        return Number(v)<10 ? "0"+v : String(v);
    }

    function timeText(ms){
        if(!ms){return "--:--"}
        var d=new Date(Number(ms));
        return pad(d.getHours())+":"+pad(d.getMinutes());
    }

    function tail(order){
        return String(order.orderNo || "").slice(-4) || "----";
    }

    function list(status){
        var result=[];
        Object.keys(orders).forEach(function(id){
            var order=orders[id];
            if(
                order &&
                !order.deleted &&
                order.admissionRequired !== false &&
                order.playStatus !== "not_required" &&
                (order.playStatus || "waiting") === status
            ){
                order.__id=id;
                result.push(order);
            }
        });
        return result;
    }

    function calculateCurrentPlayers(){

        var total = 0;

        Object.keys(orders || {})
        .forEach(function(id){

            var order =
            orders[id];

            if(
                order &&
                !order.deleted &&
                order.playStatus ===
                "playing"
            ){
                total +=
                Number(
                    order.playerCount || 0
                ) +
                (
                    venueSettings.countGuardians
                    ? Number(
                        order.guardianCount || 0
                    )
                    : 0
                );
            }
        });

        return total;
    }

    function updateCapacity(){

        var current =
        calculateCurrentPlayers();

        var max =
        Number(
            venueSettings.maxPlayers ||
            40
        );

        document.getElementById(
            "displayCapacity"
        ).textContent =
        current + " / " + max;

        document.getElementById(
            "displayRemaining"
        ).textContent =
        "剩餘 " +
        Math.max(0,max-current) +
        " 人";
    }

    function remaining(order){
        var expected =
        Number(order.expectedExitTime || 0);
        if(order.timeMode === "unlimited"){
            return {
                text:"不限時間",
                cls:"status-normal",
                minutes:9998
            };
        }

        if(!expected){
            return {
                text:"計時中",
                cls:"status-normal",
                minutes:9999
            };
        }
        var diff =
        Math.floor((expected-Date.now())/60000);
        if(diff < 0){
            return {
                text:"超時 "+Math.abs(diff)+" 分",
                cls:"status-overtime",
                minutes:diff
            };
        }
        if(diff <= 10){
            return {
                text:"剩 "+diff+" 分",
                cls:"status-urgent",
                minutes:diff
            };
        }
        if(diff <= 30){
            return {
                text:"剩 "+diff+" 分",
                cls:"status-warning",
                minutes:diff
            };
        }
        return {
            text:"剩 "+diff+" 分",
            cls:"status-normal",
            minutes:diff
        };
    }

    function renderPlay(){
        var rows=list("playing");
        rows.sort(function(a,b){
            return remaining(a).minutes -
                   remaining(b).minutes;
        });
        var box=document.getElementById("displayPrimaryList");
        if(rows.length===0){
            box.innerHTML='<div class="display-empty">目前沒有遊玩中的訂單</div>';
            return;
        }
        box.innerHTML=rows.slice(0,12).map(function(order,index){
            var r=remaining(order);
            return `
<div class="display-row">
  <div class="display-index">${pad(index+1)}</div>
  <div class="display-queue">${esc(order.queueNumber || "排號中")}<small> / ${esc(tail(order))}</small></div>
  <div class="display-time">${timeText(order.entryTime)} 入場</div>
  <div class="display-status ${r.cls}">${esc(r.text)}</div>
</div>`;
        }).join("");
    }

    function renderWaiting(){
        var rows=list("waiting");
        rows.sort(function(a,b){
            return Number(a.waitingSince||0) -
                   Number(b.waitingSince||0);
        });
        var box=document.getElementById("displayWaitingList");
        if(rows.length===0){
            box.innerHTML='<div class="display-empty">目前無候位</div>';
            return;
        }
        var remainingCapacity =
        Math.max(
            0,
            Number(
                venueSettings.maxPlayers || 40
            ) -
            calculateCurrentPlayers()
        );
        box.innerHTML=rows.slice(0,10).map(function(order,index){
            var ready =
            index===0 &&
            Number(order.playerCount||1) <=
            remainingCapacity;
            return `
<div class="display-row waiting-row ${ready ? "waiting-ready" : ""}">
  <div class="display-index">${index+1}</div>
  <div class="display-queue">${esc(order.queueNumber || "排號中")}</div>
  <div class="display-time">${Number(order.playerCount||1)} 人</div>
  <div class="display-status ${ready ? "status-normal" : ""}">${ready ? "請準備入場" : "等待中"}</div>
</div>`;
        }).join("");
    }

    function render(){
        updateCapacity();
        renderPlay();
        renderWaiting();
        document.getElementById("displayClock").textContent =
        new Date().toLocaleTimeString("zh-TW");
    }

    function start(){
        firebase.database()
        .ref(ROOT+"/orders")
        .on("value",function(snapshot){
            orders=snapshot.val()||{};
            render();
        });
        firebase.database()
        .ref(ROOT+"/venue/settings")
        .on("value",function(snapshot){

            venueSettings =
            snapshot.val() ||
            venueSettings;

            render();
        });

        firebase.database()
        .ref(ROOT+"/venue/callout")
        .on("value",function(snapshot){

            var callout =
            snapshot.val();

            var overlay =
            document.getElementById(
                "displayCalloutOverlay"
            );

            if(!overlay){
                return;
            }

            if(
                callout &&
                Number(callout.expiresAt || 0) >
                Date.now()
            ){
                overlay.style.display =
                "flex";

                document.getElementById(
                    "displayCalloutNumber"
                ).textContent =
                callout.queueNumber || "";

                document.getElementById(
                    "displayCalloutPeople"
                ).textContent =
                Number(
                    callout.playerCount || 1
                ) + " 人";

                if(
                    window.MONSTER_DISPLAY_SOUND !==
                    false
                ){
                    try{
                        var audio =
                        document.getElementById(
                            "displayCalloutSound"
                        );

                        if(audio){
                            audio.currentTime = 0;
                            audio.play();
                        }
                    }catch(error){}
                }

                setTimeout(function(){

                    overlay.style.display =
                    "none";

                },15000);

            }else{

                overlay.style.display =
                "none";
            }
        });

        setInterval(render,1000);
    }

    if(!firebase.apps.length){
        firebase.initializeApp(
            window.MONSTER_FIREBASE_CONFIG
        );
    }
    firebase.auth()
    .signInAnonymously()
    .then(start);

})();
