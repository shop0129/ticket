小怪獸售票機 V7.8.3.3 FIX16

1. 將 WEB_UPDATE_ONLY 內全部檔案依原路徑覆蓋到 ticket GitHub Pages 專案。
2. 等待 GitHub Pages 部署完成。
3. 完全關閉售票頁。
4. 安裝 Kiosk 116 Home First 更新。
5. 重開機約 45 秒後確認右下角顯示：
   V7.8.3.3 · FIX16 HOME FIRST + NO FREEZE

預期結果：

- 開機以首頁作為第一畫面。
- Controller 113 尚在啟動時持續安全等待，不顯示卡住的票種頁。
- 票種頁按「返回」會回到首頁。
- 已投入現金、LINE Pay 或已取得列印授權的交易仍會保留。

Controller 113 不需要重新安裝。
