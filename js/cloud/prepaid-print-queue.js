// 小怪獸售票機 V7.8.3.3 FIX48｜預存入場改由手機後台直接核對
(function () {
    "use strict";

    // 清除舊版留下的「待列印／正在連接收據機」提示。
    function removeLegacyStatus() {
        var box = document.getElementById("prepaidPrintQueueStatus");
        if (box && box.parentNode) { box.parentNode.removeChild(box); }
    }

    removeLegacyStatus();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removeLegacyStatus);
    }

    // 保留明確狀態，讓維護工具能辨識此版不處理預存收據。
    window.MonsterPrepaidPrintQueue = {
        version: "1.0-fix48-mobile-direct-admission",
        enabled: false,
        mode: "mobile-direct-admission"
    };
}());
