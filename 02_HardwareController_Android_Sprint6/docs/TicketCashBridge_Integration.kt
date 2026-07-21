/*
 * Reference only: copy the relevant pieces into the real ticket app.
 * Both apps must be signed with the same key because the bridge permission is signature-level.
 */

private const val HARDWARE_PACKAGE = "com.littlemonster.hardwareconsole"
private const val BRIDGE_PERMISSION =
    "com.littlemonster.hardwareconsole.permission.TICKET_CASH_BRIDGE"

// 1. Ticket app -> hardware controller: request one exact cash payment.
fun requestCashPayment(context: android.content.Context, orderId: String, amountNtd: Int) {
    val requestId = "REQ-$orderId"
    context.sendBroadcast(
        android.content.Intent(
            "com.littlemonster.hardwareconsole.action.REQUEST_CASH_PAYMENT"
        ).apply {
            `package` = HARDWARE_PACKAGE
            putExtra("request_id", requestId)
            putExtra("order_id", orderId)
            putExtra("ticket_app_package", context.packageName)
            putExtra("amount_ntd", amountNtd)
        },
        BRIDGE_PERMISSION
    )
}

/*
 * 2. Hardware controller -> ticket app: receive PRINT_AUTHORIZED.
 *
 * IMPORTANT: never print directly merely because a broadcast arrived. First persist a state keyed
 * by authorizationId. If the same authorization is delivered again, do not print a second ticket.
 * A CLAIMED-but-not-PRINTED state after a crash must be shown for operator recovery, not reprinted.
 */
class ExamplePrintAuthorizationReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: android.content.Context, intent: android.content.Intent) {
        if (intent.action != "com.littlemonster.hardwareconsole.action.PRINT_AUTHORIZED") return
        val orderId = intent.getStringExtra("order_id") ?: return
        val authorizationId = intent.getStringExtra("print_authorization_id") ?: return
        val amount = intent.getIntExtra("amount_ntd", -1)
        if (amount <= 0) return

        val prefs = context.getSharedPreferences("ticket_print_gate", android.content.Context.MODE_PRIVATE)
        val stateKey = "authorization:$authorizationId"
        when (prefs.getString(stateKey, null)) {
            "PRINTED" -> sendTicketIssued(context, orderId, authorizationId)
            "CLAIMED" -> showOperatorRecovery(context, orderId, authorizationId)
            else -> {
                // commit() must finish before calling the physical printer.
                if (!prefs.edit().putString(stateKey, "CLAIMED").commit()) return
                val printed = printOrderExactlyOnce(orderId, amount)
                if (printed && prefs.edit().putString(stateKey, "PRINTED").commit()) {
                    sendTicketIssued(context, orderId, authorizationId)
                }
            }
        }
    }

    private fun sendTicketIssued(context: android.content.Context, orderId: String, authorizationId: String) {
        context.sendBroadcast(
            android.content.Intent(
                "com.littlemonster.hardwareconsole.action.TICKET_ISSUED"
            ).apply {
                `package` = HARDWARE_PACKAGE
                putExtra("order_id", orderId)
                putExtra("print_authorization_id", authorizationId)
            },
            BRIDGE_PERMISSION
        )
    }

    private fun printOrderExactlyOnce(orderId: String, amount: Int): Boolean {
        // Replace with the real ticket app's printer call and return true only after success.
        return false
    }

    private fun showOperatorRecovery(context: android.content.Context, orderId: String, authorizationId: String) {
        // Open the ticket app's recovery screen. Do not automatically print again.
    }
}
