# Sprint 2 FIX1 · Inventory Truth

- 依 Coin Setup 的 Tube Routing 顯示儲幣筒面額；本機為 NT$1、NT$5、NT$10、NT$50，不再誤列 NT$20。
- 將「本次實收」與「硬幣機 Tube Info 回報」分開統計，Tube Info 的 0 不會覆蓋已收到的硬幣。
- 新增本次實收面額明細，例如 `NT$10×1`。
- 收幣事件明確標示第二資料位元組是硬幣機回報的該筒數量。
- Tube Info 全為 0 時顯示說明，避免誤判成收幣失敗。
- 匯出的 `mdb_summary.txt` 同步加入本次實收明細與庫存資料來源說明。

安全限制維持不變：Reset、出幣、支付及未知 MDB 指令仍封鎖。
