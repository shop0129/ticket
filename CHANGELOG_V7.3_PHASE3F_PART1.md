# V7.3 Phase 3F Part 1 變更紀錄

## 新增

- `manifest.webmanifest`：Kiosk portrait fullscreen PWA。
- `staff.webmanifest`：Staff standalone PWA。
- `display.webmanifest`：看板 landscape fullscreen PWA。
- `service-worker.js`：同源 App Shell 快取、離線 navigation fallback、靜態資源 stale-while-revalidate 與手動套用更新。
- `offline.html`：未快取路徑的離線提示頁。
- `js/pwa/pwa-manager.js`：安裝提示、全螢幕、線上／離線狀態與 Service Worker 更新流程。
- `css/pwa.css`：PWA 控制列、安全區域與網路狀態樣式。
- `images/pwa/`：192、512、maskable、Apple Touch 圖示。
- PWA 與 Service Worker 自動測試。

## 修改

- `index.html`、`staff.html`、`lobby-display.html`、`play-display.html` 加入個別 manifest、theme color、Apple meta、PWA CSS 與 manager。
- `js/display.js` 支援 Firebase SDK 未載入時的離線啟動畫面。
- Kiosk 版本標籤更新為 `V7.3 Phase 3F Part 1`。

## 保留

- Simple Login 本機帳號模式。
- 店長 `manager / 1234`。
- 員工 `staff / 0000`。
- 原本 Kiosk、Staff、訂單中心、會員、候位與看板功能。
