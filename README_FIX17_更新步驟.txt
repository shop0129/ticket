小怪獸售票機 V7.8.3.3 FIX17
================================

1. 將 WEB_UPDATE_ONLY 裡的全部檔案依原路徑覆蓋到 ticket GitHub Pages。
2. 等 GitHub Pages 部署完成。
3. 回到完整更新包執行 01_INSTALL_KIOSK117_HOME_STABLE_AND_REBOOT.cmd。
4. 重開機後等待約 45 秒。
5. 執行 02_VERIFY_KIOSK117_AFTER_REBOOT.cmd。

正確畫面：
- 右下角顯示 V7.8.3.3 · FIX17 HOME STABLE + TICKET READY
- 開機保持首頁，不會自己跳到選擇票種
- 按開始購票後，票卡圖片與價格會一次完整顯示
- 票種頁按返回會回首頁

Controller 113 不需重新安裝。
