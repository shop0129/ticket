小怪獸售票機 V7.3 Phase 3F Part 1 Fix 1
Realtime Order Sync 修正版

修正問題
- Kiosk 測試購票後，候位資料已產生，但 Staff 訂單中心與另一台店長後台可能延遲顯示。

原因
1. 舊版以 set() 覆寫整個 /orders 節點，可能與候位叫號、入場狀態或其他裝置的新訂單更新互相競爭。
2. Staff 訂單中心只確認 Firebase App 已初始化，沒有等待匿名驗證完成；若 Security Rules 在尚未登入時拒絕監聽，訂單 listener 可能無法正常即時更新。
3. Part 1 Service Worker 對 JavaScript 採快取優先，部署修正後第一次載入仍可能先執行舊同步程式。

本次修正
1. 訂單改為多路徑欄位 update，不再 set() 整個 orders 節點。
2. 新訂單本機保存後約 40ms 排程上傳。
3. 保留其他裝置及生命週期模組新增的 queueNumber、playStatus 等欄位。
4. Staff 等到 firebase.auth().currentUser 存在後才掛上訂單 listener。
5. Staff 使用 onAuthStateChanged 處理較慢的匿名登入。
6. Staff「重新整理」按鈕改成真正向 Firebase once("value") 讀取，不再只是重畫舊資料。
7. Staff 訂單中心顯示最後即時同步時間與雲端訂單筆數。
8. 店長 Dashboard 統計 debounce 從 300ms 縮短為 80ms。
9. Service Worker 對 JS、CSS、HTML、webmanifest 改成連線時 network-first。
10. PWA cache 升級為 Fix1，避免繼續執行舊同步程式。

帳號不變
- 店長：manager／1234
- 員工：staff／0000

更新方式
1. 整包覆蓋 Phase 3F Part 1。
2. 有網路時開啟 index.html，等待左下角出現「套用新版」。
3. 點「套用新版」，頁面會重新載入。
4. Staff 手機也開啟 staff.html 並點一次「套用新版」。
5. 若沒有出現按鈕，重新整理兩次；仍未更新再清除該網站快取後重開。

驗收
1. Kiosk 完成一筆測試購票。
2. Staff 訂單中心應在約 1～2 秒內出現新訂單。
3. Staff 狀態列應顯示「即時同步 時間｜N 筆訂單」。
4. 另一台店長後台最近訂單與營運統計應同步更新。
5. 叫號、等待入場、確認入場與離場狀態應保持一致。

若仍未出現
- 確認 Kiosk 顯示「訂單已同步」。
- 確認 Staff 顯示「雲端已連線」與綠色即時同步狀態。
- 點 Staff 的「重新整理」；這次會直接重新讀取 Firebase。
- 若顯示同步失敗，請記下錯誤畫面與發生時間再回報。
