// 小怪獸售票機 V7.6.2｜Live Timer Engine
(function (global) {
    "use strict";

    var subscribers = [];
    var timerId = null;
    var lastSecond = 0;

    function toMillis(value) {
        if (!value) return 0;
        if (typeof value === "number") return value;
        var numeric = Number(value);
        if (isFinite(numeric) && numeric > 1000000000) return numeric;
        var parsed = new Date(value).getTime();
        return isNaN(parsed) ? 0 : parsed;
    }

    function getExpectedExit(order) {
        return toMillis(order && (
            order.expectedExitTime ||
            order.expireTime ||
            order.playExpireAt ||
            order.scheduledExitAt
        ));
    }

    function getSnapshot(order, now) {
        var current = Number(now || Date.now());
        var state = global.MonsterTicketStatusEngine
            ? global.MonsterTicketStatusEngine.getOrderStatus(order)
            : String(order && (order.playStatus || order.validationStatus) || "waiting");
        var expectedExitTime = getExpectedExit(order);
        var difference = expectedExitTime ? expectedExitTime - current : null;
        var phase = "inactive";

        if (state === "playing" && expectedExitTime) {
            if (difference < 0) phase = "overtime";
            else if (difference <= 10 * 60 * 1000) phase = "soon";
            else phase = "safe";
        } else if (state === "playing") {
            phase = "no_time";
        }

        return {
            now: current,
            state: state,
            phase: phase,
            expectedExitTime: expectedExitTime,
            differenceMs: difference,
            remainingMs: difference == null ? null : Math.max(0, difference),
            overtimeMs: difference == null ? 0 : Math.max(0, -difference),
            expired: difference != null && difference < 0
        };
    }

    function formatDuration(milliseconds, options) {
        var opts = options || {};
        if (milliseconds == null) return opts.emptyText || "未設定時間";
        var negative = milliseconds < 0;
        var value = Math.abs(milliseconds);
        var hours = Math.floor(value / 3600000);
        var minutes = Math.floor((value % 3600000) / 60000);
        var seconds = Math.floor((value % 60000) / 1000);
        var clock = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
        if (opts.clockOnly) return clock;
        return (negative ? "超時 " : "剩餘 ") + clock;
    }

    function notify(now) {
        subscribers.slice().forEach(function (listener) {
            try { listener(now); } catch (error) { console.error("Live Timer listener error", error); }
        });
    }

    function tick() {
        var now = Date.now();
        var second = Math.floor(now / 1000);
        if (second === lastSecond) return;
        lastSecond = second;
        notify(now);
    }

    function start() {
        if (timerId) return;
        tick();
        timerId = setInterval(tick, 250);
    }

    function stop() {
        if (!timerId) return;
        clearInterval(timerId);
        timerId = null;
    }

    function subscribe(listener) {
        if (typeof listener !== "function") return function () {};
        subscribers.push(listener);
        start();
        return function () {
            subscribers = subscribers.filter(function (item) { return item !== listener; });
            if (!subscribers.length) stop();
        };
    }

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else if (subscribers.length) start();
    });

    global.MonsterLiveTimerEngine = {
        VERSION: "7.6.2",
        getExpectedExit: getExpectedExit,
        getSnapshot: getSnapshot,
        formatDuration: formatDuration,
        subscribe: subscribe,
        start: start,
        stop: stop
    };
})(window);
