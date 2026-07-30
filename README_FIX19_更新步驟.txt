FIX19 網頁更新步驟
==================

1. 將 WEB_UPDATE_ONLY 內全部檔案依原路徑覆蓋到 GitHub Pages 專案。
2. 等部署完成。
3. 用筆電開啟首頁，確認右下角顯示：
   V7.8.3.3 · FIX19 WEBVIEW CLEAN START
4. 再執行外層的：
   01_INSTALL_KIOSK119_WEBVIEW_CLEAN_AND_REBOOT.cmd

注意：
- Controller 113 不需重裝。
- 不要只上傳 index.html；service-worker.js、page.js、cash-bridge.js 必須一起更新。
