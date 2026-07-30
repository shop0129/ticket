FIX22 網頁更新步驟
==================

1. 將 WEB_UPDATE_ONLY 內全部檔案依原路徑覆蓋到 GitHub Pages 專案。
2. 等待部署完成。
3. 用筆電瀏覽器確認右下角顯示：
   V7.8.3.3 · FIX22 · ONLINE
4. 執行外層的：
   01_INSTALL_KIOSK122_INSTANT_START_AND_REBOOT.cmd
5. 重開機約 45 秒後執行：
   02_VERIFY_KIOSK122_AFTER_REBOOT.cmd

實機測試：
- 首頁按「開始購票」會立即進入售票頁。
- 票卡圖片較慢時會先顯示本機預設圖，不會只剩價格。
- 右下角只有一個版本／連線標籤。
- 售票頁按「返回」立即回到原生首頁。
- Android 實體返回鍵也可回首頁。
- Controller 113 不重新安裝。
