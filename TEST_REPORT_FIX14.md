# FIX14 Test Report

日期：2026-07-29

## 專項驗證

- 開機零投入舊付款會呼叫 Controller 113 取消接口。
- Controller 回覆 `CANCELED` 後清除本機交易並留在首頁。
- 已投入現金的狀態不符合自動取消條件。
- 返回鍵有捕獲階段保護，不會再執行舊快取中的返回事件。
- `index.html` 內建首頁保護，外部 `page.js` 暫時讀到舊快取時仍可返回。
- Service Worker 只在沒有現金／LINE Pay 交易時自動啟用。

FIX14 專項：12 項通過。

## 完整回歸

- 28 支網頁測試檔全部通過。
- 60 支 JavaScript 全部通過語法檢查。
- 保留 FIX7～FIX13、現金橋接、收據、PWA、LINE Pay、店長 QR、即時訂單、角色權限、票券規則與作廢保護測試。

## 檔案

- 完整專案檔案數：188。
- Service Worker 快取：`7833-fix14-startup-home-back-guard-20260729-1`。
