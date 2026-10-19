// 小怪獸售票機 V7.8.3.3 FIX43｜預存入場雲端列印佇列
(function () {
    "use strict";

    var ROOT = "monsterTicket/v1";
    var started = false;
    var processing = {};
    var claimJob = null;
    var completeJob = null;

    function canPrint() {
        return window.MonsterReceiptPrinter &&
            typeof MonsterReceiptPrinter.hasPairing === "function" &&
            MonsterReceiptPrinter.hasPairing();
    }

    function finish(jobId, success, error) {
        return completeJob({
            jobId: jobId,
            success: success === true,
            error: error && error.message ? error.message : String(error || "")
        }).then(function (result) {
            return result && result.data || {};
        });
    }

    function claimAndPrint(jobId) {
        if (processing[jobId] || !canPrint() || !claimJob || !completeJob) return;
        processing[jobId] = true;
        claimJob({ jobId: jobId }).then(function (result) {
            var data = result && result.data || {};
            if (!data.claimed || !data.order) return { status: "skipped" };
            return MonsterReceiptPrinter.printOrder(data.order, { reprint: false }).then(function () {
                return finish(jobId, true, "");
            }).catch(function (error) {
                return finish(jobId, false, error);
            });
        }).then(function (outcome) {
            delete processing[jobId];
            if (outcome && outcome.status === "pending") {
                setTimeout(function () { claimAndPrint(jobId); }, 1500);
            }
        }).catch(function (error) {
            delete processing[jobId];
            console.error("[PrepaidPrintQueue]", error);
        });
    }

    function start(cloud) {
        if (started || !cloud || !cloud.database || !window.firebase || !firebase.functions) return;
        started = true;
        claimJob = firebase.functions("asia-east1").httpsCallable("prepaidPrintV1Claim");
        completeJob = firebase.functions("asia-east1").httpsCallable("prepaidPrintV1Complete");
        cloud.database.ref(ROOT + "/printJobs").on("child_added", function (snapshot) {
            var job = snapshot.val() || {};
            if (job.status === "pending" || (job.status === "printing" && Date.now() - Number(job.claimedAt || 0) > 180000)) {
                claimAndPrint(snapshot.key);
            }
        });
        cloud.database.ref(ROOT + "/printJobs").on("child_changed", function (snapshot) {
            var job = snapshot.val() || {};
            if (job.status === "pending") claimAndPrint(snapshot.key);
        });
    }

    function boot() {
        if (window.MonsterCloud && typeof MonsterCloud.onReady === "function") {
            MonsterCloud.onReady(start);
        } else {
            setTimeout(boot, 500);
        }
    }
    boot();
}());
