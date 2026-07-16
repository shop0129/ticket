# GitHub Pages 部署修正

本版本已在專案根目錄加入 `.nojekyll`，讓 GitHub Pages 直接部署 HTML / CSS / JavaScript 靜態檔案，不再使用 Jekyll 建置。

## GitHub Pages 設定

1. 到 Repository → Settings → Pages。
2. Source 選擇 `Deploy from a branch`。
3. Branch 選擇 `main`，資料夾選擇 `/(root)`。
4. 按 Save，等待 Pages 重新部署。

## 上傳方式

請把壓縮檔解壓後，將根目錄內所有檔案上傳到儲存庫根目錄。上傳後在 GitHub 檔案列表中必須直接看得到：

- `.nojekyll`
- `index.html`
- `staff.html`
- `css/`
- `js/`
- `images/`

不要只上傳 ZIP，也不要讓 `index.html` 多包在另一層資料夾內。
