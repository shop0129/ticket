package com.littlemonster.hardwareconsole

import java.math.BigDecimal
import java.math.RoundingMode

object MdbCommands {
    val BILL_SETUP = byteArrayOf(0x31)
    val BILL_POLL = byteArrayOf(0x33)
    val BILL_DISABLE = byteArrayOf(0x34, 0x00, 0x00, 0x00, 0x00)
    val COIN_SETUP = byteArrayOf(0x09)
    val COIN_TUBE_INFO = byteArrayOf(0x0A)
    val COIN_POLL = byteArrayOf(0x0B)
    val COIN_ENABLE_FILL = byteArrayOf(0x0C, 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte())
    val COIN_DISABLE = byteArrayOf(0x0C, 0x00, 0x00, 0x00, 0x00)
    val COIN_IDENTITY = byteArrayOf(0x0F, 0x00)
    val COIN_DIAGNOSTIC = byteArrayOf(0x0F, 0x05)
    val COIN_MANUAL_FILL_REPORT = byteArrayOf(0x0F, 0x06)

    fun coinEnableTypes(typeIndices: Set<Int>): ByteArray {
        require(typeIndices.all { it in 0..15 }) { "硬幣類型必須介於 0..15" }
        val mask = typeIndices.fold(0) { result, index -> result or (1 shl index) }
        // The last two bytes control manual dispense. Payment mode always keeps them disabled.
        return byteArrayOf(0x0C, (mask ushr 8).toByte(), mask.toByte(), 0x00, 0x00)
    }

    fun billEnableSingleType(typeIndex: Int): ByteArray {
        require(typeIndex in 0..15) { "紙鈔類型必須介於 0..15" }
        val mask = 1 shl typeIndex
        return byteArrayOf(0x34, (mask ushr 8).toByte(), mask.toByte(), 0x00, 0x00)
    }
}

data class MdbSafetyDecision(val allowed: Boolean, val message: String)

/** Default-deny policy for hand-entered MDB data. Dedicated buttons use the same safe allow-list. */
object MdbSafetyPolicy {
    private val safeCommands = listOf(
        MdbCommands.BILL_SETUP to "Bill Setup",
        MdbCommands.BILL_POLL to "Bill Poll",
        MdbCommands.BILL_DISABLE to "停止收鈔",
        MdbCommands.COIN_SETUP to "Coin Setup",
        MdbCommands.COIN_TUBE_INFO to "Tube Info",
        MdbCommands.COIN_POLL to "Coin Poll",
        MdbCommands.COIN_ENABLE_FILL to "啟用補幣",
        MdbCommands.COIN_DISABLE to "停止補幣",
        MdbCommands.COIN_IDENTITY to "Coin Identity",
        MdbCommands.COIN_DIAGNOSTIC to "Diagnostic",
        MdbCommands.COIN_MANUAL_FILL_REPORT to "Manual Fill Report"
    )

    fun validate(command: ByteArray): MdbSafetyDecision {
        safeCommands.firstOrNull { it.first.contentEquals(command) }?.let {
            return MdbSafetyDecision(true, it.second)
        }
        val blocked = when {
            command.firstOrNull() == 0x30.toByte() -> "30 是紙鈔機 Reset"
            command.firstOrNull() == 0x34.toByte() -> "紙鈔 Enable 只能由專用安全流程產生"
            command.firstOrNull() == 0x35.toByte() -> "35 會控制 Escrow 收下或退回紙鈔"
            command.firstOrNull() == 0x36.toByte() -> "36 Stacker 指令尚未開放"
            command.firstOrNull() == 0x37.toByte() -> "37 Identity 指令尚未開放"
            command.firstOrNull() == 0x08.toByte() -> "Reset 可能重置硬幣機"
            command.firstOrNull() == 0x0D.toByte() -> "0D 是出幣指令"
            command.size >= 2 && command[0] == 0x0F.toByte() && command[1] == 0x02.toByte() -> "0F 02 是支付／出幣指令"
            else -> "未知 MDB 指令不在安全白名單"
        }
        return MdbSafetyDecision(false, blocked)
    }

