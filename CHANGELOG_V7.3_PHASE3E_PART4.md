# V7.3 Phase 3E Part 4 變更紀錄

## 驗證與工作階段

- 新增 `js/cloud/firebase-role-config.js`：角色驗證開關、帳號 email domain、Functions region、閒置逾時與移轉備援。
- 新增 `js/cloud/firebase-role-auth.js`：Email/Password 登入、Custom Claims 驗證、session restore、匿名 Kiosk 回復與 60 分鐘閒置登出。
- 更新 `js/cloud/auth.js`、`js/modules/roleManager.js`：統一本機／Firebase 身分，保留 Part 3 相容介面。
- `index.html`、`staff.html` 登入流程改為 async Firebase 驗證並載入 Firebase Functions 8.10.1 SDK。

## 跨裝置員工管理

- 新增 `js/cloud/firebase-employee-service.js`。
- 更新 `js/modules/employeeManager.js`：Firebase 雲端模式與 Part 3 裝置模式並存。
- 新增本機員工帳號遷移按鈕與結果摘要。
- 所有雲端員工變更都經 Callable Functions 執行。

## 後端

- 新增 `functions/index.js`：列出、新增、修改、重設密碼、啟停、刪除、遷移員工與登入稽核。
- 新增 `functions/lib/validators.js` 與測試。
- 新增 `functions/scripts/bootstrap-manager.js` 建立第一位 Firebase 店長。
- Runtime 使用 Node.js 20；Functions region 為 `asia-east1`。

## 權限規則

- 更新 `database.rules.json`：以 `auth.token.staff` 與 `auth.token.role` 驗證店長／員工操作。
- 更新 `firestore.rules`：提供相同角色模型，供後續 Firestore 資料遷移使用。
- `staffUsers` 與帳號索引禁止客戶端寫入；員工管理由 Admin SDK 執行。
- auditLogs 只允許員工新增、店長讀取，且禁止客戶端修改既有紀錄。

## 自動測試

- `tests/role-permission.test.js`：Part 3 相容權限。
- `tests/firebase-auth-bridge.test.js`：Firebase claim、profile、登入／登出橋接。
- `tests/firebase-rules-static.test.js`：規則與後端 export 安全基線。
- `functions/test/validators.test.js`：帳號、角色、密碼與索引 key。
