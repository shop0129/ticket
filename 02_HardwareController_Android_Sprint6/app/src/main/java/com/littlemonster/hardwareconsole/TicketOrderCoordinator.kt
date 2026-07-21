package com.littlemonster.hardwareconsole

import java.math.BigDecimal
import java.util.UUID

enum class TicketOrderStatus {
    PAYMENT_PENDING,
    PAID_WAITING_DISPATCH,
    PRINT_AUTHORIZED,
    TICKET_ISSUED,
    CANCELED,
    RECONCILIATION_REQUIRED
}

data class TicketOrderRecord(
    val orderId: String,
    val ticketAppPackage: String?,
    val amount: Int,
    val paid: Int,
    val coinCount: Long,
    val billCount: Long,
    val counts: Map<Int, Long>,
    val processedCashEventIds: List<String>,
    val status: TicketOrderStatus,
    val paymentId: String?,
    val printAuthorizationId: String?,
    val dispatchCount: Int,
    val message: String,
    val createdAt: Long,
    val paidAt: Long?,
    val lastDispatchAt: Long?,
    val issuedAt: Long?,
    val finishedAt: Long?,
    val revision: Long
) {
    val remaining: Int get() = (amount - paid).coerceAtLeast(0)
    val overpaid: Int get() = (paid - amount).coerceAtLeast(0)
    val requiresReconciliation: Boolean get() = status == TicketOrderStatus.RECONCILIATION_REQUIRED
    val isTerminal: Boolean get() = status == TicketOrderStatus.TICKET_ISSUED || status == TicketOrderStatus.CANCELED
}

data class OrderStartResult(val created: Boolean, val record: TicketOrderRecord)

data class TicketCashRecordResult(
    val recorded: Boolean,
    val duplicate: Boolean,
    val record: TicketOrderRecord
)

data class PrintAuthorization(
    val orderId: String,
    val ticketAppPackage: String?,
    val amount: Int,
    val paymentId: String,
    val authorizationId: String,
    val paidAt: Long,
    val dispatchAttempt: Int
)

data class TicketIssuedResult(
    val accepted: Boolean,
    val duplicate: Boolean,
    val record: TicketOrderRecord?
)

/**
 * Durable ticket-order state machine. Serial I/O and Android persistence stay outside this class.
 * Cash events are keyed by a stable event id so the same callback cannot be booked twice.
 */
