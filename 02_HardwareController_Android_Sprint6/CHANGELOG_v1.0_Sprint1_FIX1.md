# CHANGELOG · v1.0 Sprint 1 FIX1 Performance

## 修正

- 修正高頻 RX 約數分鐘後畫面停住或像當機的問題。
- Serial Reader 不再對每個封包呼叫 `runOnUiThread`。
- UI 改為每 500ms 批次更新，最高約 2 FPS。
- Raw RX/TX 與完整 CSV Session Log 改由 `SessionRecorder` 緩衝寫入。
- 記憶體畫面事件上限降為 2,000；完整資料仍持續寫入檔案。
- 畫面只呈現最近 100 個折疊群組。
- 連續相同封包顯示為 `REPEATED×次數`。
- 暫停顯示時 RX、計數、Raw 與 Session Log 繼續運作。
- ZIP 壓縮移至背景執行緒，避免匯出時畫面卡住。
- 統計區新增 Last RX 時間與 UI 更新頻率。

## 實測目標

ttyS1 在約 181ms 一包的持續輸入下，至少連續運行 30 分鐘，畫面仍可切換、暫停及恢復。