    /** Only the dedicated UI may enable one bill type, with escrow disabled. */
    fun validateSingleBillEnable(command: ByteArray, expectedTypeIndex: Int): MdbSafetyDecision {
        if (expectedTypeIndex !in 0..15) return MdbSafetyDecision(false, "紙鈔類型超出安全範圍")
        val expected = MdbCommands.billEnableSingleType(expectedTypeIndex)
        return if (command.contentEquals(expected)) {
            MdbSafetyDecision(true, "只啟用紙鈔類型#$expectedTypeIndex（Escrow 關閉）")
        } else {
            MdbSafetyDecision(false, "紙鈔 Enable 不是單一面額或包含 Escrow")
        }
    }

    /** Dedicated cash-payment flow only: exact acceptance mask, manual dispense always disabled. */
    fun validateCoinPaymentEnable(command: ByteArray, expectedTypeIndices: Set<Int>): MdbSafetyDecision {
        if (expectedTypeIndices.any { it !in 0..15 }) return MdbSafetyDecision(false, "硬幣類型超出安全範圍")
        val expected = MdbCommands.coinEnableTypes(expectedTypeIndices)
        return if (command.contentEquals(expected)) {
            MdbSafetyDecision(true, "付款硬幣遮罩=${expectedTypeIndices.sorted()}（手動出幣關閉）")
        } else {
            MdbSafetyDecision(false, "硬幣 Enable 遮罩不符或開啟手動出幣")
        }
    }
}

enum class CoinRoute { TUBE, OVERFLOW }

data class CoinSetup(
    val countryCode: Int,
    val scalingFactor: Int,
    val decimalPlaces: Int,
    val denominations: List<BigDecimal?>,
    val tubeRouting: List<Boolean>
)

data class CoinTubeStatus(val fullFlags: Int, val counts: List<Int>)

data class CoinAccepted(
    val typeIndex: Int,
    val denomination: BigDecimal?,
    val route: CoinRoute,
    val reportedCount: Int
)

data class BillSetup(
    val countryCode: Int,
    val scalingFactor: Int,
    val decimalPlaces: Int,
    val stackerCapacity: Int,
    val escrowSupported: Boolean,
    val denominations: List<BigDecimal?>
)

enum class BillRoute { STACKED, REJECTED, HELD_IN_ESCROW, RETURNED_FROM_ESCROW }

data class BillEvent(
    val typeIndex: Int,
    val denomination: BigDecimal?,
    val route: BillRoute
)

data class MdbDecodedMessage(
    val description: String,
    val important: Boolean = false,
    val setup: CoinSetup? = null,
    val tubeStatus: CoinTubeStatus? = null,
    val accepted: CoinAccepted? = null,
    val billSetup: BillSetup? = null,
    val billEvent: BillEvent? = null
)

/** Decodes the ASCII HEX + CRLF stream emitted by the Lite MDB serial service. */
class MdbLineDecoder {
    private val lineBuffer = StringBuilder()
    private var expectSetupUntil = 0L
    private var expectTubeUntil = 0L
    private var expectBillSetupUntil = 0L
    var coinSetup: CoinSetup? = null
        private set
    var tubeStatus: CoinTubeStatus? = null
        private set
    var billSetup: BillSetup? = null
        private set

    @Synchronized
    fun expectSetup() { expectSetupUntil = System.currentTimeMillis() + RESPONSE_WINDOW_MS }

    @Synchronized
    fun expectTubeInfo() { expectTubeUntil = System.currentTimeMillis() + RESPONSE_WINDOW_MS }

    @Synchronized
    fun expectBillSetup() { expectBillSetupUntil = System.currentTimeMillis() + BILL_RESPONSE_WINDOW_MS }

    @Synchronized
    fun feed(data: ByteArray): List<MdbDecodedMessage> {
        val decoded = ArrayList<MdbDecodedMessage>()
        data.forEach { raw ->
            val value = raw.toInt() and 0xFF
            when (value) {
                0x0A -> {
                    val line = lineBuffer.toString().trim()
                    lineBuffer.setLength(0)
                    if (line.isNotEmpty()) decoded.add(decodeLine(line))
                }
                0x0D -> Unit
                in 0x20..0x7E -> {
                    if (lineBuffer.length < MAX_LINE_LENGTH) lineBuffer.append(value.toChar())
                    else lineBuffer.setLength(0)
                }
                else -> Unit
            }
        }
        return decoded
    }

