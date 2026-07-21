# MonsterHardwareSDK v0.4

- 新增 TX Queue：加入、清空、傳送下一筆、傳送全部。
- TX 預設鎖定，避免誤觸硬體動作。
- 新增重複封包折疊與重複次數統計。
- 新增封包篩選：全部、RX、TX、ASCII、Binary。
- 每次連線建立獨立 Session 目錄。
- 自動保存 `rx_raw.bin` 與 `tx_raw.bin` 原始位元組。
- 匯出時建立 ZIP，包含 `session.log`、RX raw、TX raw。
- 版本升級為 0.4.0。
