# MonsterHardwareSDK v0.5

- TX 解鎖 60 秒後自動上鎖
- Queue 全部傳送改為 250ms 節流，不再瞬間連續寫入
- 傳送全部前顯示二次確認
- TX History 最多保留 20 筆唯一指令，可選取重送
- RX 在 TX 後 1500ms 內收到時標記 RESPONSE→TX #n
- Session log 標題與版本更新
- 保留 v0.4 封包折疊、篩選、RAW BIN 與 ZIP 匯出
