# 小怪獸售票機 V7.8.3.3 Sprint 7

目前正式版本：V7.8.3.3 Point Form Reset Fix＋Sprint 7 Operations & Reconciliation

本版以已通過實機付款的 Sprint 6 FIX1 為底，加入每日現金對帳、面額明細、硬體健康、部分收款保護與人工結案。原有會員點數、票券規則、營業模式、QR驗票、作廢保護、Firebase與後台功能皆保留。

新版會清除舊PWA快取並統一右下角版本顯示；右下角若不是 `V7.8.3.3 S7`，不可投入現金。

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

請完整部署本資料夾，不要只覆蓋單一JavaScript。Sprint 7同時擴充Android控制器，因此兩邊都要更新。詳細步驟請看交付包根目錄的 `README_先看這裡.md`。
GitHub Pages 使用 `main` 分支的 `/(root)`，並保留根目錄的 `.nojekyll`。
