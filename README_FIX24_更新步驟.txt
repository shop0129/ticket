FIX24 + Kiosk 124 更新步驟
============================

1. 將 WEB_UPDATE_ONLY 內全部檔案覆蓋到 GitHub Pages 的 ticket 專案根目錄。
2. 等部署完成，確認右下角只有：
   V7.8.3.3 · FIX24 · ONLINE
3. 執行：
   01_INSTALL_KIOSK124_NATIVE_ROUTE_AND_REBOOT.cmd
4. 重開機等待約 45 秒後執行：
   02_VERIFY_KIOSK124_AFTER_REBOOT.cmd
5. 測試：
   首頁 → 按一次開始購票 → 售票頁 → 返回首頁
   首頁 → 管理 → 直接進管理登入頁 → 返回首頁
   登入管理後台 → 登出並返回首頁

Controller 113 不會重新安裝，也不會執行付款、找零或列印測試。