    private fun decodeLine(line: String): MdbDecodedMessage {
        val tokens = line.split(Regex("\\s+")).mapNotNull {
            if (it.length == 2) it.toIntOrNull(16) else null
        }
        if (tokens.isEmpty() || tokens.size != line.split(Regex("\\s+")).size) {
            return MdbDecodedMessage("非 MDB HEX 行：$line")
        }

        val now = System.currentTimeMillis()
        if (now <= expectSetupUntil && tokens.size == 24) {
            expectSetupUntil = 0L
            return decodeSetup(tokens)
        }
        if (now <= expectTubeUntil && tokens.size == 19) {
            expectTubeUntil = 0L
            return decodeTube(tokens)
        }
        if (now <= expectBillSetupUntil && tokens.size == 28) {
            expectBillSetupUntil = 0L
            return decodeBillSetup(tokens)
        }

        if (tokens.size >= 2 && tokens[0] == 0x30) {
            return decodeBillEvent(tokens[1])
        }

        if (tokens.size >= 2 && tokens[0] == 0x08) {
            val code = tokens[1]
            val route = when (code and 0xF0) {
                0x40 -> CoinRoute.OVERFLOW
                0x50 -> CoinRoute.TUBE
                else -> null
            }
            if (route != null) {
                val type = code and 0x0F
                val denomination = coinSetup?.denominations?.getOrNull(type)
                val count = tokens.getOrElse(2) { 0 }
                val routeText = if (route == CoinRoute.TUBE) "儲幣筒" else "溢幣箱"
                val money = denomination?.let { "NT$${it.money()}" } ?: "類型#$type"
                return MdbDecodedMessage(
                    description = "收幣 $money → $routeText（硬幣機回報該筒數量 $count）",
                    important = true,
                    accepted = CoinAccepted(type, denomination, route, count)
                )
            }
            val status = COIN_STATUS[code] ?: "未知狀態 0x${code.hex2()}"
            return MdbDecodedMessage("硬幣機：$status", important = code != 0x00)
        }

        return MdbDecodedMessage("MDB 回覆：${tokens.joinToString(" ") { it.hex2() }}")
    }

    private fun decodeSetup(data: List<Int>): MdbDecodedMessage {
        if (!checksumValid(data)) return MdbDecodedMessage("Coin Setup 校驗失敗", important = true)
        val factor = data[3]
        val decimalPlaces = data[4].coerceAtMost(6)
        val divisor = BigDecimal.TEN.pow(decimalPlaces)
        val denominations = (7..22).map { index ->
            data[index].takeIf { it != 0 }?.let { raw ->
                BigDecimal(raw * factor).divide(divisor, decimalPlaces, RoundingMode.UNNECESSARY).stripTrailingZeros()
            }
        }
        val routingBits = (data[5] shl 8) or data[6]
        val setup = CoinSetup(
            countryCode = (data[1] shl 8) or data[2],
            scalingFactor = factor,
            decimalPlaces = decimalPlaces,
            denominations = denominations,
            tubeRouting = (0 until 16).map { routingBits and (1 shl it) != 0 }
        )
        coinSetup = setup
        val values = denominations.mapIndexedNotNull { index, value -> value?.let { "#$index=NT$${it.money()}" } }
        return MdbDecodedMessage("Coin Setup 成功：${values.joinToString("、")}", important = true, setup = setup)
    }

    private fun decodeTube(data: List<Int>): MdbDecodedMessage {
        if (!checksumValid(data)) return MdbDecodedMessage("Tube Info 校驗失敗", important = true)
        val status = CoinTubeStatus((data[0] shl 8) or data[1], data.subList(2, 18))
        tubeStatus = status
        val setup = coinSetup
        val values = status.counts.mapIndexedNotNull { index, count ->
            setup?.denominations?.getOrNull(index)?.takeIf {
                setup.tubeRouting.getOrElse(index) { false }
            }?.let { value -> "NT$${value.money()}=$count" }
        }
        val summary = if (values.isEmpty()) status.counts.joinToString(prefix = "類型數量 ") else values.joinToString("、")
        val zeroNote = if (values.isNotEmpty() && values.all { it.endsWith("=0") }) {
            "（裝置全部回報 0；不代表本次沒有收幣）"
        } else ""
        return MdbDecodedMessage("硬幣機 Tube Info：$summary$zeroNote", important = true, tubeStatus = status)
    }

