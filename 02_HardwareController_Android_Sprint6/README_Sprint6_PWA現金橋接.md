# Monster Hardware Explorer v1.0 Sprint 6

## 新增

- 啟動只監聽 `127.0.0.1:8765` 的前景本機服務。
- 每台安裝自動產生8位數配對碼，顯示在主畫面上方。
- PWA可建立現金訂單、查詢已付／尚差／狀態並確認出票。
- HTTP請求必須帶配對碼；所有回應禁止快取並支援PWA Private Network預檢。
- PWA訂單使用既有 `TicketOrderCoordinator`，不新增任何MDB直通指令。
- 付款授權完成或取消後，控制器回到背景並返回售票畫面。

## 使用

1. 關閉原廠 Lite QC Tool。
2. 用 Android Studio 開啟本資料夾並安裝。
3. 開啟 App，連線 `ttyS1 · MDB（硬幣＋收鈔）／9600`。
4. 記下綠色區塊的8位配對碼。
5. 回到新版小怪獸售票機，第一次按現金付款時輸入該配對碼。

## 安全限制

找零、出幣、出鈔、Reset、Escrow、ttyS3 TX及未知MDB指令均維持封鎖。
