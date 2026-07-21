# V7.8.3.3 Sprint 6 更新指南

## 更新來源

底檔：ticket_V7.8.3.3_Point_Form_Reset_Fix_FULL.zip

現金控制器：已通過實機測試的 Monster Hardware Explorer Sprint 6

## 部署步驟

1. 備份目前 GitHub Pages 專案。
2. 開啟 01_TicketKiosk_Web_V7.8.3.3_Sprint6。
3. 將資料夾內全部檔案上傳至 GitHub Pages 專案的 /(root)。
4. 確認 .nojekyll、index.html、service-worker.js、css、js、images、sounds、tests 都存在。
5. 等 GitHub Pages 部署完成。
6. 在點餐機開啟網站並接受 PWA 更新。
7. 確認右下角顯示 V7.8.3.3 · SPRINT 6 CASH。
8. 依 README_先看這裡.md 執行單筆100元安全測試。

## 不需要做的事

- 不需要修改 Firebase 金鑰。
- 不需要重新建立會員或票券。
- 不需要重裝已成功運作的 Android 控制器。
- 不需要把配對碼寫進原始碼；第一次付款輸入即可。

## 回復方式

若網頁部署後尚未投入任何現金，且需要暫時回復，可重新部署原始 V7.8.3.3 完整包。

若已投入現金或畫面顯示需要人工處理，不可直接回復或建立新訂單；先在 Android 控制器核對該筆付款並完成退款或記帳。

