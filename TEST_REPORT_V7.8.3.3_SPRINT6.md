# V7.8.3.3 Sprint 6 FIX1 測試報告

測試日期：2026-07-22

## Web／PWA

- 17個 JavaScript 測試檔全部通過。
- 現金交易與按鈕入口：38項 assertion 通過。
- PWA App Shell：235項資源與入口檢查通過。
- 即時訂單：16項通過。
- Role權限：12項通過。
- Service Worker：17項通過。
- 登入Migration：4項通過。
- 票券管理相容：10項通過。
- 票券時間規則：8項通過。
- Enterprise Core、會員同步、票券資料同步、營業模式、贈品規則、售票限制、票券狀態、QR驗票與作廢保護全部通過。
- 全部 js 與 tests JavaScript 檔案通過語法檢查。
- PWA 快取確認包含現金橋接 JavaScript 與 CSS。
- FIX1 確認新版 Service Worker 立即接管、刪除所有同系列舊快取，且非收款狀態自動重載。
- 首頁只保留一個 `V7.8.3.3 S6 FIX1 · ONLINE/OFFLINE` 狀態標籤。

## 現金交易

- 原價與會員點數折抵會在付款開始前凍結。
- 硬體只收點數折抵後的實付整數金額。
- 全額點數折抵時不啟動硬幣機或紙鈔機。
- 相同訂單與出票授權重送不會重複建立訂單。
- 會員消費、點數、統計與出票副作用只執行一次。
- 訂單仍經過 V7.8.3.3 票券驗證與 Firebase 原有同步流程。
- 出票動畫完成後才回覆 Android 控制器已出票。
- PWA 重啟後使用保存的交易 checkpoint 恢復；不確定狀態轉人工處理。
- 按下現金付款只會啟動配對／本機橋接，硬體授權前不建立成功訂單。

## Android／MDB

- Android app、serial、Gradle與工具原始碼和已實機安裝成功的 Sprint 6 版本逐檔一致。
- ProtocolSafetyReplayTest 再次編譯並執行通過。
- 100＋50＋10元付款剛好完成。
- 重複現金事件不重複入帳。
- 自動出票授權只能建立一次，重送沿用同一授權ID。
- 重複出票確認被忽略。
- 部分收款後重啟轉 RECONCILIATION_REQUIRED。
- Reset、Escrow、出幣、Payout、手動任意紙鈔Enable持續封鎖。

## 環境說明

目前環境沒有 Android SDK，所以未重新產生 APK；Android 控制器沒有程式變更，且已由使用者在點餐機成功編譯、安裝並取得配對碼。交付包保留相同完整 Android Studio 專案作備份。
