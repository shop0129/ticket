# V7.8.3.3 FIX26F — LINE Pay WebView Overlay Repair

## 問題

Kiosk 125 使用 Android 8.1 / WebView 61。FIX26E 的 LINE Pay 全螢幕彈窗使用
舊版 WebView 不支援的 CSS `inset: 0`，因此按鈕已進入付款鎖定並變灰，
但「正在準備 LINE Pay」彈窗可能落在可視畫面外。

## 修正

- 改用 `top/right/bottom/left: 0` 與明確的 100% 寬高。
- 移除關鍵版面中的 CSS `min()`，改用 `width` + `max-width`。
- 在 LINE Pay 程式內加入全螢幕行內樣式及顯示／隱藏保護。
- 更新前端與 Service Worker 快取版本為 FIX26F。
- 保留單張票、購物車、裝置啟用與 18 碼掃描流程。

Firebase Functions、Kiosk 125、Controller 113、LINE Pay Secret 與裝置啟用碼均不變。
