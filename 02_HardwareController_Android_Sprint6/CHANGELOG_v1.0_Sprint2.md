# CHANGELOG · v1.0 Sprint 2 MDB Coin Decoder

- 新增一鍵安全補幣：Coin Setup → Enable。
- 新增 60 秒倒數及自動 Disable。
- App 進入背景、中斷 ttyS1 或離開時自動停止補幣。
- 新增 Coin Setup 面額解碼。
- 新增硬幣進入儲幣筒／溢幣箱事件解碼與金額統計。
- 新增 Tube Info 庫存查詢與解碼。
- 將 `30 09` 解碼為「紙鈔機停用（正常待機）」。
- Manual MDB TX 改為安全白名單；封鎖 Reset、出幣、支付及未知指令。
- Session Log 增加 `interpretation` 欄位，匯出增加 `mdb_summary.txt`。
