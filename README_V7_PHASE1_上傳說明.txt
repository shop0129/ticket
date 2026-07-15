小怪獸售票機 V7 Phase 1
Android 點餐機穩定修正版

【上傳方式】
1. 解壓縮 ticket_V7_Phase1_Stable.zip。
2. 進入解壓後的 ticket-main 資料夾。
3. 將資料夾內的 index.html、css、images、js、sounds 全部上傳並覆蓋 GitHub 原專案。
4. 不要把 ZIP 檔本身直接上傳到 GitHub。
5. 等待 GitHub Pages 更新約 1～3 分鐘。
6. 完全關閉點餐機瀏覽器，再重新開啟網址。
7. 右下角看到「V7 Phase 1」代表已載入新版。

【重要】
- 先不要清除網站資料或 localStorage，避免原本票券、訂單與會員資料消失。
- 必須整包覆蓋，不要只上傳其中幾個 JS，避免新舊版本混用。
- index.html 內的快取版本已更新為 70phase1。

【已修正】
- history.js 被錯誤覆蓋成 hardwareTest.js 的問題。
- legacy-polyfills.js 內容包含字面 \n、導致程式失效的問題。
- cart / hardwareStatus 等全域重複宣告錯誤。
- Chrome 61 不支援的 const、let、箭頭函式、optional chaining、nullish 等語法。
- index.html 重複 script 載入。
- 全部 25 個 JS 已逐檔語法檢查。
- 已依 index.html 順序完成模擬啟動測試。
