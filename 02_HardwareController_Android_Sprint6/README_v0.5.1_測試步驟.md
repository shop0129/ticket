# v0.5.1 測試

1. 連線 `/dev/ttyS1 @ 9600`。
2. 等待 RX 計數增加。
3. 按「匯出 ZIP」。
4. 應出現 Android 分享選單，不應再出現 `Failed to find configured root`。
5. 選擇可儲存/分享 ZIP 的應用程式。
6. ZIP 內應包含 `session.log`、`rx_raw.bin`；有送 TX 時也會包含 `tx_raw.bin`。
