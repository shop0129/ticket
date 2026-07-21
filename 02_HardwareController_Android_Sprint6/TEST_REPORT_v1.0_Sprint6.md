# TEST REPORT · v1.0 Sprint 6

## 已通過

- Android Kotlin全專案編譯。
- Android XML資源與Manifest處理。
- 本機前景Service、通知、配對碼與loopback Server納入編譯。
- PWA付款交易14項防重複測試。
- PWA App Shell 201項資產檢查。
- 即時訂單16項、Role權限12項、Service Worker 17項與登入Migration 4項測試。
- MDB／紙鈔／現金付款／訂單出票完整協議回放。
- Reset、出幣、支付、Escrow、手動紙鈔Enable及ttyS3 TX持續封鎖。

## 編譯環境說明

目前容器完成 Kotlin、Android資源與Manifest編譯；完整APK封裝需要 Android Studio 安裝 NDK `27.0.12077973` 與專案Gradle依賴。交付包保留完整 CMake／JNI 原始碼，未以缺少 native serial 的測試APK代替。
