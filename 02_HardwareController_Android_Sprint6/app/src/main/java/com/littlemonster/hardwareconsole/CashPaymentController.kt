package com.littlemonster.hardwareconsole

import java.math.BigDecimal

enum class CashPaymentStatus {
    IDLE,
    PREPARING,
    ACCEPTING,
    COMPLETED,
    CANCELED,
    TIMED_OUT,
    ERROR
}

enum class CashKind { COIN, BILL }

data class CashPaymentSnapshot(
    val status: CashPaymentStatus,
    val target: Int,
    val paid: Int,
    val coinCount: Long,
    val billCount: Long,
    val counts: Map<Int, Long>,
    val message: String,
    val startedAt: Long?,
    val finishedAt: Long?
) {
    val remaining: Int get() = (target - paid).coerceAtLeast(0)
    val overpaid: Int get() = (paid - target).coerceAtLeast(0)
    val isActive: Boolean get() = status == CashPaymentStatus.PREPARING || status == CashPaymentStatus.ACCEPTING
    val requiresReconciliation: Boolean
        get() = paid > 0 && status in setOf(CashPaymentStatus.CANCELED, CashPaymentStatus.TIMED_OUT, CashPaymentStatus.ERROR)
}

data class CashAcceptanceResult(
    val recorded: Boolean,
    val snapshot: CashPaymentSnapshot
)

/** Pure, synchronized state machine. Hardware enable/disable is deliberately kept in MainActivity. */
class CashPaymentController {
    private var status = CashPaymentStatus.IDLE
    private var target = 0
    private var paid = 0
    private var coinCount = 0L
    private var billCount = 0L
    private val counts = linkedMapOf<Int, Long>()
    private var message = "尚未開始付款"
    private var startedAt: Long? = null
    private var finishedAt: Long? = null

    @Synchronized
    fun start(amount: BigDecimal, now: Long = System.currentTimeMillis()): CashPaymentSnapshot {
        val integerAmount = amount.toIntegerNtd()
        require(integerAmount in 1..MAX_PAYMENT_NTD) { "應付金額必須是1～${MAX_PAYMENT_NTD}元的整數" }
        check(!snapshot().requiresReconciliation) { "上一筆已收現金尚未人工處理" }
        target = integerAmount
        paid = 0
        coinCount = 0L
        billCount = 0L
        counts.clear()
        status = CashPaymentStatus.PREPARING
        message = "正在讀取硬幣機與紙鈔機設定"
        startedAt = now
        finishedAt = null
        return snapshot()
    }

    @Synchronized
    fun markReady(): CashPaymentSnapshot {
        check(status == CashPaymentStatus.PREPARING) { "付款不在準備狀態" }
        status = CashPaymentStatus.ACCEPTING
        message = "現金入口已依尚差金額安全啟用"
        return snapshot()
    }

    @Synchronized
    fun accept(kind: CashKind, denomination: BigDecimal, now: Long = System.currentTimeMillis()): CashAcceptanceResult {
        if (status != CashPaymentStatus.PREPARING && status != CashPaymentStatus.ACCEPTING) {
            return CashAcceptanceResult(false, snapshot())
        }
        val value = denomination.toIntegerNtd()
        require(value > 0) { "現金面額必須大於0" }
        paid += value
        counts[value] = (counts[value] ?: 0L) + 1L
        if (kind == CashKind.COIN) coinCount++ else billCount++
        when {
            paid == target -> {
                status = CashPaymentStatus.COMPLETED
                message = "付款完成"
                finishedAt = now
            }
            paid > target -> {
                status = CashPaymentStatus.ERROR
                message = "已超收${paid - target}元，必須人工處理"
                finishedAt = now
            }
            else -> message = "已收${paid}元，尚差${target - paid}元"
        }
        return CashAcceptanceResult(true, snapshot())
    }

    @Synchronized
    fun cancel(reason: String, now: Long = System.currentTimeMillis()): CashPaymentSnapshot {
        if (status == CashPaymentStatus.PREPARING || status == CashPaymentStatus.ACCEPTING) {
            status = CashPaymentStatus.CANCELED
            message = if (paid > 0) "$reason；已收${paid}元，請人工退款或記帳" else reason
            finishedAt = now
        }
        return snapshot()
    }

    @Synchronized
    fun timeout(now: Long = System.currentTimeMillis()): CashPaymentSnapshot {
        if (status == CashPaymentStatus.PREPARING || status == CashPaymentStatus.ACCEPTING) {
            status = CashPaymentStatus.TIMED_OUT
            message = if (paid > 0) "付款逾時；已收${paid}元，請人工退款或記帳" else "付款逾時，未收到現金"
            finishedAt = now
        }
        return snapshot()
    }

    @Synchronized
    fun fail(reason: String, now: Long = System.currentTimeMillis()): CashPaymentSnapshot {
        if (status == CashPaymentStatus.PREPARING || status == CashPaymentStatus.ACCEPTING) {
            status = CashPaymentStatus.ERROR
            message = if (paid > 0) "$reason；已收${paid}元，請人工處理" else reason
            finishedAt = now
        }
        return snapshot()
    }

    @Synchronized
    fun acknowledgeReconciliation(): CashPaymentSnapshot {
        check(snapshot().requiresReconciliation) { "目前沒有待人工處理的款項" }
        status = CashPaymentStatus.IDLE
        target = 0
        paid = 0
        coinCount = 0L
        billCount = 0L
        counts.clear()
        message = "已確認人工處理，可開始下一筆"
        startedAt = null
        finishedAt = null
        return snapshot()
    }

    @Synchronized
    fun snapshot(): CashPaymentSnapshot = CashPaymentSnapshot(
        status = status,
        target = target,
        paid = paid,
        coinCount = coinCount,
        billCount = billCount,
        counts = counts.toMap(),
        message = message,
        startedAt = startedAt,
        finishedAt = finishedAt
    )

    companion object {
        const val MAX_PAYMENT_NTD = 9_999
    }
}

object PaymentAcceptancePolicy {
    private val testedCoinValues = setOf(1, 5, 10, 50)
    private const val TESTED_BILL_VALUE = 100

    fun safeCoinTypeIndices(setup: CoinSetup, remaining: Int): Set<Int> =
        setup.denominations.mapIndexedNotNull { index, denomination ->
            val value = denomination?.toIntegerNtdOrNull() ?: return@mapIndexedNotNull null
            index.takeIf {
                value in testedCoinValues && value <= remaining && setup.tubeRouting.getOrElse(index) { false }
            }
        }.toSet()

    fun safeHundredBillTypeIndex(setup: BillSetup, remaining: Int): Int? {
        if (remaining < TESTED_BILL_VALUE) return null
        return setup.denominations.indexOfFirst { it?.toIntegerNtdOrNull() == TESTED_BILL_VALUE }
            .takeIf { it in 0..15 }
    }

    fun labels(setup: CoinSetup, indices: Set<Int>): List<String> = indices.mapNotNull { index ->
        setup.denominations.getOrNull(index)?.toIntegerNtdOrNull()?.let { "${it}元" }
    }.distinct().sortedBy { it.removeSuffix("元").toInt() }
}

private fun BigDecimal.toIntegerNtd(): Int = try {
    stripTrailingZeros().intValueExact()
} catch (_: ArithmeticException) {
    throw IllegalArgumentException("金額必須是整數")
}

private fun BigDecimal.toIntegerNtdOrNull(): Int? = try {
    stripTrailingZeros().intValueExact()
} catch (_: ArithmeticException) {
    null
}
