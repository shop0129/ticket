// 小怪獸售票機 V7.8.3.3 FIX46｜預存入場雲端列印佇列
(function () {
    "use strict";

    var ROOT = "monsterTicket/v1";
    var started = false;
    var processing = {};
    var claimJob = null;
    var claimNextJob = null;
    var completeJob = null;
    var pollTimer = null;
    var pollBusy = false;

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

    function printClaimed(data) {
        var job = data && data.job || {};
        var order = data && data.order;
        var jobId = String(job.id || job.orderId || (order && order.id) || "");
        if (!data || !data.claimed || !jobId || !order || processing[jobId]) return Promise.resolve({ status: "skipped" });
        processing[jobId] = true;
        return MonsterReceiptPrinter.printOrder(order, { reprint: false }).then(function () {
            return finish(jobId, true, "");
        }).catch(function (error) {
            return finish(jobId, false, error);
        }).then(function (result) {
            delete processing[jobId];
            return result;
        }).catch(function (error) {
            delete processing[jobId];
            throw error;
        });
    }

    function pollNext() {
        if (pollBusy || !canPrint() || !claimNextJob || !completeJob) return;
        pollBusy = true;
        claimNextJob({ requestedAt: Date.now() }).then(function (result) {
            return printClaimed(result && result.data || {});
        }).catch(function (error) {
            console.error("[PrepaidPrintQueue poll]", error);
        }).then(function () {
            pollBusy = false;
        });
    }

    function schedulePoll() {
        if (pollTimer) clearInterval(pollTimer);
        pollNext();
        pollTimer = setInterval(pollNext, 3000);
    }

    function start(cloud) {
        if (started || !cloud || !cloud.database || !window.firebase || !firebase.functions) return;
        started = true;
        claimJob = firebase.functions("asia-east1").httpsCallable("prepaidPrintV1Claim");
        claimNextJob = firebase.functions("asia-east1").httpsCallable("prepaidPrintV1ClaimNext");
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
        schedulePoll();
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
