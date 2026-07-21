# CHANGELOG · v1.0 Sprint 4 Cash Payment Controller

- 新增純 Kotlin `CashPaymentController` 狀態機：準備、收款、完成、取消、逾時與錯誤。
- 新增應付金額輸入、120秒付款、取消付款與人工處理確認介面。
- 整合1／5／10／50元硬幣與100元紙鈔，即時累計應付、已付及尚差。
- 新增動態硬幣接受遮罩；只開放已實機驗證且不超過尚差金額的面額。
- 硬幣 Enable 的手動出幣位元固定為0，並新增精確遮罩安全驗證。
- 尚差低於100元時自動 Disable 100元紙鈔。
- 剛好達標後依最後現金來源優先停止對應入口，再停止另一入口。
- 取消、逾時、背景、中斷或錯誤時停止收幣與收鈔。
- 已收現金但未完成時標記待人工退款／記帳，處理前禁止下一筆付款。
- 匯出 ZIP 新增 `payment_summary.txt`。
- ttyS3 出鈔、硬幣出幣、支付、Reset、Escrow 與未知指令維持封鎖。
- 版本更新為 `1.0-sprint4-cash-payment-controller`。
