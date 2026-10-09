// 小怪獸售票機 FIX35 - 員工未打卡禁止入場相關操作
(function () {
    "use strict";

    var sectionIds = ["staffValidationSection", "staffOrderCenterSection"];

    function byId(id) { return document.getElementById(id); }

    function role() {
        if (window.MonsterAuth && MonsterAuth.getCurrentRole) {
            return MonsterAuth.getCurrentRole() || "";
        }
        return window.currentUserRole || "";
    }

    function state() { return window.MonsterAttendanceState || {}; }

    function isBlocked() {
        return role() === "staff" && state().clockedIn !== true;
    }

    function ensureBanner(section) {
        var banner = section.querySelector(".attendance-lock-banner");
        if (banner) { return banner; }
        banner = document.createElement("div");
        banner.className = "attendance-lock-banner";
        banner.innerHTML = '<strong>🔒 請先完成上班打卡</strong><span>上班打卡成功後，驗票、入場與離場功能會自動開放。</span>';
        section.insertBefore(banner, section.firstChild);
        return banner;
    }

    function update() {
        var blocked = isBlocked();
        sectionIds.forEach(function (id) {
            var section = byId(id);
            if (!section) { return; }
            ensureBanner(section);
            section.classList.toggle("attendance-operation-locked", blocked);
        });
    }

    function gatedSection(target) {
        var section = target && target.closest ? target.closest("#staffValidationSection, #staffOrderCenterSection") : null;
        return section || null;
    }

    function showReminder() {
        alert("請先按『上班打卡』，才能使用驗票、入場與離場功能。");
        var attendance = document.querySelector(".attendance-section");
        if (attendance && attendance.scrollIntoView) {
            attendance.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function blockEvent(event) {
        if (!isBlocked() || !gatedSection(event.target)) { return; }
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) { event.stopImmediatePropagation(); }
        showReminder();
    }

    window.MonsterAttendanceGate = {
        isBlocked: isBlocked,
        requireClockIn: function () {
            if (!isBlocked()) { return true; }
            showReminder();
            return false;
        },
        update: update
    };

    document.addEventListener("click", blockEvent, true);
    document.addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.keyCode === 13) && gatedSection(event.target)) { blockEvent(event); }
    }, true);
    window.addEventListener("monster:attendance-state", update);
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", update); } else { update(); }
}());
