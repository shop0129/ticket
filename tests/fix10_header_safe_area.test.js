"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const cashCss = fs.readFileSync(path.join(root, "css", "cash-bridge.css"), "utf8");
const cashBridge = fs.readFileSync(path.join(root, "js", "hardware", "cash-bridge.js"), "utf8");
const pageModule = fs.readFileSync(path.join(root, "js", "modules", "page.js"), "utf8");
const detailModule = fs.readFileSync(path.join(root, "js", "modules", "detail.js"), "utf8");

const checks = [
    ["FIX10 marker exists", css.includes("V7.8.3.3 FIX10 - Kiosk ticket header safe area")],
    ["ticket header cannot shrink", /#ticketPage > \.ticket-header,[\s\S]*?flex-shrink:0 !important/.test(css)],
    ["detail header cannot shrink", /#detailPage > \.ticket-header[\s\S]*?flex-shrink:0 !important/.test(css)],
    ["minimum top protection exists", css.includes("--ticket-kiosk-safe-top:max(20px, env(safe-area-inset-top, 0px))")],
    ["ticket header height includes safe top", css.includes("height:calc(80px + var(--ticket-kiosk-safe-top)) !important")],
    ["ticket back button follows safe top", css.includes("#ticketPage > .ticket-header #backBtn")],
    ["detail back button follows safe top", css.includes("#detailPage > .ticket-header #detailBackBtn")],
    ["current FIX13 version badge exists", html.includes("V7.8.3.3 · FIX13 STARTUP + CASH + BACK RECOVERY")],
    ["stylesheet cache-buster changed", html.includes("css/style.css?v=7833fix10")],
    ["cash CSS cache-buster changed", html.includes("css/cash-bridge.css?v=7833fix11")],
    ["cash JS cache-buster changed", html.includes("js/hardware/cash-bridge.js?v=7833fix13")],
    ["Service Worker cache changed", sw.includes("7833-fix13-startup-cash-back-recovery-20260729-1")],
    ["FIX9 page guard remains", pageModule.includes("hasBlockingCheckoutTransaction")],
    ["amount overlay has three values", cashBridge.includes("hardwareCashAmount") && cashBridge.includes("hardwareCashPaid") && cashBridge.includes("hardwareCashRemaining")],
    ["cash overlay has cancel button", cashBridge.includes('id="hardwareCashCancel"')],
    ["cash cancellation calls Controller endpoint", cashBridge.includes('"/cancel"')],
    ["cash cancellation is blocked after paid amount", cashBridge.includes("Number(active.lastPaidNtd || 0) > 0")],
    ["cancel API error resumes controller polling", /取消付款尚未完成[\s\S]*?pollPayment\(active\.order\.orderNo\)/.test(cashBridge)],
    ["preflight can be safely canceled", cashBridge.includes("function cancelPreflight(returnPage)")],
    ["ticket-page back requests safe cancel", pageModule.includes("requestCancelAndReturn")],
    ["detail-page back requests safe cancel", detailModule.includes("requestCancelAndReturn")],
    ["cancel button is styled", cashCss.includes("#hardwareCashCancel")]
];

let failed = 0;
for (const [name, ok] of checks) {
    if (!ok) {
        failed += 1;
        console.error("FAIL:", name);
    }
}

if (failed) {
    process.exit(1);
}

console.log(`FIX10 header safe-area checks passed: ${checks.length}`);
