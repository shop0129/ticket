package com.littlemonster.hardwareconsole

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors

object LocalTicketBridgeConfig {
    const val PORT = 8765
    const val WEB_CLIENT_PACKAGE = "com.littlemonster.webkiosk"
    const val HEADER_KEY = "x-monster-bridge-key"
    const val VERSION = "1.0-sprint6"

    private const val PREFS = "local_ticket_bridge"
    private const val KEY_PAIRING = "pairing_key"

    fun pairingKey(context: Context): String {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.getString(KEY_PAIRING, null)?.takeIf { it.matches(Regex("\\d{8}")) }?.let { return it }
        val value = (SecureRandom().nextInt(90_000_000) + 10_000_000).toString()
        check(prefs.edit().putString(KEY_PAIRING, value).commit()) { "無法保存本機橋接配對碼" }
        return value
    }
}

/**
 * Foreground localhost-only service used by the GitHub Pages/PWA ticket UI.
 * The server binds to 127.0.0.1, requires an install-specific pairing key and never exposes
 * raw MDB commands. All cash state continues to go through TicketOrderCoordinator.
 */
class LocalTicketBridgeService : Service() {
    private var server: LocalTicketBridgeServer? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification())
        server = LocalTicketBridgeServer(applicationContext).also { it.start() }
    }

    override fun onDestroy() {
        server?.close()
        server = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "小怪獸售票機現金橋接",
                    NotificationManager.IMPORTANCE_LOW
                ).apply { description = "讓本機售票網頁安全連線現金控制器" }
            )
        }
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION") Notification.Builder(this)
        }
        return builder
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("小怪獸現金橋接已啟用")
            .setContentText("僅監聽本機 127.0.0.1:${LocalTicketBridgeConfig.PORT}")
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "monster_cash_bridge"
        private const val NOTIFICATION_ID = 8765
    }
}

private data class LocalHttpRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String>,
    val body: String
)

private data class LocalHttpResponse(val status: Int, val json: JSONObject)