class TicketOrderCoordinator(
    initial: TicketOrderRecord? = null,
    usedOrderIds: Collection<String> = emptyList(),
    private val idFactory: () -> String = { UUID.randomUUID().toString().replace("-", "") }
) {
    private var current: TicketOrderRecord? = initial
    private val usedIds = LinkedHashSet<String>().apply { addAll(usedOrderIds.toList().takeLast(MAX_USED_ORDER_IDS)) }

    @Synchronized
    fun startOrder(
        orderId: String,
        amount: BigDecimal,
        ticketAppPackage: String? = null,
        now: Long = System.currentTimeMillis()
    ): OrderStartResult {
        val normalizedId = normalizeOrderId(orderId)
        val normalizedPackage = normalizePackageName(ticketAppPackage)
        val integerAmount = amount.toTicketIntegerNtd()
        require(integerAmount in 1..MAX_ORDER_NTD) { "訂單金額必須是1～${MAX_ORDER_NTD}元的整數" }
        check(normalizedId !in usedIds) { "訂單編號 $normalizedId 已使用，禁止重複收款或出票" }

        current?.let { existing ->
            if (existing.orderId == normalizedId) {
                check(existing.amount == integerAmount) { "相同訂單編號的金額不一致" }
                check(!existing.isTerminal) { "訂單編號 $normalizedId 已結束，禁止重複收款或出票" }
                return OrderStartResult(false, existing)
            }
            check(existing.isTerminal) { "上一筆訂單 ${existing.orderId} 尚未結束" }
            archiveCurrentLocked(existing)
        }

        val record = TicketOrderRecord(
            orderId = normalizedId,
            ticketAppPackage = normalizedPackage,
            amount = integerAmount,
            paid = 0,
            coinCount = 0L,
            billCount = 0L,
            counts = emptyMap(),
            processedCashEventIds = emptyList(),
            status = TicketOrderStatus.PAYMENT_PENDING,
            paymentId = null,
            printAuthorizationId = null,
            dispatchCount = 0,
            message = "訂單已建立，等待現金付款",
            createdAt = now,
            paidAt = null,
            lastDispatchAt = null,
            issuedAt = null,
            finishedAt = null,
            revision = 1L
        )
        current = record
        return OrderStartResult(true, record)
    }

    @Synchronized
    fun recordCashEvent(
        eventId: String,
        kind: CashKind,
        denomination: BigDecimal,
        now: Long = System.currentTimeMillis()
    ): TicketCashRecordResult {
        val before = current ?: error("尚未建立售票訂單")
        if (eventId in before.processedCashEventIds) {
            return TicketCashRecordResult(recorded = false, duplicate = true, record = before)
        }
        if (before.status != TicketOrderStatus.PAYMENT_PENDING) {
            return TicketCashRecordResult(recorded = false, duplicate = false, record = before)
        }
        require(eventId.isNotBlank() && eventId.length <= 160) { "現金事件識別碼無效" }
        val value = denomination.toTicketIntegerNtd()
        require(value > 0) { "現金面額必須大於0" }

        val newPaid = before.paid + value
        val newCounts = before.counts.toMutableMap().apply { this[value] = (this[value] ?: 0L) + 1L }
        val recentEventIds = (before.processedCashEventIds + eventId).takeLast(MAX_CASH_EVENT_IDS)
        val next = when {
            newPaid == before.amount -> before.copy(
                paid = newPaid,
                coinCount = before.coinCount + if (kind == CashKind.COIN) 1 else 0,
                billCount = before.billCount + if (kind == CashKind.BILL) 1 else 0,
                counts = newCounts,
                processedCashEventIds = recentEventIds,
                status = TicketOrderStatus.PAID_WAITING_DISPATCH,
                paymentId = "PAY-${idFactory()}",
                printAuthorizationId = "PRINT-${idFactory()}",
                message = "付款完成，等待建立出票授權",
                paidAt = now,
                finishedAt = now,
                revision = before.revision + 1
            )
            newPaid > before.amount -> before.copy(
                paid = newPaid,
                coinCount = before.coinCount + if (kind == CashKind.COIN) 1 else 0,
                billCount = before.billCount + if (kind == CashKind.BILL) 1 else 0,
                counts = newCounts,
                processedCashEventIds = recentEventIds,
                status = TicketOrderStatus.RECONCILIATION_REQUIRED,
                message = "已超收${newPaid - before.amount}元，禁止出票並要求人工處理",
                finishedAt = now,
                revision = before.revision + 1
            )
            else -> before.copy(
                paid = newPaid,
                coinCount = before.coinCount + if (kind == CashKind.COIN) 1 else 0,
                billCount = before.billCount + if (kind == CashKind.BILL) 1 else 0,
                counts = newCounts,
                processedCashEventIds = recentEventIds,
                message = "已收${newPaid}元，尚差${before.amount - newPaid}元",
                revision = before.revision + 1
            )
        }
        current = next
        return TicketCashRecordResult(recorded = true, duplicate = false, record = next)
    }

    @Synchronized
    fun stopPayment(reason: String, now: Long = System.currentTimeMillis()): TicketOrderRecord? {
        val before = current ?: return null
        if (before.status != TicketOrderStatus.PAYMENT_PENDING) return before
        val next = before.copy(
            status = if (before.paid > 0) TicketOrderStatus.RECONCILIATION_REQUIRED else TicketOrderStatus.CANCELED,
            message = if (before.paid > 0) "$reason；已收${before.paid}元，禁止出票並要求人工處理" else reason,
            finishedAt = now,
            revision = before.revision + 1
        )
        current = next
        return next
    }

    /** Persist the returned state before emitting the authorization outside the app. */
    @Synchronized
    fun claimAutomaticPrintAuthorization(now: Long = System.currentTimeMillis()): PrintAuthorization? {
        val before = current ?: return null
        if (before.status != TicketOrderStatus.PAID_WAITING_DISPATCH) return null
        val next = before.copy(
            status = TicketOrderStatus.PRINT_AUTHORIZED,
            dispatchCount = 1,
            message = "出票授權已送出，等待售票機確認",
            lastDispatchAt = now,
            revision = before.revision + 1
        )
        current = next
        return next.toAuthorization()
    }

    /** Retries always reuse the same authorization id; the ticket app must deduplicate it. */
    @Synchronized
    fun retryPrintAuthorization(now: Long = System.currentTimeMillis()): PrintAuthorization? {
        val before = current ?: return null
        if (before.status != TicketOrderStatus.PRINT_AUTHORIZED) return null
        val next = before.copy(
            dispatchCount = before.dispatchCount + 1,
            message = "已重新通知相同出票授權；不得重複列印",
            lastDispatchAt = now,
            revision = before.revision + 1
        )
        current = next
        return next.toAuthorization()
    }

    @Synchronized
    fun acknowledgeTicketIssued(
        orderId: String,
        authorizationId: String,
        now: Long = System.currentTimeMillis()
    ): TicketIssuedResult {
        val before = current ?: return TicketIssuedResult(false, false, null)
        if (before.orderId != orderId || before.printAuthorizationId != authorizationId) {
            return TicketIssuedResult(false, false, before)
        }
        if (before.status == TicketOrderStatus.TICKET_ISSUED) {
            return TicketIssuedResult(false, true, before)
        }
        if (before.status != TicketOrderStatus.PRINT_AUTHORIZED) {
            return TicketIssuedResult(false, false, before)
        }
        val next = before.copy(
            status = TicketOrderStatus.TICKET_ISSUED,
            message = "售票機已確認出票",
            issuedAt = now,
            finishedAt = now,
            revision = before.revision + 1
        )
        current = next
        return TicketIssuedResult(true, false, next)
    }

    @Synchronized
    fun recoverAfterRestart(now: Long = System.currentTimeMillis()): TicketOrderRecord? {
        val before = current ?: return null
        if (before.status != TicketOrderStatus.PAYMENT_PENDING) return before
        val next = before.copy(
            status = if (before.paid > 0) TicketOrderStatus.RECONCILIATION_REQUIRED else TicketOrderStatus.CANCELED,
            message = if (before.paid > 0) {
                "App 重啟時發現未完成付款且已收${before.paid}元，禁止續收與出票，必須人工處理"
            } else {
                "App 重啟時取消尚未收款的舊訂單"
            },
            finishedAt = now,
            revision = before.revision + 1
        )
        current = next
        return next
    }

    @Synchronized
    fun acknowledgeReconciliation(note: String, now: Long = System.currentTimeMillis()): TicketOrderRecord {
        val before = current ?: error("沒有待處理訂單")
        check(before.status == TicketOrderStatus.RECONCILIATION_REQUIRED) { "目前沒有待人工處理訂單" }
        val next = before.copy(
            status = TicketOrderStatus.CANCELED,
            message = "人工處理完成：$note；本單禁止出票",
            finishedAt = now,
            revision = before.revision + 1
        )
        current = next
        return next
    }

    @Synchronized
    fun forceReconciliation(reason: String, now: Long = System.currentTimeMillis()): TicketOrderRecord? {
        val before = current ?: return null
        if (before.status == TicketOrderStatus.TICKET_ISSUED || before.status == TicketOrderStatus.CANCELED) return before
        val next = before.copy(
            status = TicketOrderStatus.RECONCILIATION_REQUIRED,
            paymentId = null,
            printAuthorizationId = null,
            message = "$reason；禁止出票並要求人工處理",
            finishedAt = now,
            revision = before.revision + 1
        )
        current = next
        return next
    }

    @Synchronized
    fun snapshot(): TicketOrderRecord? = current

    @Synchronized
    fun usedOrderIds(): List<String> = usedIds.toList()

    private fun TicketOrderRecord.toAuthorization(): PrintAuthorization = PrintAuthorization(
        orderId = orderId,
        ticketAppPackage = ticketAppPackage,
        amount = amount,
        paymentId = requireNotNull(paymentId),
        authorizationId = requireNotNull(printAuthorizationId),
        paidAt = requireNotNull(paidAt),
        dispatchAttempt = dispatchCount
    )

    private fun archiveCurrentLocked(record: TicketOrderRecord) {
        usedIds += record.orderId
        while (usedIds.size > MAX_USED_ORDER_IDS) usedIds.remove(usedIds.first())
        current = null
    }

    private fun normalizeOrderId(raw: String): String {
        val normalized = raw.trim()
        require(normalized.isNotEmpty()) { "請輸入訂單編號" }
        require(normalized.length <= MAX_ORDER_ID_LENGTH) { "訂單編號不可超過${MAX_ORDER_ID_LENGTH}字元" }
        require(normalized.none { it.isISOControl() }) { "訂單編號不可含控制字元" }
        return normalized
    }

    private fun normalizePackageName(raw: String?): String? {
        val normalized = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        require(normalized.length <= 200 && PACKAGE_NAME.matches(normalized)) { "售票 App package 名稱無效" }
        return normalized
    }

    companion object {
        const val MAX_ORDER_NTD = 9_999
        private const val MAX_ORDER_ID_LENGTH = 80
        private const val MAX_CASH_EVENT_IDS = 128
        private const val MAX_USED_ORDER_IDS = 200
        private val PACKAGE_NAME = Regex("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+")
    }
}

private fun BigDecimal.toTicketIntegerNtd(): Int = try {
    stripTrailingZeros().intValueExact()
} catch (_: ArithmeticException) {
    throw IllegalArgumentException("金額必須是整數")
}
