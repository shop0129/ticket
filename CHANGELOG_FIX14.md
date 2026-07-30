# V7.8.3.3 FIX14 Startup Home + Back Guard

日期：2026-07-29

## 修正

- 點餐機開啟後固定從首頁開始，不再停在「請選擇票種」。
- 選擇票種頁按「返回」會直接回首頁。
- 上一筆未投入現金的舊付款，開機時會由 Controller 113 安全取消。
- 新舊 PWA 快取混用時，首頁與返回保護仍由 `index.html` 內建程式接手。
- 新 Service Worker 會在沒有付款交易時自動啟用，避免必須手動按「套用新版」。

## 安全條件

- 只自動取消 Controller 回報 `paidNtd = 0` 的 `QUEUED`、`PAYMENT_PENDING` 或 `CANCEL_REQUESTED` 交易。
- Controller 113 會在取消瞬間再次檢查實際投入金額。
- 若已收任何現金，Controller 會拒絕取消，FIX14 會保留付款畫面與安全鎖。
- 現金交易或 LINE Pay 進行中不會自動重載 Service Worker。

## 保留

- 現金投入金額、票券數量、紙鈔張數、硬幣枚數與面額明細。
- 100／500／1000元紙鈔、自動找零與低價票收百鈔。
- 收據 0～94% 平順進度與實體成功後100%。
- 店長／員工 QR、即時訂單、角色權限與 PWA。
