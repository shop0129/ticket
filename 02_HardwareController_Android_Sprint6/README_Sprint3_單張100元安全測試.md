# Monster Hardware Explorer v1.0 Sprint 3

## 這一版做什麼

Sprint 3 新增「單張 100 元安全收鈔測試」。收鈔器與硬幣機共用 `/dev/ttyS1`（MDB、9600 baud）。

`/dev/ttyS3` 是出鈔找零機，不是收鈔器；本版禁止 ttyS3 的全部 TX，沒有實作出鈔、退鈔或 Reset。

## 安全流程

按下「單張100元測試（60秒）」後，程式會：

1. 傳送 Bill Setup `31`。
2. 驗證 Setup checksum 並讀出 16 個紙鈔類型。
3. 找出面額剛好為 NT$100 的類型。
4. 產生只開放該一個類型的 `34` Enable，Escrow 位元固定為 0。
5. 收到第一張紙鈔的 stacked 事件後，立即傳送 Disable `34 00 00 00 00`。
6. 60 秒逾時、App 進入背景、ttyS1 中斷或使用者按停止時，也會自動 Disable。

如果 Bill Setup 無回覆、checksum 錯誤或找不到 100 元，本版不會啟用收鈔。

## 首次實機測試

1. 先強制停止原廠 Lite QC Tool，避免同時占用 ttyS1。
2. 將 `/dev/ttyS1` 權限設為可讀寫，開啟 Explorer。
3. 選擇 `ttyS1 · MDB（硬幣＋收鈔）`、`9600`，按「連線」。
4. 確認頂端顯示 `/dev/ttyS1：已連線 @ 9600`。
5. 按「單張100元測試（60秒）」；先不要插入紙鈔。
6. 等畫面出現「只啟用 NT$100」後，只插入一張 100 元。
7. 確認顯示「紙鈔 NT$100 → 已收下並進入鈔箱」及「已自動停用」。
8. 匯出 Session ZIP 並保留 `bill_summary.txt`、`session.log`、`mdb_rx_raw.bin`、`mdb_tx_raw.bin`。

如果紙鈔被退出、畫面沒有顯示只啟用 NT$100，或出現 Escrow／卡鈔／鈔箱異常，立即按「停止收鈔」，不要連續重試。

## 已開放指令

- Bill Setup：`31`
- Bill Poll：`33`
- Bill Disable：`34 00 00 00 00`
- 專用按鈕產生的「單一100元類型 Enable，Escrow 關閉」
- Sprint 2 原有安全硬幣指令

## 明確封鎖

- Bill Reset：`30`
- Escrow accept／return：`35 ...`
- Stacker／Identity：`36`、`37 ...`
- Coin Reset、出幣、支付與未知 MDB 指令
- `/dev/ttyS3` 的全部 TX

