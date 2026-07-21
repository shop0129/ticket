package com.littlemonster.hardwareconsole

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class PendingTicketOrderRequest(
    val requestId: String,
    val orderId: String,
    val ticketAppPackage: String?,
    val amount: Int,
    val requestedAt: Long
)

/** SharedPreferences uses commit() so cash/order state is durable before the next side effect. */
class TicketOrderStore(context: Context) {
    private val appContext = context.applicationContext
    private val preferences = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val auditFile = File(appContext.filesDir, AUDIT_FILE_NAME)

    @Synchronized
    fun loadCurrent(): TicketOrderRecord? = synchronized(STATE_LOCK) {
        val raw = preferences.getString(KEY_CURRENT_ORDER, null) ?: return null
        return decodeRecord(raw) ?: error("售票訂單保存資料損壞；為避免重複收款，系統已停止")
    }

    @Synchronized
    fun loadUsedOrderIds(): List<String> = synchronized(STATE_LOCK) {
        val raw = preferences.getString(KEY_USED_ORDER_IDS, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            List(array.length()) { index -> array.getString(index) }
        }.getOrElse { error("已使用訂單清單損壞；為避免重複訂單，系統已停止") }
    }

    @Synchronized
    fun save(record: TicketOrderRecord?, usedOrderIds: List<String>) {
        synchronized(STATE_LOCK) {
            val ids = JSONArray().apply { usedOrderIds.takeLast(200).forEach(::put) }
            val editor = preferences.edit().putString(KEY_USED_ORDER_IDS, ids.toString())
            if (record == null) editor.remove(KEY_CURRENT_ORDER)
            else editor.putString(KEY_CURRENT_ORDER, encodeRecord(record).toString())
            check(editor.commit()) { "無法保存售票訂單狀態" }
        }
    }

    @Synchronized
    fun savePendingRequest(request: PendingTicketOrderRequest) {
        synchronized(STATE_LOCK) {
            val json = JSONObject()
                .put("requestId", request.requestId)
                .put("orderId", request.orderId)
                .put("ticketAppPackage", request.ticketAppPackage ?: JSONObject.NULL)
                .put("amount", request.amount)
                .put("requestedAt", request.requestedAt)
            check(preferences.edit().putString(KEY_PENDING_REQUEST, json.toString()).commit()) {
                "無法保存售票機付款請求"
            }
        }
    }

    @Synchronized
    fun loadPendingRequest(): PendingTicketOrderRequest? = synchronized(STATE_LOCK) {
        val raw = preferences.getString(KEY_PENDING_REQUEST, null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            PendingTicketOrderRequest(
                requestId = json.getString("requestId"),
                orderId = json.getString("orderId"),
                ticketAppPackage = json.nullableString("ticketAppPackage"),
                amount = json.getInt("amount"),
                requestedAt = json.getLong("requestedAt")
            )
        }.getOrNull()
    }

    @Synchronized
    fun clearPendingRequest(requestId: String) {
        synchronized(STATE_LOCK) {
            val current = loadPendingRequest() ?: return
            if (current.requestId == requestId) {
                check(preferences.edit().remove(KEY_PENDING_REQUEST).commit()) { "無法清除售票機付款請求" }
            }
        }
    }

    @Synchronized
    fun appendAudit(event: String, detail: String, timestamp: Long = System.currentTimeMillis()) {
        val safeEvent = event.replace('\t', ' ').replace('\n', ' ')
        val safeDetail = detail.replace('\t', ' ').replace('\n', ' ')
        synchronized(AUDIT_LOCK) {
            auditFile.parentFile?.mkdirs()
            auditFile.appendText("$timestamp\t$safeEvent\t$safeDetail\n")
        }
    }

    @Synchronized
    fun readAudit(): String = synchronized(AUDIT_LOCK) {
        if (auditFile.exists()) auditFile.readText() else ""
    }

    private fun encodeRecord(record: TicketOrderRecord): JSONObject = JSONObject()
        .put("orderId", record.orderId)
        .putNullable("ticketAppPackage", record.ticketAppPackage)
        .put("amount", record.amount)
        .put("paid", record.paid)
        .put("coinCount", record.coinCount)
        .put("billCount", record.billCount)
        .put("counts", JSONObject().apply { record.counts.forEach { (value, count) -> put(value.toString(), count) } })
        .put("processedCashEventIds", JSONArray().apply { record.processedCashEventIds.forEach(::put) })
        .put("status", record.status.name)
        .putNullable("paymentId", record.paymentId)
        .putNullable("printAuthorizationId", record.printAuthorizationId)
        .put("dispatchCount", record.dispatchCount)
        .put("message", record.message)
        .put("createdAt", record.createdAt)
        .putNullable("paidAt", record.paidAt)
        .putNullable("lastDispatchAt", record.lastDispatchAt)
        .putNullable("issuedAt", record.issuedAt)
        .putNullable("finishedAt", record.finishedAt)
        .put("revision", record.revision)

    private fun decodeRecord(raw: String): TicketOrderRecord? = runCatching {
        val json = JSONObject(raw)
        val countsJson = json.optJSONObject("counts") ?: JSONObject()
        val counts = linkedMapOf<Int, Long>()
        countsJson.keys().forEach { key -> counts[key.toInt()] = countsJson.getLong(key) }
        val eventsJson = json.optJSONArray("processedCashEventIds") ?: JSONArray()
        TicketOrderRecord(
            orderId = json.getString("orderId"),
            ticketAppPackage = json.nullableString("ticketAppPackage"),
            amount = json.getInt("amount"),
            paid = json.getInt("paid"),
            coinCount = json.getLong("coinCount"),
            billCount = json.getLong("billCount"),
            counts = counts,
            processedCashEventIds = List(eventsJson.length()) { index -> eventsJson.getString(index) },
            status = TicketOrderStatus.valueOf(json.getString("status")),
            paymentId = json.nullableString("paymentId"),
            printAuthorizationId = json.nullableString("printAuthorizationId"),
            dispatchCount = json.optInt("dispatchCount", 0),
            message = json.optString("message", ""),
            createdAt = json.getLong("createdAt"),
            paidAt = json.nullableLong("paidAt"),
            lastDispatchAt = json.nullableLong("lastDispatchAt"),
            issuedAt = json.nullableLong("issuedAt"),
            finishedAt = json.nullableLong("finishedAt"),
            revision = json.optLong("revision", 1L)
        )
    }.getOrNull()

    private fun JSONObject.putNullable(key: String, value: Any?): JSONObject =
        put(key, value ?: JSONObject.NULL)

    private fun JSONObject.nullableString(key: String): String? =
        if (!has(key) || isNull(key)) null else getString(key)

    private fun JSONObject.nullableLong(key: String): Long? =
        if (!has(key) || isNull(key)) null else getLong(key)

    companion object {
        private const val PREFS_NAME = "ticket_cash_sprint5"
        private const val KEY_CURRENT_ORDER = "current_order"
        private const val KEY_USED_ORDER_IDS = "used_order_ids"
        private const val KEY_PENDING_REQUEST = "pending_order_request"
        private const val AUDIT_FILE_NAME = "ticket_cash_audit.log"
        private val STATE_LOCK = Any()
        private val AUDIT_LOCK = Any()
    }
}
