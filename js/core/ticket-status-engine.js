// 小怪獸售票機 V7.6.0｜Ticket Status Engine
(function (global) {
    "use strict";

    var STATUS = {
        WAITING: "waiting",
        PLAYING: "playing",
        FINISHED: "finished",
        CANCELLED: "cancelled",
        NOT_REQUIRED: "not_required"
    };

    function normalize(value) {
        var text = String(value || "").trim().toLowerCase();
        if (["playing", "entered", "checked_in", "checkin", "active"].indexOf(text) >= 0) return STATUS.PLAYING;
        if (["finished", "checked_out", "checkout", "left", "completed", "done"].indexOf(text) >= 0) return STATUS.FINISHED;
        if (["cancelled", "canceled", "cancel", "void", "voided"].indexOf(text) >= 0) return STATUS.CANCELLED;
        if (["not_required", "notrequired", "none"].indexOf(text) >= 0) return STATUS.NOT_REQUIRED;
        return STATUS.WAITING;
    }

    function ticketStatus(ticket) {
        return normalize(ticket && (ticket.status || ticket.playStatus || ticket.validationStatus));
    }

    function admissionTickets(order) {
        if (!order || !Array.isArray(order.ticketInstances)) return [];
        return order.ticketInstances.filter(function (ticket) {
            return ticket && ticket.admissionRequired !== false && ticketStatus(ticket) !== STATUS.NOT_REQUIRED;
        });
    }

    function deriveOrderStatus(order) {
        if (!order) return STATUS.WAITING;
        if (order.cancelled || order.status === "cancel" || normalize(order.playStatus) === STATUS.CANCELLED || normalize(order.validationStatus) === STATUS.CANCELLED) {
            return STATUS.CANCELLED;
        }
        if (order.admissionRequired === false || normalize(order.playStatus) === STATUS.NOT_REQUIRED) {
            return STATUS.NOT_REQUIRED;
        }

        var tickets = admissionTickets(order);
        if (tickets.length) {
            var states = tickets.map(ticketStatus);
            if (states.every(function (state) { return state === STATUS.FINISHED; })) return STATUS.FINISHED;
            if (states.some(function (state) { return state === STATUS.PLAYING; })) return STATUS.PLAYING;
            if (states.every(function (state) { return state === STATUS.CANCELLED; })) return STATUS.CANCELLED;
            return STATUS.WAITING;
        }

        return normalize(order.playStatus || order.validationStatus || order.ticketStatus || "waiting");
    }

    function updateTickets(tickets, target, now, actor) {
        return (Array.isArray(tickets) ? tickets : []).map(function (ticket) {
            var next = Object.assign({}, ticket);
            var state = ticketStatus(next);
            if (target === STATUS.PLAYING && state === STATUS.WAITING) {
                next.status = STATUS.PLAYING;
                next.playStatus = STATUS.PLAYING;
                next.validationStatus = STATUS.PLAYING;
                next.checkedInAt = now;
                next.checkedInBy = actor || "staff";
            } else if (target === STATUS.FINISHED && state === STATUS.PLAYING) {
                next.status = STATUS.FINISHED;
                next.playStatus = STATUS.FINISHED;
                next.validationStatus = STATUS.FINISHED;
                next.checkedOutAt = now;
                next.checkedOutBy = actor || "staff";
            } else if (target === STATUS.WAITING) {
                next.status = STATUS.WAITING;
                next.playStatus = STATUS.WAITING;
                next.validationStatus = STATUS.WAITING;
                next.checkedInAt = null;
                next.checkedInBy = null;
                next.checkedOutAt = null;
                next.checkedOutBy = null;
            }
            return next;
        });
    }

    function transition(order, target, options) {
        var next = Object.assign({}, order || {});
        var opts = options || {};
        var now = Number(opts.now || Date.now());
        var actor = opts.actor || "staff";
        var normalizedTarget = normalize(target);

        next.ticketInstances = updateTickets(next.ticketInstances, normalizedTarget, now, actor);
        next.playStatus = normalizedTarget;
        next.validationStatus = normalizedTarget;
        next.ticketStatus = normalizedTarget;
        next.updatedAt = now;

        if (normalizedTarget === STATUS.PLAYING) {
            next.entryTime = opts.entryTime || next.entryTime || now;
            next.checkedInAt = next.entryTime;
            next.checkedInBy = actor;
            if (Object.prototype.hasOwnProperty.call(opts, "expectedExitTime")) next.expectedExitTime = opts.expectedExitTime;
            next.exitTime = null;
            next.checkedOutAt = null;
            next.checkedOutBy = null;
        } else if (normalizedTarget === STATUS.FINISHED) {
            next.exitTime = opts.exitTime || now;
            next.checkedOutAt = next.exitTime;
            next.checkedOutBy = actor;
        } else if (normalizedTarget === STATUS.WAITING) {
            next.entryTime = null;
            next.expectedExitTime = null;
            next.exitTime = null;
            next.checkedInAt = null;
            next.checkedInBy = null;
            next.checkedOutAt = null;
            next.checkedOutBy = null;
        }

        return next;
    }

    function synchronize(order) {
        var next = Object.assign({}, order || {});
        var state = deriveOrderStatus(next);
        next.playStatus = state;
        next.validationStatus = state;
        next.ticketStatus = state;
        return next;
    }

    function label(valueOrOrder) {
        var state = typeof valueOrOrder === "object" ? deriveOrderStatus(valueOrOrder) : normalize(valueOrOrder);
        if (state === STATUS.PLAYING) return "遊玩中";
        if (state === STATUS.FINISHED) return "已離場";
        if (state === STATUS.CANCELLED) return "已作廢";
        if (state === STATUS.NOT_REQUIRED) return "不需入場";
        return "等待入場";
    }

    function timer(order, now) {
        var current = Number(now || Date.now());
        var state = deriveOrderStatus(order);
        var expected = Number(order && order.expectedExitTime || 0);
        if (state !== STATUS.PLAYING || !expected) return { state: state, remainingMs: null, overtimeMs: 0, expired: false };
        var remaining = expected - current;
        return { state: state, remainingMs: Math.max(0, remaining), overtimeMs: Math.max(0, -remaining), expired: remaining < 0 };
    }

    global.MonsterTicketStatusEngine = {
        VERSION: "7.6.0",
        STATUS: STATUS,
        normalize: normalize,
        getTicketStatus: ticketStatus,
        getOrderStatus: deriveOrderStatus,
        synchronizeOrder: synchronize,
        transitionOrder: transition,
        label: label,
        timer: timer
    };
})(window);
