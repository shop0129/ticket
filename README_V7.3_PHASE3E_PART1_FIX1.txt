小怪獸售票機 V7.3 Phase 3E Part 1 Fix 1

修正：
1. applyRolePermissions 初始化 ReferenceError
2. 角色模組中斷後 loginByRole 未建立，造成無法登入
3. 調整 classList.remove 寫法，提高舊版 Android WebView 相容性
4. 更新 script cache version，避免裝置沿用錯誤快取
