# Part 3 → Part 4 部署與帳號移轉

這份流程把風險拆成「先建立雲端店長、再部署、再遷移、最後關閉本機備援」四段。不要先清除舊裝置的 localStorage。

## 0. 部署前備份

1. 保留目前 Part 3 完整資料夾與 ZIP。
2. 在 Kiosk 後台執行「資料備份」並保存匯出檔。
3. 記下目前店長與員工帳號；若舊密碼只有 4 碼，先準備一組至少 6 碼的臨時密碼。

## 1. Firebase Console 設定

專案為 `monsterticket`，現有 Realtime Database URL 已寫在 `js/cloud/firebase-config.js`。

1. Firebase Console → Authentication → Sign-in method。
2. 啟用 `Email/Password`。
3. 保持 `Anonymous` 啟用，Kiosk 現有資料同步仍使用匿名登入。
4. 確認專案可部署 Cloud Functions；正式環境建議設定預算通知。

## 2. 安裝 CLI 與 Functions 相依套件

需使用 Node.js 20 與目前版本 Firebase CLI。

```bash
npm install -g firebase-tools
firebase login
firebase use monsterticket
cd functions
npm install
npm test
cd ..
```

若資料夾沒有 `.firebaserc`，可直接在部署命令加上 `--project monsterticket`。

## 3. 建立第一位 Firebase 店長

Cloud Functions 的員工管理只能由已有 `admin` claim 的店長呼叫，因此第一位店長要用 Admin SDK 建立一次。

### macOS / Linux

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/安全路徑/monsterticket-service-account.json"
export FIREBASE_DATABASE_URL="https://monsterticket-default-rtdb.asia-southeast1.firebasedatabase.app"
cd functions
npm run bootstrap-manager -- manager "請換成至少6碼密碼" "店長"
cd ..
```

### Windows PowerShell

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\安全路徑\monsterticket-service-account.json"
$env:FIREBASE_DATABASE_URL="https://monsterticket-default-rtdb.asia-southeast1.firebasedatabase.app"
Set-Location functions
npm run bootstrap-manager -- manager "請換成至少6碼密碼" "店長"
Set-Location ..
```

服務帳戶金鑰只能保存在受控電腦，不可放進本專案、ZIP、網站或 Git。執行成功會顯示 `Bootstrap manager ready`。

## 4. 部署後端與規則

先部署 Functions，再部署規則：

```bash
firebase deploy --only functions --project monsterticket
firebase deploy --only database,firestore --project monsterticket
```

若目前完全沒有使用 Firestore，也可先部署 `functions,database`；`firestore.rules` 是下一階段資料遷移的同角色規則基礎。

之後把本包前端檔案部署到原本 Kiosk／Staff 使用的位置。`index.html` 與 `staff.html` 都已載入 Firebase Functions SDK 與 Part 4 登入模組。

## 5. 登入與遷移舊帳號

1. 重新整理 Kiosk 的 `index.html`。
2. 用第 3 步建立的 Firebase 店長登入。
3. 開啟「員工帳號管理」，畫面應顯示「Firebase 跨裝置帳號」。
4. 點「遷移舊帳號」。
5. 若有 4 碼舊密碼，輸入至少 6 碼的統一臨時密碼。
6. 檢查結果中的新增、略過、失敗筆數；失敗帳號可再由店長手動新增。

遷移採可重複執行設計：同帳號已存在時只會略過，不會覆蓋 Firebase 密碼或角色。

## 6. 跨裝置驗收

至少用 Kiosk 與另一台手機各測一次：

- 店長可登入 Kiosk 與 `staff.html`。
- 一般員工可登入 `staff.html`，但不能作廢訂單或進入員工管理。
- 店長新增一個測試員工後，另一台裝置立即可登入。
- 停用測試員工後，重新登入必須被拒絕。
- 修改角色或密碼後，舊 token 已撤銷；最晚在重新驗證／重登時套用新權限。
- 系統至少保留一位啟用店長，不能停用或刪除目前登入者。
- 店長可查看操作紀錄，且記錄包含 Firebase 使用者 UID 與姓名。

## 7. 關閉本機登入備援

所有帳號完成驗收後，編輯：

```js
// js/cloud/firebase-role-config.js
allowLocalFallback: false
```

重新部署前端並清除各舊裝置的網站快取。確認一週內沒有遷移問題後，再依營運流程清理 Part 3 的 localStorage 員工帳號。

## 回復方式

若部署後無法登入：

1. 不要刪除 Firebase Auth 使用者或 Realtime Database 資料。
2. 暫時放回 Part 3 前端檔案，原本本機帳號仍可使用。
3. 檢查 Authentication provider、Functions 部署區域 `asia-east1`、店長 Custom Claims 與 `staffUsers/{uid}` profile。
4. 修復後重新部署 Part 4；遷移可安全重跑。
