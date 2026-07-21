package com.littlemonster.hardwareconsole

object TicketCashContract {
    const val BRIDGE_PERMISSION = "com.littlemonster.hardwareconsole.permission.TICKET_CASH_BRIDGE"

    const val ACTION_REQUEST_CASH_PAYMENT =
        "com.littlemonster.hardwareconsole.action.REQUEST_CASH_PAYMENT"
    const val ACTION_PRINT_AUTHORIZED =
        "com.littlemonster.hardwareconsole.action.PRINT_AUTHORIZED"
    const val ACTION_TICKET_ISSUED =
        "com.littlemonster.hardwareconsole.action.TICKET_ISSUED"
    const val ACTION_PAYMENT_STOPPED =
        "com.littlemonster.hardwareconsole.action.PAYMENT_STOPPED"

    const val EXTRA_REQUEST_ID = "request_id"
    const val EXTRA_ORDER_ID = "order_id"
    const val EXTRA_TICKET_APP_PACKAGE = "ticket_app_package"
    const val EXTRA_AMOUNT_NTD = "amount_ntd"
    const val EXTRA_PAID_NTD = "paid_ntd"
    const val EXTRA_PAYMENT_ID = "payment_id"
    const val EXTRA_PRINT_AUTHORIZATION_ID = "print_authorization_id"
    const val EXTRA_PAID_AT = "paid_at"
    const val EXTRA_DISPATCH_ATTEMPT = "dispatch_attempt"
    const val EXTRA_REASON = "reason"
}
