# CHANGELOG · v1.0 Sprint 3 Safe Bill Acceptor

- 校正硬體架構：收鈔器位於 ttyS1 MDB；ttyS3 是出鈔找零機。
- 新增 Bill Setup 28-byte 回覆、checksum、面額、鈔箱容量與 Escrow 支援解碼。
- 新增紙鈔 stacked、rejected、held in escrow、returned 及狀態錯誤解碼。
- 新增「單張100元測試」：動態找出100元類型，只啟用一個面額，Escrow 固定關閉。
- 收到第一張、60秒逾時、App 背景、中斷或手動停止時自動 Disable。
- 硬幣補幣與紙鈔測試互斥，避免共用 ttyS1 時指令交錯。
- ttyS3 改為唯讀標示，Queue 與傳送路徑雙重封鎖全部 TX。
- 匯出 ZIP 新增 `bill_summary.txt`。
- 版本更新為 `1.0-sprint3-safe-bill-acceptor`。

