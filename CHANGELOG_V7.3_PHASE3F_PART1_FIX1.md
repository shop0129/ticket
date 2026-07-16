# V7.3 Phase 3F Part 1 Fix 1

- `js/cloud/cloud-order-sync.js`
  - 全節點 `set(map)` 改為欄位級 multi-location `update()`。
  - 新訂單快速上傳、同步事件與最後同步時間。
- `js/staff/order-center.js`
  - 等待 Firebase Auth currentUser 後才開始監聽。
  - 加入 auth state observer、錯誤狀態、真正雲端刷新與同步資訊。
- `js/cloud/cloud-dashboard-sync.js`
  - Dashboard 更新延遲縮短至 80ms。
- `service-worker.js`
  - Fix1 新 cache，程式檔連線時改為 network-first。
- `staff.html`、`css/staff.css`
  - 新增訂單即時同步時間與筆數狀態列。
- 新增 `tests/realtime-order-fix.test.js`。
