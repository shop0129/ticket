// 小怪獸售票機 V7.8.3.3 FIX47｜預存入場雲端列印佇列＋可見錯誤恢復
(function () {
    "use strict";

    var ROOT = "monsterTicket/v1";
    var started = false;
    var processing = {};
    var claimJob = null;
    var claimNextJob = null;
    var completeJob = null;
    var statusJob = null;
    var retryJob = null;
    var pollTimer = null;
    var pollBusy = false;
    var lastPairingPromptAt = 0;
    var lastStatus = null;

    function ensureStatusBox() {
        var box = document.getElementById("prepaidPrintQueueStatus");
        if (box) return box;
        box = document.createElement("div");
        box.id = "prepaidPrintQueueStatus";
        box.style.cssText = "display:none;position:fixed;left:18px;right:18px;bottom:18px;z-index:2147482900;padding:16px 18px;border-radius:16px;background:#fff3cd;color:#664d03;border:2px solid #ffca2c;box-shadow:0 8px 28px rgba(0,0,0,.25);font:700 18px/1.45 Arial,'Noto Sans TC',sans-serif;text-align:center;";
        document.body.appendChild(box);
        return box;
    }

    function showStatus(message, kind, buttonText, onClick) {
        var box = ensureStatusBox();
        var color = kind === "error" ? ["#f8d7da", "#842029", "#dc3545"] :
            (kind === "ok" ? ["#d1e7dd", "#0f5132", "#198754"] : ["#fff3cd", "#664d03", "#ffca2c"]);
        box.style.display = "block";
        box.style.background = color[0];
        box.style.color = color[1];
        box.style.borderColor = color[2];
        box.innerHTML = '<div>' + String(message || "").replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + '</div>';
        if (buttonText && onClick) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = buttonText;
            button.style.cssText = "margin-top:10px;padding:10px 22px;border:0;border-radius:12px;background:#0d6efd;color:white;font-size:18px;font-weight:700;";
            button.onclick = onClick;
            box.appendChild(button);
        }
    }

    function hideStatusLater() {
        setTimeout(function () {
            var box = document.getElementById("prepaidPrintQueueStatus");
            if (box) box.style.display = "none";
        }, 4000);
    }

    function errorText(error) {
        return error && error.message ? error.message : String(error || "未知錯誤");
    }

    function printerReady(allowPrompt) {
        if (!window.MonsterReceiptPrinter || typeof MonsterReceiptPrinter.ensureReady !== "function") {
            var missing = new Error("收據列印程式尚未載入，請重新開啟售票機網頁");
            missing.code = "PRINTER_MODULE_MISSING";
            return Promise.reject(missing);
        }
        return MonsterReceiptPrinter.ensureReady(allowPrompt);
    }

    function finish(jobId, success, error) {
        return completeJob({
            jobId: jobId,
            success: success === true,
            error: errorText(error),
            errorCode: String(error && error.code || "")
        }).then(function (result) {
            return result && result.data || {};
        });
    }

    function claimAndPrint(jobId) {
        if (processing[jobId] || !claimJob || !completeJob) return;
        processing[jobId] = true;
        printerReady(Date.now() - lastPairingPromptAt > 60000).then(function () {
            return claimJob({ jobId: jobId });
        }).then(function (result) {
            var data = result && result.data || {};
            if (!data.claimed || !data.order) return { status: "skipped" };
            showStatus("正在列印預存入場收據「" + String(data.job && data.job.orderNo || "") + "」…", "wait");
            return MonsterReceiptPrinter.printOrder(data.order, { reprint: false }).then(function () {
                return finish(jobId, true, "");
            }).catch(function (error) {
                return finish(jobId, false, error);
            });
        }).then(function (outcome) {
            delete processing[jobId];
            if (outcome && outcome.status === "pending") {
                setTimeout(function () { claimAndPrint(jobId); }, 1500);
            } else if (outcome && outcome.status === "printed") {
                showStatus("預存入場收據已列印完成", "ok");
                hideStatusLater();
            }
        }).catch(function (error) {
            delete processing[jobId];
            lastPairingPromptAt = Date.now();
            showStatus("預存收據尚未列印：" + errorText(error), "error", "重新嘗試", function () { claimAndPrint(jobId); });
            console.error("[PrepaidPrintQueue]", error);
        });
    }

    function printClaimed(data) {
        var job = data && data.job || {};
        var order = data && data.order;
        var jobId = String(job.id || job.orderId || (order && order.id) || "");
        if (!data || !data.claimed || !jobId || !order || processing[jobId]) return Promise.resolve({ status: "skipped" });
        processing[jobId] = true;
        showStatus("正在列印預存入場收據「" + String(job.orderNo || "") + "」…", "wait");
        return MonsterReceiptPrinter.printOrder(order, { reprint: false }).then(function () {
            return finish(jobId, true, "");
        }).catch(function (error) {
            return finish(jobId, false, error);
        }).then(function (result) {
            delete processing[jobId];
            if (result && result.status === "printed") {
                showStatus("預存入場收據已列印完成", "ok");
                hideStatusLater();
            }
            return result;
        }).catch(function (error) {
            delete processing[jobId];
            throw error;
        });
    }

    function retryFailed(jobId) {
        if (!retryJob || !jobId) return;
        showStatus("正在重新排入列印…", "wait");
        retryJob({ jobId: jobId }).then(function () {
            lastStatus = null;
            pollNext(true);
        }).catch(function (error) {
            showStatus("無法重試列印：" + errorText(error), "error");
        });
    }

    function handleQueueStatus(status, manual) {
        lastStatus = status || {};
        if (lastStatus.failed && lastStatus.failed.id) {
            showStatus("有 1 張預存入場收據尚未列印：" + String(lastStatus.failed.lastError || "列印失敗"), "error", "重試這張收據", function () { retryFailed(lastStatus.failed.id); });
            return Promise.resolve(false);
        }
        if (!Number(lastStatus.pendingCount || 0)) return Promise.resolve(false);
        showStatus("收到 " + Number(lastStatus.pendingCount) + " 張待列印預存入場收據，正在連接收據機…", "wait");
        var allowPrompt = manual === true || Date.now() - lastPairingPromptAt > 60000;
        return printerReady(allowPrompt).then(function () { return true; }).catch(function (error) {
            lastPairingPromptAt = Date.now();
            showStatus("預存收據等待列印：" + errorText(error), "error", "連接收據機並重試", function () { pollNext(true); });
            return false;
        });
    }

    function pollNext(manual) {
        if (pollBusy || !statusJob || !claimNextJob || !completeJob) return;
        pollBusy = true;
        statusJob({ requestedAt: Date.now() }).then(function (result) {
            return handleQueueStatus(result && result.data || {}, manual);
        }).then(function (ready) {
            if (!ready) return { data: { claimed: false } };
            return claimNextJob({ requestedAt: Date.now() });
        }).then(function (result) {
            return printClaimed(result && result.data || {});
        }).catch(function (error) {
            showStatus("雲端列印連線失敗：" + errorText(error), "error", "重新連線", function () { pollNext(true); });
            console.error("[PrepaidPrintQueue poll]", error);
        }).then(function () {
            pollBusy = false;
        });
    }

    function schedulePoll() {
        if (pollTimer) clearInterval(pollTimer);
        pollNext();
        pollTimer = setInterval(function () { pollNext(false); }, 4000);
    }

    function start(cloud) {
        if (started || !cloud || !cloud.database || !window.firebase || !firebase.functions) return;
        started = true;
        claimJob = firebase.app().functions("asia-east1").httpsCallable("prepaidPrintV1Claim");
        claimNextJob = firebase.app().functions("asia-east1").httpsCallable("prepaidPrintV1ClaimNext");
        completeJob = firebase.app().functions("asia-east1").httpsCallable("prepaidPrintV1Complete");
        statusJob = firebase.app().functions("asia-east1").httpsCallable("prepaidPrintV1Status");
        retryJob = firebase.app().functions("asia-east1").httpsCallable("prepaidPrintV1Retry");
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
