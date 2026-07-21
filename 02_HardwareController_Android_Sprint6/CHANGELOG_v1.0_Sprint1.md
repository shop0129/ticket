# CHANGELOG · v1.0 Sprint 1

- 將單一 `SerialManager` 重構為 `MultiPortController`。
- 支援 ttyS1、ttyS3、ttyUSB0 同時連線與獨立狀態。
- 新增 `PacketEvent`、`PortProfile`、`ExplorerCommand` 核心模型。
- 新增 Port 隔離的封包統計、Raw 記錄及 TX Queue。
- 新增 Command Library 初始資料。
- 修正 Send All 期間切換 Port 可能造成 Queue 送錯埠的風險。
- 保留 60 秒 TX 自動鎖定與 ZIP 匯出。
- Wrapper Fix：補入官方 Gradle 8.9 `gradle-wrapper.jar`，並將 `gradlew`、`gradlew.bat` 換成同版本完整官方啟動腳本。
