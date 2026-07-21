package com.littlemonster.hardwareconsole

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.UUID

/** Signature-protected app-to-app bridge for the ticket UI and the hardware controller. */
class TicketCashBridgeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val store = TicketOrderStore(context)
        when (intent.action) {
            TicketCashContract.ACTION_REQUEST_CASH_PAYMENT -> receivePaymentRequest(context, intent, store)
            TicketCashContract.ACTION_TICKET_ISSUED -> receiveTicketIssued(intent, store)
        }
    }

    private fun receivePaymentRequest(context: Context, intent: Intent, store: TicketOrderStore) {
        val orderId = intent.getStringExtra(TicketCashContract.EXTRA_ORDER_ID)?.trim().orEmpty()
        val amount = intent.getIntExtra(TicketCashContract.EXTRA_AMOUNT_NTD, -1)
        val ticketAppPackage = intent.getStringExtra(TicketCashContract.EXTRA_TICKET_APP_PACKAGE)?.trim()
            ?.takeIf { it.isNotEmpty() }
        val requestId = intent.getStringExtra(TicketCashContract.EXTRA_REQUEST_ID)?.trim()
            ?.takeIf { it.isNotEmpty() } ?: "REQ-${UUID.randomUUID()}"
        val validReplyPackage = ticketAppPackage == null ||
            Regex("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+").matches(ticketAppPackage)
        if (orderId.isEmpty() || orderId.length > 80 || amount !in 1..TicketOrderCoordinator.MAX_ORDER_NTD || !validReplyPackage) {
            store.appendAudit("REQUEST_REJECTED", "request=$requestId order=$orderId amount=$amount")
            return
        }
        val current = store.loadCurrent()
        if (current != null && current.orderId == orderId && current.amount == amount && !current.isTerminal) {
            store.appendAudit("REQUEST_DUPLICATE", "request=$requestId order=$orderId current=${current.status}")
        } else {
            store.savePendingRequest(PendingTicketOrderRequest(requestId, orderId, ticketAppPackage, amount, System.currentTimeMillis()))
            store.appendAudit("REQUEST_RECEIVED", "request=$requestId order=$orderId amount=$amount reply=$ticketAppPackage")
        }
        runCatching {
            context.startActivity(Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            })
        }
    }

    private fun receiveTicketIssued(intent: Intent, store: TicketOrderStore) {
        val orderId = intent.getStringExtra(TicketCashContract.EXTRA_ORDER_ID)?.trim().orEmpty()
        val authorizationId = intent.getStringExtra(TicketCashContract.EXTRA_PRINT_AUTHORIZATION_ID)?.trim().orEmpty()
        val coordinator = TicketOrderCoordinator(store.loadCurrent(), store.loadUsedOrderIds())
        val result = coordinator.acknowledgeTicketIssued(orderId, authorizationId)
        if (result.accepted) {
            store.save(coordinator.snapshot(), coordinator.usedOrderIds())
            store.appendAudit("TICKET_ISSUED", "order=$orderId authorization=$authorizationId")
        } else if (result.duplicate) {
            store.appendAudit("TICKET_ACK_DUPLICATE", "order=$orderId authorization=$authorizationId")
        } else {
            store.appendAudit("TICKET_ACK_REJECTED", "order=$orderId authorization=$authorizationId")
        }
    }
}
