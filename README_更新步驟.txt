小怪獸售票機 V7.8.3.3 FIX7
Controller 110 收據列印＋自動找零網頁整合修正

【本次修正】
1. 修正付款成功頁出現，但實體收據沒有列印。
2. 現金付款前先檢查 /dev/ttyS4、9600 收據機是否就緒。
3. 找零完成後才建立訂單、列印收據與回報出票完成。
4. 收據列出實收金額與找零金額。
5. 收據列印失敗或結果不確定時，不會假裝完成，也不會自動重印。
6. 保留 Controller 110 的補鈔、補幣及安全找零功能。

【更新方式】
把本資料夾內所有檔案，依照相同路徑覆蓋到目前 ticket GitHub Pages 專案：

index.html
service-worker.js
css/coin-manager.css
css/receipt-printer.css
js/hardware/cash-bridge.js
js/hardware/coin-manager.js
js/hardware/receipt-printer.js
js/modules/payment.js
js/modules/print.js

上傳完成後，等 GitHub Pages 部署完成，再將點餐機售票頁完全關閉並重新開啟。
第一次重新開啟時需等待新版 Service Worker 接管；畫面版本應為：
V7.8.3.3 FIX7 Receipt + Auto Change

【重要】
Controller 110 不需要重新安裝。
若100元鈔在剩餘金額小於100元時停用，表示安全庫存無法完整找零，
不是收鈔機故障。請先從後台補幣，再執行 Controller 110 包內：
03_CHECK_PRODUCTION_READY_NO_PAYOUT.cmd

只有1／5／10／50元庫存都高於安全門檻，100元鈔才會在需要找零時開放。

【第一次測試】
1. 先確認收據紙、退幣口、出鈔口都正常。
2. 先買100元票，投入100元鈔一張。
3. 必須先出收據，畫面才能倒數返回首頁。
4. 成功後再測250元票投入100元鈔三張，應找50元並列印收據。

若任何一步不符，先停止測試，不要重投，匯出 Controller 110 診斷檔。