class LocalTicketBridgeServer(private val context: Context) {
    @Volatile private var running = false
    @Volatile private var socket: ServerSocket? = null
    private val acceptExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "MonsterCashBridge-Accept").apply { isDaemon = true }
    }
    private val clientExecutor = Executors.newFixedThreadPool(3) { runnable ->
        Thread(runnable, "MonsterCashBridge-Client").apply { isDaemon = true }
    }

    fun start() {
        if (running) return
        running = true
        acceptExecutor.execute {
            try {
                val server = ServerSocket(
                    LocalTicketBridgeConfig.PORT,
                    8,
                    InetAddress.getByName("127.0.0.1")
                )
                socket = server
                while (running) {
                    val client = runCatching { server.accept() }.getOrNull() ?: break
                    clientExecutor.execute { handleClient(client) }
                }
            } finally {
                running = false
                runCatching { socket?.close() }
            }
        }
    }

    fun close() {
        running = false
        runCatching { socket?.close() }
        acceptExecutor.shutdownNow()
        clientExecutor.shutdownNow()
    }

    private fun handleClient(client: Socket) {
        client.use { connection ->
            connection.soTimeout = 5_000
            val request = runCatching { readRequest(connection) }.getOrElse {
                writeResponse(connection, LocalHttpResponse(400, errorJson("BAD_REQUEST", "請求格式錯誤")), null)
                return
            }
            val origin = request.headers["origin"]
            if (request.method == "OPTIONS") {
                writeResponse(connection, LocalHttpResponse(204, JSONObject()), origin)
                return
            }
            val response = runCatching { route(request) }.getOrElse { error ->
                LocalHttpResponse(500, errorJson("INTERNAL_ERROR", error.message ?: "本機橋接錯誤"))
            }
            writeResponse(connection, response, origin)
        }
    }

    private fun route(request: LocalHttpRequest): LocalHttpResponse {
        if (request.headers[LocalTicketBridgeConfig.HEADER_KEY] != LocalTicketBridgeConfig.pairingKey(context)) {
            return LocalHttpResponse(401, errorJson("PAIRING_REQUIRED", "配對碼錯誤或尚未設定"))
        }
        if (request.method == "GET" && request.path == "/v1/status") {
            return LocalHttpResponse(200, JSONObject()
                .put("ok", true)
                .put("bridgeVersion", LocalTicketBridgeConfig.VERSION)
                .put("port", LocalTicketBridgeConfig.PORT))
        }
        if (request.method == "POST" && request.path == "/v1/payments") {
            return createPayment(JSONObject(request.body.ifBlank { "{}" }))
        }
        val match = Regex("^/v1/payments/([^/]+)(/issued)?$").matchEntire(request.path)
            ?: return LocalHttpResponse(404, errorJson("NOT_FOUND", "找不到本機橋接功能"))
        val orderId = URLDecoder.decode(match.groupValues[1], "UTF-8")
        return when {
            request.method == "GET" && match.groupValues[2].isEmpty() -> readPayment(orderId)
            request.method == "POST" && match.groupValues[2] == "/issued" ->
                acknowledgeIssued(orderId, JSONObject(request.body.ifBlank { "{}" }))
            else -> LocalHttpResponse(405, errorJson("METHOD_NOT_ALLOWED", "不支援此操作"))
        }
    }

    private fun createPayment(body: JSONObject): LocalHttpResponse {
        val orderId = body.optString("orderId").trim()
        val amount = body.optInt("amountNtd", -1)
        val requestId = body.optString("requestId").trim().ifEmpty { "WEB-${UUID.randomUUID()}" }
        if (orderId.isEmpty() || orderId.length > 80 || orderId.any { it.isISOControl() }) {
            return LocalHttpResponse(400, errorJson("INVALID_ORDER", "訂單編號無效"))
        }
        if (amount !in 1..TicketOrderCoordinator.MAX_ORDER_NTD) {
            return LocalHttpResponse(400, errorJson("INVALID_AMOUNT", "訂單金額必須是1～9999元整數"))
        }
        val store = TicketOrderStore(context)
        val current = store.loadCurrent()
        if (current?.orderId == orderId) {
            if (current.amount != amount) {
                return LocalHttpResponse(409, errorJson("ORDER_AMOUNT_MISMATCH", "相同訂單編號的金額不一致"))
            }
            return LocalHttpResponse(200, recordJson(current).put("duplicate", true))
        }
        if (orderId in store.loadUsedOrderIds()) {
            return LocalHttpResponse(409, errorJson("ORDER_ALREADY_USED", "此訂單已完成，禁止重複收款"))
        }
        if (current != null && !current.isTerminal) {
            return LocalHttpResponse(409, errorJson("PREVIOUS_ORDER_ACTIVE", "上一筆訂單尚未結束"))
        }
        store.savePendingRequest(
            PendingTicketOrderRequest(
                requestId = requestId.take(160),
                orderId = orderId,
                ticketAppPackage = LocalTicketBridgeConfig.WEB_CLIENT_PACKAGE,
                amount = amount,
                requestedAt = System.currentTimeMillis()
            )
        )
        store.appendAudit("WEB_REQUEST_RECEIVED", "request=$requestId order=$orderId amount=$amount")
        runCatching {
            context.startActivity(Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                putExtra("local_web_order_id", orderId)
            })
        }.onFailure {
            store.appendAudit("WEB_ACTIVITY_LAUNCH_FAILED", "order=$orderId error=${it.javaClass.simpleName}")
        }
        return LocalHttpResponse(202, JSONObject()
            .put("ok", true)
            .put("status", "QUEUED")
            .put("orderId", orderId)
            .put("amountNtd", amount)
            .put("paidNtd", 0)
            .put("remainingNtd", amount)
            .put("message", "付款請求已送入現金控制器"))
    }

    private fun readPayment(orderId: String): LocalHttpResponse {
        val store = TicketOrderStore(context)
        val current = store.loadCurrent()
        if (current?.orderId == orderId) return LocalHttpResponse(200, recordJson(current))
        val pending = store.loadPendingRequest()
        if (pending?.orderId == orderId) {
            return LocalHttpResponse(200, JSONObject()
                .put("ok", true)
                .put("status", "QUEUED")
                .put("orderId", orderId)
                .put("amountNtd", pending.amount)
                .put("paidNtd", 0)
                .put("remainingNtd", pending.amount)
                .put("message", "等待控制器連線並開始收款"))
        }
        return LocalHttpResponse(404, errorJson("ORDER_NOT_FOUND", "控制器找不到此訂單"))
    }

    private fun acknowledgeIssued(orderId: String, body: JSONObject): LocalHttpResponse {
        val authorizationId = body.optString("authorizationId").trim()
        if (authorizationId.isEmpty()) {
            return LocalHttpResponse(400, errorJson("AUTHORIZATION_REQUIRED", "缺少出票授權碼"))
        }
        val store = TicketOrderStore(context)
        val coordinator = TicketOrderCoordinator(store.loadCurrent(), store.loadUsedOrderIds())
        val result = coordinator.acknowledgeTicketIssued(orderId, authorizationId)
        return when {
            result.accepted -> {
                store.save(coordinator.snapshot(), coordinator.usedOrderIds())
                store.appendAudit("WEB_TICKET_ISSUED", "order=$orderId authorization=$authorizationId")
                LocalHttpResponse(200, recordJson(requireNotNull(result.record)).put("accepted", true))
            }
            result.duplicate -> LocalHttpResponse(200, recordJson(requireNotNull(result.record)).put("duplicate", true))
            else -> LocalHttpResponse(409, errorJson("ISSUE_ACK_REJECTED", "訂單或出票授權狀態不一致"))
        }
    }

    private fun recordJson(record: TicketOrderRecord): JSONObject = JSONObject()
        .put("ok", true)
        .put("status", record.status.name)
        .put("orderId", record.orderId)
        .put("amountNtd", record.amount)
        .put("paidNtd", record.paid)
        .put("remainingNtd", record.remaining)
        .put("overpaidNtd", record.overpaid)
        .put("paymentId", record.paymentId ?: JSONObject.NULL)
        .put("authorizationId", record.printAuthorizationId ?: JSONObject.NULL)
        .put("paidAt", record.paidAt ?: JSONObject.NULL)
        .put("issuedAt", record.issuedAt ?: JSONObject.NULL)
        .put("revision", record.revision)
        .put("message", record.message)

    private fun errorJson(code: String, message: String): JSONObject = JSONObject()
        .put("ok", false)
        .put("code", code)
        .put("message", message)

    private fun readRequest(socket: Socket): LocalHttpRequest {
        val input = BufferedInputStream(socket.getInputStream())
        val headerBytes = ArrayList<Byte>()
        var matched = 0
        while (headerBytes.size < MAX_HEADER_BYTES) {
            val value = input.read()
            if (value < 0) break
            headerBytes += value.toByte()
            matched = when {
                matched == 0 && value == '\r'.code -> 1
                matched == 1 && value == '\n'.code -> 2
                matched == 2 && value == '\r'.code -> 3
                matched == 3 && value == '\n'.code -> 4
                value == '\r'.code -> 1
                else -> 0
            }
            if (matched == 4) break
        }
        require(matched == 4) { "HTTP 標頭不完整" }
        val headerText = headerBytes.toByteArray().toString(StandardCharsets.ISO_8859_1)
        val lines = headerText.split("\r\n")
        val requestLine = lines.first().split(' ')
        require(requestLine.size >= 2) { "HTTP request line 無效" }
        val headers = linkedMapOf<String, String>()
        lines.drop(1).filter { it.contains(':') }.forEach { line ->
            val split = line.indexOf(':')
            headers[line.substring(0, split).trim().lowercase()] = line.substring(split + 1).trim()
        }
        val length = headers["content-length"]?.toIntOrNull() ?: 0
        require(length in 0..MAX_BODY_BYTES) { "HTTP body 過大" }
        val bodyBytes = ByteArray(length)
        var offset = 0
        while (offset < length) {
            val count = input.read(bodyBytes, offset, length - offset)
            require(count > 0) { "HTTP body 不完整" }
            offset += count
        }
        val rawPath = requestLine[1].substringBefore('?')
        return LocalHttpRequest(
            method = requestLine[0].uppercase(),
            path = rawPath,
            headers = headers,
            body = bodyBytes.toString(StandardCharsets.UTF_8)
        )
    }

    private fun writeResponse(socket: Socket, response: LocalHttpResponse, origin: String?) {
        val body = if (response.status == 204) ByteArray(0) else response.json.toString().toByteArray(StandardCharsets.UTF_8)
        val statusText = when (response.status) {
            200 -> "OK"
            202 -> "Accepted"
            204 -> "No Content"
            400 -> "Bad Request"
            401 -> "Unauthorized"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            409 -> "Conflict"
            else -> "Internal Server Error"
        }
        val allowedOrigin = origin?.takeIf { it.length <= 512 && !it.contains('\r') && !it.contains('\n') } ?: "null"
        val headers = buildString {
            append("HTTP/1.1 ${response.status} $statusText\r\n")
            append("Content-Type: application/json; charset=utf-8\r\n")
            append("Content-Length: ${body.size}\r\n")
            append("Cache-Control: no-store\r\n")
            append("Access-Control-Allow-Origin: $allowedOrigin\r\n")
            append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
            append("Access-Control-Allow-Headers: Content-Type, X-Monster-Bridge-Key\r\n")
            append("Access-Control-Allow-Private-Network: true\r\n")
            append("Vary: Origin\r\n")
            append("Connection: close\r\n\r\n")
        }.toByteArray(StandardCharsets.ISO_8859_1)
        BufferedOutputStream(socket.getOutputStream()).use { output ->
            output.write(headers)
            output.write(body)
            output.flush()
        }
    }

    companion object {
        private const val MAX_HEADER_BYTES = 16 * 1024
        private const val MAX_BODY_BYTES = 16 * 1024
    }
}
