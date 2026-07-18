## V7.6.2.3
- 修正掃描成功後相機未關閉。
- 修正掃描成功後沒有帶入驗票訂單。
- 增加掃描結果正規化與重複觸發鎖。

# V7.6.0 Enterprise Core

- 新增 Ticket Status Engine，統一 waiting / playing / finished / cancelled 狀態。
- 修正驗票卡完成離場後，訂單查詢仍顯示遊玩中的問題。
- 驗票入場與離場改用 Firebase Transaction，防止多裝置重複操作。
- ticketInstances、playStatus、validationStatus、ticketStatus 會同步更新。
- 訂單中心顯示狀態改由 Ticket Status Engine 推導。
- 新增 Live Timer 基礎 API，供後續現場倒數畫面使用。
- 更新 Service Worker 快取版本。

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

## V7.5.1
- 新增訂單 QR Code 與短訂單號碼核心。
- 新增票券實例資料結構。
- 新增 Staff 快速驗票與短碼查詢入口。

## V7.6.1 Validation Center 2.0
- 新增驗票中心四種即時分類與數量。
- 新增今日現場清單與直接開啟驗票卡。
- 新增遊玩倒數、即將到時及超時顯示。
- 驗票操作後即時刷新狀態清單。

## V7.6.2 Live Timer

- 新增共用 `MonsterLiveTimerEngine`。
- 驗票中心與驗票卡共用同一個每秒時鐘。
- 新增場內、即將到時、已超時即時摘要。
- 剩餘 10 分鐘自動切換提醒狀態。
- 超時訂單自動移入「已超時」並依超時程度排序。
- 頁面進入背景時暫停重繪，回到前景後依實際時間校正。
- 更新 PWA 快取版本。

## V7.6.2.1 Receipt & Mobile Scanner Hotfix
- 修正手機瀏覽器因缺少 BarcodeDetector 而直接判定不支援相機。
- 新增 html5-qrcode 雙 CDN 備援與手動單號備援。
- 修正 58mm 收據文字、金額與 QR Code 超出列印寬度。
- 更新 Service Worker 快取版本。

## V7.6.2.2 Receipt Layout Emergency Fix
- 修正收據預覽文字放大、重疊與擠成一團。
- 隔離成功頁舊版 CSS，避免影響收據內部元素。
- 調整 58mm 收據文字、金額與 QR Code 安全寬度。


## V7.6.2.4
- 修正快速驗票顯示找不到訂單，但訂單中心實際存在的同步與單號比對問題。


## V7.6.2.5 Order Identity Fix
- 修正收據顯示短碼、訂單中心顯示正式單號而造成使用者誤認為不同訂單。
- 收據改為顯示正式 `orderNo`，短碼僅作為輔助快速碼。
- QR 掃描優先使用唯一 `qrToken` 尋找訂單，不再因短碼與正式單號不同而找不到。
- 保留完整單號、短碼、排隊號與舊版 QR 的相容查詢。
- 更新 Service Worker 快取版本。