    private fun decodeBillSetup(data: List<Int>): MdbDecodedMessage {
        if (!checksumValid(data)) return MdbDecodedMessage("Bill Setup 校驗失敗", important = true)
        val factor = (data[3] shl 8) or data[4]
        val decimalPlaces = data[5].coerceAtMost(6)
        val divisor = BigDecimal.TEN.pow(decimalPlaces)
        val denominations = (11..26).map { index ->
            data[index].takeIf { it != 0 }?.let { raw ->
                BigDecimal(raw * factor)
                    .divide(divisor, decimalPlaces, RoundingMode.UNNECESSARY)
                    .stripTrailingZeros()
            }
        }
        val setup = BillSetup(
            countryCode = (data[1] shl 8) or data[2],
            scalingFactor = factor,
            decimalPlaces = decimalPlaces,
            stackerCapacity = (data[6] shl 8) or data[7],
            escrowSupported = data[10] == 0xFF,
            denominations = denominations
        )
        billSetup = setup
        val values = denominations.mapIndexedNotNull { index, value ->
            value?.let { "#$index=NT$${it.money()}" }
        }
        return MdbDecodedMessage(
            description = "Bill Setup 成功：${values.joinToString("、")}",
            important = true,
            billSetup = setup
        )
    }

    private fun decodeBillEvent(code: Int): MdbDecodedMessage {
        val route = when (code and 0xF0) {
            0x80 -> BillRoute.STACKED
            0x90 -> BillRoute.HELD_IN_ESCROW
            0xA0 -> BillRoute.RETURNED_FROM_ESCROW
            0xC0 -> BillRoute.REJECTED
            else -> null
        }
        if (route != null) {
            val type = code and 0x0F
            val denomination = billSetup?.denominations?.getOrNull(type)
            val money = denomination?.let { "NT$${it.money()}" } ?: "類型#$type"
            val routeText = when (route) {
                BillRoute.STACKED -> "已收下並進入鈔箱"
                BillRoute.REJECTED -> "被拒收"
                BillRoute.HELD_IN_ESCROW -> "停在 Escrow"
                BillRoute.RETURNED_FROM_ESCROW -> "已退回"
            }
            return MdbDecodedMessage(
                description = "紙鈔 $money → $routeText",
                important = true,
                billEvent = BillEvent(type, denomination, route)
            )
        }
        val status = BILL_STATUS[code] ?: "未知狀態 0x${code.hex2()}"
        val important = code !in setOf(0x00, 0x03, 0x09)
        val suffix = if (code == 0x09) "（正常待機）" else ""
        return MdbDecodedMessage("紙鈔機：$status$suffix", important = important)
    }

    private fun checksumValid(data: List<Int>): Boolean =
        data.size >= 2 && data.dropLast(1).sum().and(0xFF) == data.last()

    companion object {
        private const val MAX_LINE_LENGTH = 512
        private const val RESPONSE_WINDOW_MS = 3_000L
        private const val BILL_RESPONSE_WINDOW_MS = 5_000L
        private val BILL_STATUS = mapOf(
            0x00 to "ACK／無事件",
            0x01 to "馬達異常",
            0x02 to "感測器異常",
            0x03 to "辨識器忙碌",
            0x04 to "ROM 校驗錯誤",
            0x05 to "紙鈔卡住",
            0x06 to "辨識器剛重置",
            0x07 to "紙鈔被取走",
            0x08 to "鈔箱位置異常",
            0x09 to "已停用",
            0x0A to "Escrow 請求無效",
            0x0B to "紙鈔被拒收",
            0x14 to "無法辨識紙鈔"
        )
        private val COIN_STATUS = mapOf(
            0x00 to "ACK／無事件",
            0x01 to "Escrow request",
            0x02 to "出幣忙碌",
            0x03 to "無信用額度",
            0x04 to "儲幣筒感測器異常",
            0x05 to "同時投入兩枚硬幣",
            0x06 to "投幣器未連接",
            0x07 to "儲幣筒卡幣",
            0x08 to "ROM 校驗錯誤",
            0x09 to "硬幣路徑錯誤",
            0x0A to "硬幣機忙碌",
            0x0B to "硬幣被拒收",
            0x0C to "疑似代幣／異物",
            0x0D to "可能移除信用額度"
        )
    }
}

fun BigDecimal.money(): String = stripTrailingZeros().toPlainString()

private fun Int.hex2(): String = toString(16).uppercase().padStart(2, '0')
