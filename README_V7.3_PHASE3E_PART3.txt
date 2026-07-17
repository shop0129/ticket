小怪獸售票機 V7.3 Phase 3E Part 3（Simple Login 更新版）
Role Permission／操作人紀錄

Simple Login 更新：預設員工帳號已由 staff01 改為 staff，不採用 Part 4 Firebase 員工驗證。

本更新包已完整包含 Part 1、Part 2，請整包覆蓋舊專案。

本次完成：
1. 新增 js/cloud/auth.js，統一 Kiosk 後台與 staff.html 的登入、角色與操作人介面。
2. staff.html 改成「帳號＋密碼」登入，顯示實際員工姓名與角色。
3. 訂單新增 createdBy、operatorId、operatorName、operatorRole、source。
4. 入場、離場、候位、作廢、補印、玩具轉點等操作記錄實際員工姓名。
5. 新增本機與 Firebase auditLogs 操作紀錄，店長 Dashboard 可直接查看「操作紀錄」。
6. 員工在函式層禁止作廢訂單、刪除會員、修改容量、票券、營業模式、系統設定、備份、清除資料及員工管理。
7. 店長保留完整權限。
8. 修正 Part 2 修改員工後成功訊息錯誤。
9. 版本標籤更新為 V7.3 Phase 3E Part 3。
10. 加入 database.rules.json、firestore.rules 與 firebase.json。

預設帳號：
店長 manager／1234
員工 staff／0000

重要說明：
- Part 3 的多員工帳號仍儲存在裝置 localStorage，與同一瀏覽器來源下的 index.html、staff.html 共用。
- 本 Simple Login 版刻意維持裝置本機帳號，不進行 Firebase Auth／Custom Claims 跨裝置同步。
- 現行正式資料使用 Firebase Realtime Database；firestore.rules 是下一階段遷移與角色 Claims 的安全規則基礎。
- 本版不需要部署 Part 4 Functions 或角色 Security Rules。

測試：
node tests/role-permission.test.js
