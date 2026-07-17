小怪獸售票機 V7.1 資料結構重構版

核心變更：
- 不再使用 venue/state/currentPlayers
- 不再使用 venue/state/activeOrders
- 場內人數直接由 orders 中 playStatus=playing 的訂單即時計算
- 候位數直接由 orders 中 playStatus=waiting 的訂單即時計算
- Staff、場內看板、場外看板全部使用同一份 orders
- 入場容量判斷使用 Firebase 對整個 orders 節點 Transaction
- 兩支手機同時按入場也不會超過容量
- 離場、作廢或重新整理後不會殘留幽靈人數
- 舊 venue/state 會自動搬移 maxPlayers/countGuardians 到 venue/settings 後刪除

Firebase 新架構：
monsterTicket/v1/
├─ orders
└─ venue/
   ├─ settings
   └─ callout
