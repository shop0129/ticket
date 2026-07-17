// 小怪獸售票機 V7.4.2
// Staff 後台全域按鍵音效與視覺回饋
(function(){
    "use strict";

    var clickAudio = null;
    var successAudio = null;
    var lastPlayedAt = 0;

    function createAudio(src, volume){
        try{
            var audio = new Audio(src);
            audio.preload = "auto";
            audio.volume = volume;
            return audio;
        }catch(error){
            return null;
        }
    }

    function ensureAudio(){
        if(!clickAudio){
            clickAudio = createAudio("sounds/click.wav", 0.45);
        }
        if(!successAudio){
            successAudio = createAudio("sounds/success.wav", 0.42);
        }
    }

    function safePlay(audio){
        if(!audio){ return; }
        try{
            audio.pause();
            audio.currentTime = 0;
            var promise = audio.play();
            if(promise && promise.catch){
                promise.catch(function(){});
            }
        }catch(error){}
    }

    function isSuccessButton(button){
        if(!button){ return false; }
        return button.classList.contains("staff-success-button") ||
            button.id === "staffLoginButton" ||
            /確認|儲存|完成|新增|更新/.test(button.textContent || "");
    }

    function getInteractiveTarget(target){
        if(!target || !target.closest){ return null; }
        return target.closest("button, [role='button'], a.staff-menu-button");
    }

    function pressEffect(button){
        button.classList.add("staff-button-pressed");
        window.setTimeout(function(){
            button.classList.remove("staff-button-pressed");
        }, 140);
    }

    document.addEventListener("click", function(event){
        var button = getInteractiveTarget(event.target);
        var now;

        if(!button || button.disabled || button.getAttribute("aria-disabled") === "true"){
            return;
        }

        now = Date.now();
        if(now - lastPlayedAt < 70){ return; }
        lastPlayedAt = now;

        ensureAudio();
        pressEffect(button);
        safePlay(isSuccessButton(button) ? successAudio : clickAudio);

        if(navigator.vibrate){
            try{ navigator.vibrate(12); }catch(error){}
        }
    }, true);

    document.addEventListener("keydown", function(event){
        var button;
        if(event.key !== "Enter" && event.key !== " "){ return; }
        button = getInteractiveTarget(event.target);
        if(button && !button.disabled){
            ensureAudio();
            pressEffect(button);
            safePlay(clickAudio);
        }
    }, true);

    window.MonsterStaffFeedback = {
        playClick:function(){ ensureAudio(); safePlay(clickAudio); },
        playSuccess:function(){ ensureAudio(); safePlay(successAudio); }
    };
})();
