# Monster Hardware Explorer v1.0 Sprint 5

## 這一版做什麼

Sprint 5 把 Sprint 4 已實機驗證的現金控制器接到「售票訂單交易層」。每筆訂單先保存唯一訂單編號與應付金額，只有實收剛好等於應付金額時，才建立唯一的付款 ID 與出票授權 ID，通知售票機出票。

本版仍不開放找零、硬幣出幣、紙鈔出鈔、Reset 或 Escrow。

## 交易安全規則

1. 訂單編號使用後會進入防重放清單，不可再次收款或出票。
2. 每個 MDB 現金事件都有事件 ID，同一事件重送時不會再次入帳。
3. 現金事件會先同步保存，再更新畫面與後續硬體狀態。
4. 實收未達應付時不會建立出票授權。
5. 實收剛好達標時，只建立一組付款 ID 與一組出票授權 ID。
6. 自動出票通知只會取得一次；人工重送仍沿用同一授權 ID。
7. 售票機收到相同授權 ID 時必須去重，列印成功後再回覆 `TICKET_ISSUED`。
8. App 重啟時，未完成且已有收款的訂單會鎖成「人工處理、禁止出票」。
9. App 重啟時，已付款但尚未建立通知的訂單可恢復建立同一筆出票授權；已送出的授權不會自動重送。
10. ttyS1 每次重新連線後，程式會先排程停用收幣與收鈔，完成後才開放新訂單。

## 第一次實機測試

1. 關閉原廠 Lite QC Tool。
2. 用 Android Studio 安裝 Sprint 5。
3. 選擇 `ttyS1 · MDB（硬幣＋收鈔）`、`9600`，按「連線」。
4. 等待約1秒，確認「建立訂單並收款」按鈕可按。
5. 訂單編號輸入 `S5-TEST-110-01`，應付金額輸入 `110`。
6. 按「建立訂單並收款」。
7. 投入一張100元；確認尚差10元，100元紙鈔入口已停用。
8. 投入一枚10元；確認訂單顯示「已通知出票，等待確認」。
9. 確認畫面已產生付款 ID 與出票授權 ID。
10. 在尚未接正式售票 App 前，按「測試：售票機確認已出票」。
11. 確認訂單變成綠色「已出票」。
12. 匯出 Session ZIP。

第一次仍只測 `100元＋10元＝110元`。不要使用20元、500元、1000元或任何找零功能。

## 與正式售票 App 串接

App-to-App 合約在：

- `TicketCashContract.kt`
- `TicketCashBridgeReceiver.kt`
- `docs/TicketCashBridge_Integration.kt`

售票 App 送出 `REQUEST_CASH_PAYMENT`，內容包含唯一訂單編號與整數應付金額。付款完成後會收到 `PRINT_AUTHORIZED`。列印端必須先以 `print_authorization_id` 做持久化去重，列印成功後再送回 `TICKET_ISSUED`。

橋接權限是 `signature`，正式版兩個 App 必須使用相同簽章；Android Studio 測試時也應使用相同 debug keystore。

## 匯出新增內容

- `ticket_order_summary.txt`：訂單、付款 ID、出票授權、通知次數與資料版本。
- `ticket_order_events.log`：訂單請求、現金入帳、出票通知、重送、確認與封鎖事件。
- 原有 `payment_summary.txt`、`mdb_summary.txt`、`bill_summary.txt` 與原始 TX／RX 繼續保留。
