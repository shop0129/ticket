# CHANGELOG · v1.0 Sprint 5 Ticket Cash Integration

- 新增持久化 `TicketOrderCoordinator` 售票訂單狀態機。
- 新增唯一訂單 ID、付款 ID 與出票授權 ID。
- 現金事件以 Session／RX Sequence／解碼索引建立事件 ID，封鎖同事件重複入帳。
- 只有實收剛好達標才建立出票授權；不足、取消、逾時、超收與異常均禁止出票。
- 自動出票授權只可取得一次；重送沿用相同授權 ID。
- 新增 App 重啟恢復、部分收款人工處理鎖、訂單 ID 防重放。
- ttyS1 連線後先執行 Coin Disable 與 Bill Disable，再開放訂單收款。
- 新增 signature-protected Android Broadcast 合約：訂單請求、出票授權、出票確認與付款停止。
- 新增正式售票 App 的持久化列印去重整合範例。
- 匯出新增 `ticket_order_summary.txt` 與 `ticket_order_events.log`。
- 版本更新為 `1.0-sprint5-ticket-cash-integration`。
- 找零、出幣、出鈔、Reset、Escrow 與 ttyS3 TX 仍全部封鎖。
