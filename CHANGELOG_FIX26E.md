# V7.8.3.3 FIX26E — LINE Pay Button + Device Activation

- 修正單張票與購物車的 LINE Pay 按鈕受舊付款設定靜默停用，點擊沒有任何畫面。
- LINE Pay 被系統設定關閉時，按鈕會顯示明確操作提示。
- 按 LINE Pay 後先顯示準備畫面並執行後端健康與裝置啟用狀態檢查。
- 尚未啟用的點餐機會直接顯示「啟用裝置」，不必先掃客人的付款碼。
- 已啟用的點餐機才進入18碼付款碼掃描畫面。
- 保留 FIX25 未送出交易可安全解除、數字輸入不被隱藏掃描器攔截的規則。
- 保留 FIX26D Firebase Admin Database SDK 後端修正；本包只更新網頁。
