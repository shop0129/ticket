// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 4
// Firebase Role Authentication 設定
// =========================================
window.MONSTER_ROLE_CONFIG = {
    enabled: true,
    preferFirebase: true,

    // 升級過渡期保留 Part 3 裝置帳號。
    // 完成 MIGRATION_GUIDE 的帳號遷移後改為 false。
    allowLocalFallback: true,

    staffEmailDomain: "staff.monsterticket.app",
    functionsRegion: "asia-east1",
    firebaseRoot: "monsterTicket/v1",

    // 60 分鐘沒有操作，自動登出員工／店長帳號。
    sessionIdleMinutes: 60
};
