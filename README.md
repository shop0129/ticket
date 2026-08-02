# 小怪獸售票機 V7.8.3.3 FIX26G

目前正式版本：V7.8.3.3 FIX26G Business Mode Holiday Save Repair

本版以已完成 LINE Pay 正式收款的 FIX26F 為底，修正營業模式公休日保存。會員點數、票券規則、LINE Pay、現金付款、QR 驗票、Firebase 與後台功能皆保留。

## 主要入口
- `index.html`：Kiosk 售票機
- `staff.html`：Staff／店長後台
- `lobby-display.html`：大廳顯示
- `play-display.html`：遊玩區顯示

## 核心資料夾
- `js/`：系統程式
- `css/`：介面樣式
- `images/`：票券與 PWA 圖片
- `sounds/`：操作音效
- `tests/`：自動測試
- `docs/`：架構與維護文件

## 部署

請完整部署本資料夾，不要只覆蓋單一 JavaScript。已安裝成功的 Sprint 6 Android 控制器不需重裝。詳細測試步驟請看交付包根目錄的 README_先看這裡.md。
GitHub Pages 使用 `main` 分支的 `/(root)`，並保留根目錄的 `.nojekyll`。
