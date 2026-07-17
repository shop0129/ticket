小怪獸售票機 V7.3 Phase 3F Part 1
PWA／全螢幕／離線啟動

基底
- 以 V7.3 Simple Login 完整版直接升級。
- 店長：manager／1234。
- 員工：staff／0000。
- 不啟用 Firebase Email/Password、不部署 Cloud Functions、不使用 Custom Claims。

本次完成
1. Kiosk、Staff 與即時看板可安裝成桌面 App。
2. Kiosk 使用 portrait fullscreen manifest。
3. Staff 使用 standalone manifest，從桌面開啟會直接進入 staff.html。
4. 看板使用 landscape fullscreen manifest。
5. 加入 Android／iPhone 安裝提示、全螢幕按鈕與安全區域支援。
6. 加入 Service Worker App Shell，快取所有本機 HTML、CSS、JavaScript、圖片與音效。
7. 已開啟過的 Kiosk、Staff、候位看板與場內看板可離線啟動。
8. 離線時顯示明確提示；網路恢復時顯示重新連線狀態。
9. Firebase 與其他跨網域請求不經 Service Worker 攔截，避免快取過期雲端資料。
10. 新版本安裝完成後只顯示「套用新版」，不會在售票途中自動刷新。
11. 看板在 Firebase SDK 無法載入時仍可顯示離線空畫面，不會直接停止執行。
12. 新增小怪獸 PWA 192、512、maskable 與 Apple Touch 圖示。

重要限制
- PWA 與 Service Worker 必須使用 HTTPS 網址或 localhost；直接雙擊 file:// 不會啟用。
- 第一次一定要在有網路時完整開啟一次，完成快取後才可離線啟動。
- 本 Part 1 是「離線啟動畫面」，不是完整離線售票。離線時請勿完成正式付款、修改會員或作廢訂單。
- Firebase SDK 與即時雲端資料刻意不放入離線快取。
- 完整離線交易佇列與恢復後自動同步安排在 Phase 3F Part 2。

安裝與部署
請閱讀 PWA_DEPLOY_GUIDE_V7.3_PHASE3F_PART1.md。

自動測試
node tests/role-permission.test.js
node tests/simple-login-migration.test.js
node tests/pwa-assets.test.js
node tests/service-worker-behavior.test.js
