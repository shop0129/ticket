# Monster Hardware Explorer v1.0 · Sprint 1

## 本版完成

- `/dev/ttyS1`、`/dev/ttyS3`、`/dev/ttyUSB0` 可同時保持連線。
- 每個 Port 各自保存 RX/TX 計數、Raw Binary 與 TX Queue。
- 畫面切換 Port 只切換監看內容，不會中斷其他 Port。
- Command Library 第一版，內建通用、MDB、找零機及 EDC 測試範本。
- 匯出 ZIP 會包含三個 Port 的 Raw 檔、統一事件 Log 與 Command 清單。
- 新增統一 `PacketEvent` 與 `PortProfile`，供 Decoder Plugin、Timeline、Compare 使用。

## RK3288 Android 8.1 實機測試

1. 用 Android Studio 開啟專案，安裝 `app` Debug 版。
2. 先選 `ttyS1 · MDB`、9600，按「連線」。
3. 再選 `ttyS3 · 找零機`，按「連線」。回到 ttyS1，狀態仍應顯示已連線。
4. 如已接 EDC，再連線 ttyUSB0；未接設備時允許顯示開啟錯誤。
5. 分別在各 Port 觀察 RX，確認計數只增加在正確列。
6. 傳送前勾選 TX 解鎖；60 秒後會自動鎖定。
7. 每個 Port 各加入一筆 Queue，切換 Port 後確認 Queue 不混用。
8. 按「匯出 ZIP」，確認至少包含 `session.log`、`commands.txt` 與有資料 Port 的 raw 檔。

## 安全提醒

Command Library 目前是逆向工程範本，不代表已確認的設備正式命令。MDB `NAK`、EDC `NAK` 或未知找零機指令可能改變設備狀態；第一次測試請斷開เงินจริง、鈔箱與出貨機構。

## 下一階段

Sprint 2：Protocol Decoder Plugin、Packet Timeline、Session Compare。

Sprint 3：Auto Protocol Detection、MDB Reverse Engineering 工作台。

Sprint 4：Note Dispenser 與 EDC Reverse Engineering 工作台、Explorer v1.0 完整版。
