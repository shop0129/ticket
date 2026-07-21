package com.littlemonster.hardwareconsole

import java.math.BigDecimal

private fun checkThat(condition: Boolean, message: String) {
    if (!condition) error(message)
}

private fun line(vararg bytes: Int): ByteArray =
    (bytes.joinToString(" ") { it.toString(16).uppercase().padStart(2, '0') } + "\r\n").toByteArray()

private fun withChecksum(payload: List<Int>): IntArray =
    (payload + payload.sum().and(0xFF)).toIntArray()

fun main() {
    checkThat(MdbSafetyPolicy.validate(MdbCommands.BILL_SETUP).allowed, "Bill Setup should be allowed")
    checkThat(MdbSafetyPolicy.validate(MdbCommands.BILL_DISABLE).allowed, "Bill Disable should be allowed")
    checkThat(!MdbSafetyPolicy.validate(byteArrayOf(0x30)).allowed, "Bill Reset must be blocked")
    checkThat(!MdbSafetyPolicy.validate(byteArrayOf(0x35, 0x01)).allowed, "Escrow must be blocked")
    checkThat(!MdbSafetyPolicy.validate(byteArrayOf(0x0D, 0x01)).allowed, "Coin dispense must be blocked")
    checkThat(!MdbSafetyPolicy.validate(byteArrayOf(0x0F, 0x02, 0x64)).allowed, "Coin payout must be blocked")
    checkThat(!MdbSafetyPolicy.validate(byteArrayOf(0x34, 0x00, 0x01, 0x00, 0x00)).allowed,
        "Manual Bill Enable must be blocked")

    val coinPaymentMask = MdbCommands.coinEnableTypes(setOf(0, 2, 4))
    checkThat(coinPaymentMask.contentEquals(byteArrayOf(0x0C, 0x00, 0x15, 0x00, 0x00)),
        "Payment coin mask is wrong")
    checkThat(MdbSafetyPolicy.validateCoinPaymentEnable(coinPaymentMask, setOf(0, 2, 4)).allowed,
        "Exact payment coin mask must pass")
    checkThat(!MdbSafetyPolicy.validateCoinPaymentEnable(
        byteArrayOf(0x0C, 0x00, 0x15, 0xFF.toByte(), 0xFF.toByte()), setOf(0, 2, 4)
    ).allowed, "Manual dispense bits must stay disabled")

    val single100 = MdbCommands.billEnableSingleType(0)
    checkThat(single100.contentEquals(byteArrayOf(0x34, 0x00, 0x01, 0x00, 0x00)), "Type 0 mask is wrong")
    checkThat(MdbSafetyPolicy.validateSingleBillEnable(single100, 0).allowed, "Dedicated single type must pass")
    checkThat(!MdbSafetyPolicy.validateSingleBillEnable(byteArrayOf(0x34, 0x00, 0x03, 0x00, 0x00), 0).allowed,
        "Multiple denominations must be blocked")
    checkThat(!MdbSafetyPolicy.validateSingleBillEnable(byteArrayOf(0x34, 0x00, 0x01, 0x00, 0x01), 0).allowed,
        "Escrow enable must be blocked")

    val decoder = MdbLineDecoder()
    val setupPayload = mutableListOf(
        0x01, 0x01, 0x58, // feature + country
        0x00, 0x01,       // scaling factor
        0x00,             // decimal places
        0x01, 0xF4,       // stacker capacity 500
        0x00, 0x00,       // security
        0x00              // escrow unsupported
    )
    setupPayload += listOf(100, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    val setup = withChecksum(setupPayload)
    checkThat(setup.size == 28, "Bill Setup test packet must be 28 bytes")
    decoder.expectBillSetup()
    val setupMessage = decoder.feed(line(*setup)).single()
    checkThat(setupMessage.billSetup?.denominations?.get(0)?.compareTo(BigDecimal("100")) == 0, "100 denomination decode failed")
    checkThat(setupMessage.billSetup?.denominations?.get(1)?.compareTo(BigDecimal("200")) == 0, "200 denomination decode failed")

    val accepted = decoder.feed(line(0x30, 0x80)).single()
    checkThat(accepted.billEvent?.route == BillRoute.STACKED, "Stacked event decode failed")
    checkThat(accepted.billEvent?.denomination?.compareTo(BigDecimal("100")) == 0, "Accepted 100 decode failed")

    val disabled = decoder.feed(line(0x30, 0x09)).single()
    checkThat(disabled.description.contains("已停用"), "Disabled state decode failed")

    val coinSetupPayload = mutableListOf(
        0x03, 0x01, 0x58, // feature + country
        0x01, 0x00,       // factor + decimal
        0x00, 0x04        // routing: type 2
    )
    coinSetupPayload += listOf(1, 5, 10, 20, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    val coinSetup = withChecksum(coinSetupPayload)
    checkThat(coinSetup.size == 24, "Coin Setup test packet must be 24 bytes")
    decoder.expectSetup()
    decoder.feed(line(*coinSetup)).single()
    val coin10 = decoder.feed(line(0x08, 0x52, 0x00)).single()
    checkThat(coin10.accepted?.denomination?.compareTo(BigDecimal("10")) == 0, "Coin regression decode failed")

    val partialA = "30 ".toByteArray()
    val partialB = "80\r\n".toByteArray()
    checkThat(decoder.feed(partialA).isEmpty(), "Partial frame must not emit")
    checkThat(decoder.feed(partialB).single().billEvent?.route == BillRoute.STACKED, "Split frame decode failed")

    val paymentCoinSetup = CoinSetup(
        countryCode = 0x0158,
        scalingFactor = 1,
        decimalPlaces = 0,
        denominations = listOf(
            BigDecimal("1"), BigDecimal("5"), BigDecimal("10"), BigDecimal("20"), BigDecimal("50")
        ) + List(11) { null },
        tubeRouting = listOf(true, true, true, false, true) + List(11) { false }
    )
    val paymentBillSetup = BillSetup(
        countryCode = 0x0158,
        scalingFactor = 1,
        decimalPlaces = 0,
        stackerCapacity = 500,
        escrowSupported = false,
        denominations = listOf(BigDecimal("100"), BigDecimal("500"), BigDecimal("1000")) + List(13) { null }
    )
    checkThat(PaymentAcceptancePolicy.safeCoinTypeIndices(paymentCoinSetup, 60) == setOf(0, 1, 2, 4),
        "Remaining 60 should enable tested 1/5/10/50 coins")
    checkThat(PaymentAcceptancePolicy.safeCoinTypeIndices(paymentCoinSetup, 10) == setOf(0, 1, 2),
        "Remaining 10 must disable 50 and untested 20")
    checkThat(PaymentAcceptancePolicy.safeHundredBillTypeIndex(paymentBillSetup, 100) == 0,
        "Remaining 100 should enable the 100 bill")
    checkThat(PaymentAcceptancePolicy.safeHundredBillTypeIndex(paymentBillSetup, 99) == null,
        "Remaining 99 must disable the 100 bill")

    val payment = CashPaymentController()
    payment.start(BigDecimal("160"), now = 1L)
    payment.markReady()
    checkThat(payment.accept(CashKind.BILL, BigDecimal("100"), now = 2L).snapshot.remaining == 60,
        "100 bill should leave 60")
    checkThat(payment.accept(CashKind.COIN, BigDecimal("50"), now = 3L).snapshot.remaining == 10,
        "50 coin should leave 10")
    val complete = payment.accept(CashKind.COIN, BigDecimal("10"), now = 4L).snapshot
    checkThat(complete.status == CashPaymentStatus.COMPLETED && complete.paid == 160,
        "160 payment should complete exactly")
    checkThat(complete.coinCount == 2L && complete.billCount == 1L,
        "Cash kind counts are wrong")

    val canceled = CashPaymentController()
    canceled.start(BigDecimal("20"))
    canceled.markReady()
    canceled.accept(CashKind.COIN, BigDecimal("10"))
    val canceledSnapshot = canceled.cancel("operator cancel")
    checkThat(canceledSnapshot.requiresReconciliation, "Canceled payment with cash must require reconciliation")
    checkThat(runCatching { canceled.start(BigDecimal("20")) }.isFailure,
        "A new payment must be blocked before reconciliation")
    canceled.acknowledgeReconciliation()
    checkThat(canceled.snapshot().status == CashPaymentStatus.IDLE, "Reconciliation should return to idle")

    val overpaid = CashPaymentController()
    overpaid.start(BigDecimal("50"))
    overpaid.markReady()
    val overpaidSnapshot = overpaid.accept(CashKind.BILL, BigDecimal("100")).snapshot
    checkThat(overpaidSnapshot.status == CashPaymentStatus.ERROR && overpaidSnapshot.overpaid == 50,
        "Unexpected overpayment must be recorded and stopped")

    var idCounter = 0
    val orders = TicketOrderCoordinator(idFactory = { "TEST-${++idCounter}" })
    val created = orders.startOrder("ORDER-110", BigDecimal("110"), now = 10L)
    checkThat(created.created && created.record.status == TicketOrderStatus.PAYMENT_PENDING,
        "Ticket order should start in payment pending")
    val billBooked = orders.recordCashEvent("session:1", CashKind.BILL, BigDecimal("100"), now = 11L)
    checkThat(billBooked.recorded && billBooked.record.paid == 100,
        "100 bill must be booked to the ticket order")
    val duplicateBill = orders.recordCashEvent("session:1", CashKind.BILL, BigDecimal("100"), now = 12L)
    checkThat(!duplicateBill.recorded && duplicateBill.duplicate && duplicateBill.record.paid == 100,
        "The same hardware cash event must not be booked twice")
    val coinBooked = orders.recordCashEvent("session:2", CashKind.COIN, BigDecimal("10"), now = 13L)
    checkThat(coinBooked.record.status == TicketOrderStatus.PAID_WAITING_DISPATCH && coinBooked.record.paid == 110,
        "Exact payment should wait for print authorization")
    val authorization = orders.claimAutomaticPrintAuthorization(now = 14L)
        ?: error("Print authorization should be created")
    checkThat(orders.claimAutomaticPrintAuthorization(now = 15L) == null,
        "Automatic print authorization may only be claimed once")
    val retried = orders.retryPrintAuthorization(now = 16L) ?: error("Retry should be available")
    checkThat(retried.authorizationId == authorization.authorizationId && retried.paymentId == authorization.paymentId,
        "Retry must reuse the same payment and print authorization ids")
    val issued = orders.acknowledgeTicketIssued("ORDER-110", authorization.authorizationId, now = 17L)
    checkThat(issued.accepted && issued.record?.status == TicketOrderStatus.TICKET_ISSUED,
        "Matching ticket acknowledgement should close the order")
    val duplicateAck = orders.acknowledgeTicketIssued("ORDER-110", authorization.authorizationId, now = 18L)
    checkThat(!duplicateAck.accepted && duplicateAck.duplicate,
        "Duplicate ticket acknowledgement must be ignored")
    orders.startOrder("ORDER-NEW", BigDecimal("50"), now = 19L)
    val replayGuard = TicketOrderCoordinator(
        initial = null,
        usedOrderIds = orders.usedOrderIds(),
        idFactory = { "REPLAY" }
    )
    checkThat(runCatching { replayGuard.startOrder("ORDER-110", BigDecimal("110"), now = 20L) }.isFailure,
        "A previously completed order id must not be reused")

    val restartWithCash = TicketOrderCoordinator(idFactory = { "RECOVERY" })
    restartWithCash.startOrder("ORDER-PARTIAL", BigDecimal("50"), now = 21L)
    restartWithCash.recordCashEvent("session:3", CashKind.COIN, BigDecimal("10"), now = 22L)
    val recoveredPartial = TicketOrderCoordinator(
        restartWithCash.snapshot(), restartWithCash.usedOrderIds(), idFactory = { "RECOVERY" }
    ).recoverAfterRestart(now = 23L)
    checkThat(recoveredPartial?.status == TicketOrderStatus.RECONCILIATION_REQUIRED,
        "Restart after partial cash must require reconciliation")

    val restartWithoutCash = TicketOrderCoordinator(idFactory = { "RECOVERY-EMPTY" })
    restartWithoutCash.startOrder("ORDER-EMPTY", BigDecimal("50"), now = 24L)
    checkThat(restartWithoutCash.recoverAfterRestart(now = 25L)?.status == TicketOrderStatus.CANCELED,
        "Restart before any cash should cancel the stale order")

    println("ProtocolSafetyReplayTest: PASS")
}
