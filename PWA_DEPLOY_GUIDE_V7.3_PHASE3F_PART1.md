# Phase 3F Part 1 部署與安裝

## 1. 更新網站

先備份目前 Simple Login 版本，再整包上傳本版本。以下檔案必須與 `index.html` 位於同一層：

- `service-worker.js`
- `manifest.webmanifest`
- `staff.webmanifest`
- `display.webmanifest`
- `offline.html`

不要把 `service-worker.js` 移到 `js/`，否則它無法控制整個售票機目錄。

PWA 需要 HTTPS。原網站若使用 Firebase Hosting 或其他正常 HTTPS 主機，不用另外申請設定；直接雙擊電腦中的 `index.html` 只會以一般網頁模式運作。

## 2. 第一次建立離線快取

1. 裝置保持連線。
2. 開啟 `index.html`，等待約 5～10 秒。
3. 重新整理一次。
4. 分別開啟一次 `staff.html`、`lobby-display.html`、`play-display.html`。
5. 關閉網路後重新開啟頁面，應看到離線提示且畫面仍可載入。

## 3. Android／Windows 安裝

- 頁面出現「安裝到桌面」時直接點擊。
- 若按鈕沒有出現，從 Chrome 或 Edge 選單選擇「安裝應用程式」或「加到主畫面」。
- Kiosk 安裝 `index.html`；員工手機請從 `staff.html` 安裝，兩者的啟動頁不同。

## 4. iPhone／iPad 安裝

1. 必須使用 Safari 開啟。
2. 點 Safari 的分享按鈕。
3. 選擇「加入主畫面」。
4. 從桌面圖示啟動後會使用獨立視窗與安全區域。

## 5. 全螢幕

- Android、Windows 與支援 Fullscreen API 的瀏覽器可點左下角「全螢幕」。
- iPhone／iPad 請從加入主畫面的圖示啟動；Safari 網頁分頁本身不提供相同的全螢幕能力。
- 已以安裝模式啟動時，安裝與全螢幕按鈕會自動隱藏。

## 6. 更新版本

部署新版後，Service Worker 會在背景檢查。新快取完成時左下角出現「套用新版」。請等沒有進行中的售票或資料修改時再點，頁面才會重新載入。

未點擊前會繼續使用目前版本，避免營運中途自動刷新。

## 7. 離線使用界線

Part 1 可以離線開啟已快取畫面，但不保證離線交易同步。看到紅色離線提示時：

- 可以確認介面、票種與已存在的本機畫面。
- 不要完成付款、會員修改、訂單作廢或其他正式資料變更。
- 網路恢復後等待綠色提示，再重新整理並確認 Firebase 顯示已連線。

完整離線交易佇列、重送與衝突處理會在 Phase 3F Part 2 實作。

## 8. 回復 Simple Login 版本

若需要回復：

1. 放回前一版完整檔案。
2. 從瀏覽器網站設定清除該網址的快取與網站資料，或移除已安裝的 App 後重新加入。
3. 重新開啟前一版 `index.html`。

清除網站資料也會移除裝置 localStorage 員工帳號；執行前請先保留資料備份。
