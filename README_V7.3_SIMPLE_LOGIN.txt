小怪獸售票機 V7.3 Simple Login

這是依照 Part 3 製作的簡單登入版，不需要啟用 Firebase Email/Password、不需要 Cloud Functions、不需要服務帳戶金鑰，也不需要執行指令部署角色系統。

預設登入
店長
帳號：manager
密碼：1234

員工
帳號：staff
密碼：0000

使用方式
1. 備份目前售票機資料與舊專案。
2. 將本包整包更新至原本前端位置。
3. 重新整理 index.html 與 staff.html。
4. 店長從 index.html 登入；員工從 staff.html 登入。

保留功能
- 店長與員工權限分流。
- 員工不可作廢訂單、刪除會員、修改系統設定或管理員工。
- 操作紀錄保存實際登入的姓名與角色。
- 店長仍可在員工帳號管理頁新增其他本機帳號。
- 原本的訂單、會員、票券 Firebase Realtime Database 同步不受影響。

舊帳號相容
- 如果裝置已經存在預設 staff01 帳號，本版第一次讀取時會自動改為 staff。
- 原密碼、帳號 id 與操作紀錄關聯會保留。
- 所有員工帳號只保存在各裝置瀏覽器的 localStorage，不會跨手機同步。

重要提醒
- 若換手機、清除瀏覽器資料或更換網址來源，本機員工帳號需要重新建立。
- 正式營運後建議由店長登入「員工帳號管理」修改預設密碼。
- 本版不需要使用 Part 4 的 MIGRATION_GUIDE，也不需要部署 functions 或 Custom Claims。

測試
node tests/role-permission.test.js
node tests/simple-login-migration.test.js
