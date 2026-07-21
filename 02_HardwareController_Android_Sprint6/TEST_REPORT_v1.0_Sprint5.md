# TEST REPORT · v1.0 Sprint 5

## 已通過

- Android Kotlin 全專案編譯。
- Android XML 資源、Manifest 合併與 Receiver／permission 設定解析。
- Sprint 2～4 MDB 安全政策回歸：Setup、Disable、單一100元 Enable、硬幣面額遮罩、Reset／出幣／支付／Escrow 封鎖。
- 160元付款回放：100＋50＋10剛好完成。
- 取消後保留已收款並要求人工處理。
- 超收時禁止出票並要求人工處理。
- Sprint 5 訂單110元：100元＋10元後才建立出票授權。
- 相同現金事件 ID 重送不重複入帳。
- 自動出票授權只能取得一次。
- 出票通知重送沿用相同付款 ID 與授權 ID。
- 相同出票確認重送會被忽略。
- 已完成訂單 ID 不可再次使用。
- App 重啟時，部分收款訂單轉為人工處理；未收款訂單安全取消。

測試程式：`tools/ProtocolSafetyReplayTest.kt`

## 實機測試範圍

Sprint 5 未修改 Sprint 4 已通過實機測試的 MDB 收款與原生 serial C++。首次實機只需驗證訂單狀態、唯一出票授權與測試出票確認；仍使用100元紙鈔＋10元硬幣完成110元。
