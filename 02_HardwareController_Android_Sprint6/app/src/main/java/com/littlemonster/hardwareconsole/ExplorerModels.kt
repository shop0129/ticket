package com.littlemonster.hardwareconsole

data class PortProfile(val id: String, val label: String, val path: String, val defaultBaud: Int)

data class PacketEvent(
    val portId: String,
    val direction: Direction,
    val sequence: Long,
    val timestamp: Long,
    val data: ByteArray,
    val deltaMs: Long? = null,
    val responseTo: Long? = null,
    val interpretation: String? = null
) {
    enum class Direction { RX, TX, SYSTEM }
}

data class ExplorerCommand(
    val group: String,
    val name: String,
    val hex: String,
    val description: String,
    val dangerous: Boolean = false
)

object ExplorerDefaults {
    val ports = listOf(
        PortProfile("mdb", "ttyS1 · MDB（硬幣＋收鈔）", "/dev/ttyS1", 9600),
        PortProfile("note", "ttyS3 · 出鈔找零機（唯讀）", "/dev/ttyS3", 9600),
        PortProfile("edc", "ttyUSB0 · EDC", "/dev/ttyUSB0", 9600)
    )

    val commands = listOf(
        ExplorerCommand("紙鈔安全", "Bill Setup", "31", "讀取收鈔面額；收鈔器位於 ttyS1"),
        ExplorerCommand("紙鈔安全", "Bill Poll", "33", "查詢收鈔器狀態"),
        ExplorerCommand("紙鈔安全", "停止收鈔", "34 00 00 00 00", "立即禁止收鈔"),
        ExplorerCommand("MDB 安全", "Coin Setup", "09", "讀取硬幣面額與路由設定"),
        ExplorerCommand("MDB 安全", "Tube Info", "0A", "查詢各面額儲幣筒數量"),
        ExplorerCommand("MDB 安全", "Coin Diagnostic", "0F 05", "查詢硬幣機診斷狀態"),
        ExplorerCommand("MDB 安全", "停止補幣", "0C 00 00 00 00", "立即禁止收幣"),
        ExplorerCommand("MDB 補幣", "啟用補幣", "0C FF FF FF FF", "建議改用上方『開始補幣』，會自動逾時停用"),
        ExplorerCommand("ttyS3 封鎖", "禁止傳送", "", "ttyS3 是出鈔找零機；Sprint 5 全部 TX 封鎖", true),
        ExplorerCommand("EDC", "ENQ", "05", "ASCII ENQ；常用於建立通訊", false),
        ExplorerCommand("EDC", "ACK", "06", "ASCII ACK", false),
        ExplorerCommand("EDC", "NAK", "15", "ASCII NAK", true)
    )
}
