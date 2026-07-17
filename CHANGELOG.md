# V7.4.5 Mobile UX Update

- 修正 iPhone Dynamic Island／瀏海遮住票券管理與 Dashboard 標題。
- 關閉按鈕移入安全區並放大觸控範圍。
- 補上底部 Home Indicator 安全間距。
- 更新 PWA 快取版本，避免手機繼續讀取舊版。

# CHANGELOG

## V7.4.1 Enterprise Mobile Fix
- 完善手機版 Dashboard 與票券管理介面。
- 更新 Enterprise Core、權限守衛與版本狀態。
- 保留即時訂單同步、角色系統、Firebase 與 PWA。
- 清理舊版本 README、CHANGELOG、部署指南與測試報告。

## V7.4.0 Enterprise
- 加入 Enterprise Core、事件匯流排、集中權限與健康狀態。

## V7.4.4 — Ticket Manager & Order Reset FIX
- 修正點餐機開啟票券管理時，渲染前誤判票券名稱空白而造成空白頁。
- 票券名稱、重複名稱與負數價格驗證改到儲存時執行。
- Dashboard 新增店長限定「重置全部訂單」功能，需二次確認並輸入 RESET。
- 同步清除 Firebase Realtime Database 與本機 salesHistory，並留下操作紀錄。
- 更新 PWA 快取版本。

## V7.4.8 消費點數系統
- 店長可設定消費集點、點數折抵價值與單筆最高折抵比例。
- 會員結帳可使用點數折抵，訂單記錄原價、折抵點數、折抵金額與實付金額。
- 點數以實付金額計算本次獲得點數。
- 訂單作廢會退回已使用點數並扣回本次獲得點數。
- 店長後台新增會員消費點數搜尋、手動調整、原因與操作人紀錄。
- 點數規則與會員點數同步 Firebase，並保留本機備援。
