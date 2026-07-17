// =========================================
// 小怪獸售票機 V7.1
// 舊場內人數資料清理
// =========================================
(function(){

    "use strict";

    var ROOT =
    "monsterTicket/v1";

    function cleanup(){

        var stateRef =
        firebase.database()
        .ref(ROOT + "/venue/state");

        stateRef.once("value")
        .then(function(snapshot){

            var old =
            snapshot.val();

            if(!old){
                return;
            }

            var settings = {
                maxPlayers:
                Number(old.maxPlayers || 40),
                countGuardians:
                Boolean(old.countGuardians),
                migratedAt:
                Date.now()
            };

            return firebase.database()
            .ref(ROOT + "/venue/settings")
            .update(settings)
            .then(function(){

                return stateRef.remove();
            });
        })
        .catch(function(error){

            console.error(
                "[V7.1 migration]",
                error
            );
        });
    }

    if(
        window.firebase &&
        firebase.apps &&
        firebase.apps.length
    ){
        cleanup();
    }else{

        var timer =
        setInterval(function(){

            if(
                window.firebase &&
                firebase.apps &&
                firebase.apps.length
            ){
                clearInterval(timer);
                cleanup();
            }
        },500);
    }

})();
