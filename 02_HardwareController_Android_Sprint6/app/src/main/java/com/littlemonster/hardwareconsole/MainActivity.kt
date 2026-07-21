package com.littlemonster.hardwareconsole

import android.content.ClipData
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.littlemonster.serial.HexCodec
import java.io.File
import java.io.FileOutputStream
import java.math.BigDecimal
import java.text.SimpleDateFormat
import java.util.ArrayDeque
import java.util.Date
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

class MainActivity : AppCompatActivity(), MultiPortController.Listener {
    private lateinit var controller: MultiPortController
    private lateinit var recorder: SessionRecorder
    private lateinit var sessionDir: File
    private lateinit var portSpinner: Spinner
    private lateinit var baudSpinner: Spinner
    private lateinit var commandSpinner: Spinner
    private lateinit var statusText: TextView
    private lateinit var statsText: TextView
    private lateinit var bridgeStatusText: TextView
    private lateinit var logText: TextView
    private lateinit var logScroll: ScrollView
    private lateinit var txInput: EditText
    private lateinit var unlockCheck: CheckBox
    private lateinit var exportButton: Button
    private lateinit var shareLastButton: Button
    private lateinit var saveLastButton: Button
    private lateinit var exportStatusText: TextView
    private lateinit var mdbSafetyStatusText: TextView
    private lateinit var startCoinFillButton: Button
    private lateinit var stopCoinFillButton: Button
    private lateinit var tubeInfoButton: Button
    private lateinit var billSafetyStatusText: TextView
    private lateinit var startBillTestButton: Button
    private lateinit var stopBillTestButton: Button
    private lateinit var paymentAmountInput: EditText
    private lateinit var orderIdInput: EditText
    private lateinit var orderStatusText: TextView
    private lateinit var paymentStatusText: TextView
    private lateinit var startPaymentButton: Button
    private lateinit var cancelPaymentButton: Button
    private lateinit var reconcilePaymentButton: Button
    private lateinit var retryPrintButton: Button
    private lateinit var simulateTicketIssuedButton: Button
    private lateinit var ticketOrderStore: TicketOrderStore
    private lateinit var ticketOrder: TicketOrderCoordinator

    private val handler = Handler(Looper.getMainLooper())
    private val dataLock = Any()
    private val clock = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
    private val fileClock = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)
    private val startedAt = System.currentTimeMillis()
    private val events = ArrayDeque<PacketEvent>()
    private val states = ExplorerDefaults.ports.associate { it.id to "未連線" }.toMutableMap()
    private val rxPackets = mutableMapOf<String, Long>()
    private val txPackets = mutableMapOf<String, Long>()
    private val rxBytes = mutableMapOf<String, Long>()
    private val txBytes = mutableMapOf<String, Long>()
    private val lastRxAt = mutableMapOf<String, Long>()
    private val queues = ExplorerDefaults.ports.associate { it.id to mutableListOf<ByteArray>() }.toMutableMap()
    @Volatile private var recorderError: String? = null
    private var unlockUntil = 0L
    private var paused = false
    private var lastRenderKey = ""
    @Volatile private var exportRunning = false
    private var lastZipFile: File? = null
    private var pendingSaveZip: File? = null
    private val mdbDecoder = MdbLineDecoder()
    private var coinFillActive = false
    private var coinFillDeadline = 0L
    private var lastMdbTxAt = 0L
    private var fillCoinCount = 0L
    private var fillTubeCount = 0L
    private var fillOverflowCount = 0L
    private var fillValue = BigDecimal.ZERO
    private val fillCountsByType = MutableList(16) { 0L }
    private var mdbSetupSummary = "尚未讀取 Coin Setup"
    private var mdbTubeSummary = "硬幣機 Tube 回報：尚未查詢"
    private var lastMdbDescription = "等待 MDB 資料"
    private var billTestActive = false
    private var billSetupPending = false
    private var billTestDeadline = 0L
    private var billAcceptedCount = 0L
    private var billAcceptedValue = BigDecimal.ZERO
    private var billEnabledTypeIndex: Int? = null
    private var billSetupSummary = "尚未讀取 Bill Setup"
    private var lastBillDescription = "收鈔已停用；ttyS3 出鈔機維持唯讀封鎖"
    private val cashPayment = CashPaymentController()
    private var paymentDeadline = 0L
    private var paymentCoinSetup: CoinSetup? = null
    private var paymentBillSetup: BillSetup? = null
    private var paymentEnabledCoinTypes = emptySet<Int>()
    private var paymentEnabledBillTypeIndex: Int? = null
    private var paymentCommandGeneration = 0L
    private var lastPaymentDescription = "建立售票訂單後開始；本版不找零"
    private var mdbStartupSafetyReady = false
    private var lastPendingRequestNotice: String? = null
    private var ticketStorageFault: String? = null

    private val activePort get() = ExplorerDefaults.ports[portSpinner.selectedItemPosition]
    private val uiTicker = object : Runnable {
        override fun run() {
            refreshStatus()
            refreshStats()
            syncTicketOrderFromStore()
            pollPendingTicketOrderRequest()
            refreshOrderPanel()
            refreshPaymentPanel()
            refreshMdbPanel()
            refreshBillPanel()
            if (!paused) refreshLog()
            handler.postDelayed(this, 500L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        ContextCompat.startForegroundService(this, Intent(this, LocalTicketBridgeService::class.java))
        sessionDir = File(getExternalFilesDir(null), "sessions/explorer_${fileClock.format(Date(startedAt))}").apply { mkdirs() }
        recorder = SessionRecorder(sessionDir)
        controller = MultiPortController(this)
        ticketOrderStore = TicketOrderStore(this)
        ticketOrder = try {
            TicketOrderCoordinator(ticketOrderStore.loadCurrent(), ticketOrderStore.loadUsedOrderIds())
        } catch (t: Throwable) {
            ticketStorageFault = t.message ?: "售票訂單保存資料無法讀取"
            TicketOrderCoordinator()
        }
        val beforeRecovery = ticketOrder.snapshot()
        val recovered = ticketOrder.recoverAfterRestart()
        if (recovered != null && recovered.revision != beforeRecovery?.revision) {
            persistTicketOrder("APP_RESTART_RECOVERY", recovered.message)
        }
        bindViews()
        bridgeStatusText.text = "本機售票橋接：127.0.0.1:${LocalTicketBridgeConfig.PORT}｜配對碼 ${LocalTicketBridgeConfig.pairingKey(this)}\n只需在售票機第一次現金付款時輸入一次"
        setupControls()
        refreshAll(forceLog = true)
        handler.post(uiTicker)
        handler.post { dispatchRecoveredPrintAuthorizationIfNeeded() }
        ticketStorageFault?.let { message -> handler.post { showOrderWarning(message) } }
        toast("Sprint 6 ready：售票機本機現金橋接已啟用")
    }

    private fun bindViews() {
        portSpinner = findViewById(R.id.portSpinner); baudSpinner = findViewById(R.id.baudSpinner)
        commandSpinner = findViewById(R.id.commandSpinner); statusText = findViewById(R.id.statusText)
        statsText = findViewById(R.id.statsText); bridgeStatusText = findViewById(R.id.bridgeStatusText)
        logText = findViewById(R.id.logText)
        logScroll = findViewById(R.id.logScroll); txInput = findViewById(R.id.txInput)
        unlockCheck = findViewById(R.id.txUnlockCheck)
        exportButton = findViewById(R.id.exportButton); shareLastButton = findViewById(R.id.shareLastButton)
        saveLastButton = findViewById(R.id.saveLastButton); exportStatusText = findViewById(R.id.exportStatusText)
        mdbSafetyStatusText = findViewById(R.id.mdbSafetyStatusText)
        startCoinFillButton = findViewById(R.id.startCoinFillButton)
        stopCoinFillButton = findViewById(R.id.stopCoinFillButton)
        tubeInfoButton = findViewById(R.id.tubeInfoButton)
        billSafetyStatusText = findViewById(R.id.billSafetyStatusText)
        startBillTestButton = findViewById(R.id.startBillTestButton)
        stopBillTestButton = findViewById(R.id.stopBillTestButton)
        paymentAmountInput = findViewById(R.id.paymentAmountInput)
        orderIdInput = findViewById(R.id.orderIdInput)
        orderStatusText = findViewById(R.id.orderStatusText)
        paymentStatusText = findViewById(R.id.paymentStatusText)
        startPaymentButton = findViewById(R.id.startPaymentButton)
        cancelPaymentButton = findViewById(R.id.cancelPaymentButton)
        reconcilePaymentButton = findViewById(R.id.reconcilePaymentButton)
        retryPrintButton = findViewById(R.id.retryPrintButton)
        simulateTicketIssuedButton = findViewById(R.id.simulateTicketIssuedButton)
    }

    private fun setupControls() {
        portSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, ExplorerDefaults.ports.map { it.label })
        baudSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("9600", "19200", "38400", "57600", "115200"))
        commandSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
            ExplorerDefaults.commands.map { "[${it.group}] ${it.name} · ${it.hex}" })
        portSpinner.onItemSelectedListener = Selected { lastRenderKey = ""; refreshAll(forceLog = true) }
        commandSpinner.onItemSelectedListener = Selected { txInput.setText(ExplorerDefaults.commands[commandSpinner.selectedItemPosition].hex) }
        findViewById<Button>(R.id.connectButton).setOnClickListener { controller.open(activePort, baudSpinner.selectedItem.toString().toInt()) }
        findViewById<Button>(R.id.disconnectButton).setOnClickListener { disconnectActivePort() }
        startCoinFillButton.setOnClickListener { startCoinFill() }
        stopCoinFillButton.setOnClickListener { stopCoinFill("使用者停止") }
        tubeInfoButton.setOnClickListener { requestTubeInfo() }
        startBillTestButton.setOnClickListener { startBillTest() }
        stopBillTestButton.setOnClickListener { stopBillTest("使用者停止") }
        startPaymentButton.setOnClickListener { startCashPayment() }
        cancelPaymentButton.setOnClickListener { cancelCashPayment("使用者取消付款") }
        reconcilePaymentButton.setOnClickListener { confirmPaymentReconciliation() }
        retryPrintButton.setOnClickListener { retryPrintAuthorization() }
        simulateTicketIssuedButton.setOnClickListener { simulateTicketIssuedAcknowledgement() }
        findViewById<Button>(R.id.addQueueButton).setOnClickListener { addQueue() }
        findViewById<Button>(R.id.sendButton).setOnClickListener { sendNext(activePort) }
        findViewById<Button>(R.id.sendAllButton).setOnClickListener { sendAll() }
        findViewById<Button>(R.id.clearButton).setOnClickListener {
            synchronized(dataLock) { events.clear() }
            lastRenderKey = ""; refreshAll(forceLog = true)
        }
        findViewById<Button>(R.id.pauseButton).setOnClickListener {
            paused = !paused
            (it as Button).text = if (paused) "繼續顯示" else "暫停顯示"
            if (!paused) { lastRenderKey = ""; refreshLog() }
        }
        exportButton.setOnClickListener { exportSession() }
        shareLastButton.setOnClickListener { lastZipFile?.let(::shareZip) ?: toast("尚未建立 ZIP") }
        saveLastButton.setOnClickListener { lastZipFile?.let(::chooseSaveLocation) ?: toast("尚未建立 ZIP") }
        unlockCheck.setOnCheckedChangeListener { _, checked ->
            unlockUntil = if (checked) System.currentTimeMillis() + 60_000L else 0L
            if (checked) handler.postDelayed({ if (System.currentTimeMillis() >= unlockUntil) unlockCheck.isChecked = false }, 60_100L)
        }
    }

    private fun addQueue() = try {
        val bytes = HexCodec.decode(txInput.text.toString())
        if (bytes.isEmpty()) toast("請輸入 HEX") else if (activePort.id == NOTE_DISPENSER_PORT_ID) {
            toast("安全封鎖：ttyS3 是出鈔找零機，Sprint 5 禁止全部 TX")
        } else if (activePort.id == MDB_PORT_ID) {
            val decision = MdbSafetyPolicy.validate(bytes)
            if (!decision.allowed) toast("安全封鎖：${decision.message}") else {
                queues.getValue(activePort.id).add(bytes); refreshQueue(); toast("已加入安全 MDB Queue：${decision.message}")
            }
        } else {
            queues.getValue(activePort.id).add(bytes); refreshQueue(); toast("已加入 ${activePort.label} Queue")
        }
    } catch (e: IllegalArgumentException) { toast(e.message ?: "HEX 格式錯誤") }

    private fun sendNext(port: PortProfile): Boolean {
        if (!unlocked()) { toast("請先解除 TX 鎖定"); return false }
        if (port.id == NOTE_DISPENSER_PORT_ID) {
            toast("安全封鎖：ttyS3 是出鈔找零機，禁止傳送指令")
            return false
        }
        val queue = queues.getValue(port.id)
        if (queue.isEmpty()) { toast("目前 Port 的 Queue 是空的"); return false }
        if (port.id == MDB_PORT_ID) {
            val decision = MdbSafetyPolicy.validate(queue.first())
            if (!decision.allowed) { toast("安全封鎖：${decision.message}"); return false }
            if (System.currentTimeMillis() - lastMdbTxAt < MDB_COMMAND_INTERVAL_MS) {
                toast("MDB 指令需至少間隔 200ms，請稍候"); return false
            }
        }
        val result = controller.write(port, queue.first())
        if (result < 0) { toast("傳送失敗：$result"); return false }
        if (port.id == MDB_PORT_ID) lastMdbTxAt = System.currentTimeMillis()
        queue.removeAt(0); refreshQueue(); return true
    }

    private fun sendAll() {
        if (!unlocked()) { toast("請先解除 TX 鎖定"); return }
        val port = activePort
        fun step() { if (queues.getValue(port.id).isNotEmpty() && sendNext(port)) handler.postDelayed({ step() }, 250L) }
        step()
    }

    private fun unlocked() = unlockCheck.isChecked && System.currentTimeMillis() < unlockUntil

    private data class PaymentMdbCommand(
        val bytes: ByteArray,
        val label: String,
        val decision: MdbSafetyDecision,
        val expectCoinSetup: Boolean = false,
        val expectBillSetup: Boolean = false
    )

    private fun startCashPayment(pendingRequestId: String? = null, ticketAppPackage: String? = null) {
        ticketStorageFault?.let { showOrderWarning(it); return }
        val previous = cashPayment.snapshot()
        if (previous.requiresReconciliation) {
            android.app.AlertDialog.Builder(this)
                .setTitle("上一筆現金尚未處理")
                .setMessage("上一筆已收 NT$${previous.paid}，狀態為 ${paymentStatusLabel(previous.status)}。請先人工退款或完成記帳，再按『確認已人工處理』。")
                .setPositiveButton("確定", null)
                .show()
            return
        }
        val previousOrder = ticketOrder.snapshot()
        if (previousOrder?.requiresReconciliation == true) {
            android.app.AlertDialog.Builder(this)
                .setTitle("上一筆售票訂單尚未處理")
                .setMessage("訂單 ${previousOrder.orderId} 已收 NT$${previousOrder.paid}，禁止開始新訂單。請先人工退款或完成記帳。")
                .setPositiveButton("確定", null)
                .show()
            return
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) { toast("請先將 ttyS1 以 9600 連線"); return }
        if (!states[port.id].orEmpty().contains("@ 9600")) { toast("安全限制：現金付款必須使用 ttyS1／9600"); return }
        if (!mdbStartupSafetyReady) { toast("正在執行連線後安全停用，請稍候再開始"); return }
        if (coinFillActive || billTestActive || billSetupPending) {
            if (coinFillActive) stopCoinFill("切換到現金付款")
            if (billTestActive || billSetupPending) stopBillTest("切換到現金付款")
            handler.postDelayed({ startCashPayment(pendingRequestId, ticketAppPackage) }, 500L)
            return
        }
        val amount = try {
            BigDecimal(paymentAmountInput.text.toString().trim())
        } catch (_: Throwable) {
            toast("請輸入正確的應付金額")
            return
        }
        val orderId = orderIdInput.text.toString().trim().ifEmpty {
            "ORD-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())}"
        }
        orderIdInput.setText(orderId)
        try {
            cashPayment.start(amount)
        } catch (t: Throwable) {
            toast(t.message ?: "無法開始付款")
            return
        }
        val orderStart = try {
            ticketOrder.startOrder(orderId, amount, ticketAppPackage)
        } catch (t: Throwable) {
            cashPayment.cancel("售票訂單建立失敗")
            toast(t.message ?: "無法建立售票訂單")
            return
        }
        if (!orderStart.created) {
            cashPayment.cancel("重複訂單請求")
            ticketOrderStore.clearPendingRequest(pendingRequestId.orEmpty())
            toast("訂單 ${orderStart.record.orderId} 已存在，未重複開始收款")
            return
        }
        try {
            persistTicketOrder("ORDER_CREATED", "order=$orderId amount=${orderStart.record.amount}")
            if (pendingRequestId != null) ticketOrderStore.clearPendingRequest(pendingRequestId)
        } catch (t: Throwable) {
            cashPayment.cancel("訂單保存失敗")
            ticketOrder.stopPayment("訂單保存失敗，未啟用收款")
            toast("安全停止：${t.message ?: "無法保存訂單"}")
            return
        }
        paymentDeadline = System.currentTimeMillis() + CASH_PAYMENT_TIMEOUT_MS
        paymentCoinSetup = null
        paymentBillSetup = null
        paymentEnabledCoinTypes = emptySet()
        paymentEnabledBillTypeIndex = null
        lastPaymentDescription = "訂單 $orderId 已保存；安全關閉舊狀態後讀取 Coin Setup 與 Bill Setup"
        val token = ++paymentCommandGeneration
        val commands = listOf(
            PaymentMdbCommand(MdbCommands.COIN_DISABLE, "先停止收幣", MdbSafetyPolicy.validate(MdbCommands.COIN_DISABLE)),
            PaymentMdbCommand(MdbCommands.BILL_DISABLE, "先停止收鈔", MdbSafetyPolicy.validate(MdbCommands.BILL_DISABLE)),
            PaymentMdbCommand(MdbCommands.COIN_SETUP, "讀取 Coin Setup", MdbSafetyPolicy.validate(MdbCommands.COIN_SETUP), expectCoinSetup = true),
            PaymentMdbCommand(MdbCommands.BILL_SETUP, "讀取 Bill Setup", MdbSafetyPolicy.validate(MdbCommands.BILL_SETUP), expectBillSetup = true)
        )
        runPaymentMdbSequence(token, commands)
        handler.postDelayed({
            if (token == paymentCommandGeneration && cashPayment.snapshot().status == CashPaymentStatus.PREPARING) {
                failCashPayment("現金模組 Setup 逾時，未啟用收款")
            }
        }, PAYMENT_SETUP_TIMEOUT_MS)
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun activateCashPaymentIfReady() {
        if (cashPayment.snapshot().status != CashPaymentStatus.PREPARING) return
        if (paymentCoinSetup == null || paymentBillSetup == null) return
        try {
            cashPayment.markReady()
        } catch (t: Throwable) {
            failCashPayment(t.message ?: "付款狀態異常")
            return
        }
        updatePaymentAcceptance("設定驗證完成，開始收款")
    }

    private fun updatePaymentAcceptance(reason: String) {
        val snapshot = cashPayment.snapshot()
        if (snapshot.status != CashPaymentStatus.ACCEPTING) return
        val coinSetup = paymentCoinSetup ?: return failCashPayment("缺少 Coin Setup")
        val billSetup = paymentBillSetup ?: return failCashPayment("缺少 Bill Setup")
        val coinTypes = PaymentAcceptancePolicy.safeCoinTypeIndices(coinSetup, snapshot.remaining)
        val billType = PaymentAcceptancePolicy.safeHundredBillTypeIndex(billSetup, snapshot.remaining)
        if (snapshot.remaining > 0 && coinTypes.isEmpty() && billType == null) {
            failCashPayment("尚差${snapshot.remaining}元，但沒有安全可用的面額")
            return
        }
        paymentEnabledCoinTypes = coinTypes
        paymentEnabledBillTypeIndex = billType
        val coinCommand = MdbCommands.coinEnableTypes(coinTypes)
        val billCommand = billType?.let(MdbCommands::billEnableSingleType) ?: MdbCommands.BILL_DISABLE
        val coinDecision = MdbSafetyPolicy.validateCoinPaymentEnable(coinCommand, coinTypes)
        val billDecision = billType?.let { MdbSafetyPolicy.validateSingleBillEnable(billCommand, it) }
            ?: MdbSafetyPolicy.validate(MdbCommands.BILL_DISABLE)
        val token = ++paymentCommandGeneration
        runPaymentMdbSequence(token, listOf(
            PaymentMdbCommand(coinCommand, "更新付款硬幣面額", coinDecision),
            PaymentMdbCommand(billCommand, if (billType == null) "停用100元" else "啟用100元", billDecision)
        ))
        val coinLabels = PaymentAcceptancePolicy.labels(coinSetup, coinTypes).ifEmpty { listOf("無") }.joinToString("／")
        lastPaymentDescription = "$reason｜可收硬幣 $coinLabels｜100元紙鈔${if (billType == null) "停用" else "啟用"}"
        refreshPaymentPanel()
    }

    private fun runPaymentMdbSequence(
        token: Long,
        commands: List<PaymentMdbCommand>,
        index: Int = 0,
        failOnError: Boolean = true
    ) {
        if (token != paymentCommandGeneration || index >= commands.size) return
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) {
            if (failOnError) failCashPayment("ttyS1 已中斷") else lastPaymentDescription = "${commands[index].label}失敗：ttyS1 已中斷"
            return
        }
        val item = commands[index]
        if (!item.decision.allowed) {
            if (failOnError) failCashPayment("安全驗證封鎖 ${item.label}：${item.decision.message}")
            else lastPaymentDescription = "安全驗證封鎖 ${item.label}：${item.decision.message}"
            return
        }
        val delay = (MDB_COMMAND_INTERVAL_MS - (System.currentTimeMillis() - lastMdbTxAt)).coerceAtLeast(0L)
        handler.postDelayed({
            if (token != paymentCommandGeneration || !controller.isOpen(port)) return@postDelayed
            if (item.expectCoinSetup) mdbDecoder.expectSetup()
            if (item.expectBillSetup) mdbDecoder.expectBillSetup()
            val result = controller.write(port, item.bytes)
            if (result <= 0) {
                if (failOnError) failCashPayment("${item.label}傳送失敗：$result")
                else lastPaymentDescription = "${item.label}傳送失敗：$result"
                return@postDelayed
            }
            lastMdbTxAt = System.currentTimeMillis()
            runPaymentMdbSequence(token, commands, index + 1, failOnError)
        }, delay)
    }

    private fun processPaymentCash(kind: CashKind, denomination: BigDecimal?, eventId: String) {
        val before = cashPayment.snapshot()
        if (!before.isActive) return
        if (denomination == null) {
            failCashPayment("收到未知現金面額，已立即停止")
            return
        }
        val durableResult = try {
            ticketOrder.recordCashEvent(eventId, kind, denomination).also { result ->
                if (result.recorded) {
                    persistTicketOrder(
                        "CASH_RECORDED",
                        "order=${result.record.orderId} event=$eventId kind=$kind value=${denomination.money()} paid=${result.record.paid}"
                    )
                }
            }
        } catch (t: Throwable) {
            runCatching { cashPayment.accept(kind, denomination) }
            ticketOrder.forceReconciliation("現金已進入但交易紀錄保存失敗：${t.message ?: t.javaClass.simpleName}")
            runCatching { persistTicketOrder("PERSISTENCE_FAILURE", t.message ?: t.javaClass.simpleName) }
            stopPaymentAcceptors("交易紀錄保存失敗", kind)
            showPaymentReconciliationWarning(cashPayment.snapshot())
            refreshOrderPanel(); refreshPaymentPanel()
            return
        }
        if (durableResult.duplicate) {
            ticketOrderStore.appendAudit("CASH_DUPLICATE_BLOCKED", "event=$eventId order=${durableResult.record.orderId}")
            return
        }
        if (!durableResult.recorded) {
            ticketOrderStore.appendAudit("CASH_LATE_EVENT_BLOCKED", "event=$eventId order=${durableResult.record.orderId} status=${durableResult.record.status}")
            return
        }
        val result = try {
            cashPayment.accept(kind, denomination)
        } catch (t: Throwable) {
            ticketOrder.forceReconciliation("現金控制器狀態不一致：${t.message ?: "無法記錄"}")
            persistTicketOrder("CONTROLLER_MISMATCH", t.message ?: "現金事件無法記錄")
            failCashPayment(t.message ?: "現金事件無法記錄")
            return
        }
        if (!result.recorded) return
        val snapshot = result.snapshot
        if (snapshot.paid != durableResult.record.paid) {
            ticketOrder.forceReconciliation("持久訂單與現金控制器金額不一致")
            persistTicketOrder("AMOUNT_MISMATCH", "cash=${snapshot.paid} order=${durableResult.record.paid}")
            stopPaymentAcceptors("交易金額不一致", kind)
            showPaymentReconciliationWarning(snapshot)
            refreshOrderPanel(); refreshPaymentPanel()
            return
        }
        lastPaymentDescription = "收到${if (kind == CashKind.COIN) "硬幣" else "紙鈔"} NT$${denomination.money()}｜${snapshot.message}"
        when (snapshot.status) {
            CashPaymentStatus.COMPLETED -> {
                stopPaymentAcceptors("付款完成", kind)
                dispatchPrintAuthorizationOnce()
                toast("付款完成：NT$${snapshot.paid}，已建立唯一出票授權")
            }
            CashPaymentStatus.ERROR -> {
                stopPaymentAcceptors(snapshot.message, kind)
                showPaymentReconciliationWarning(snapshot)
            }
            CashPaymentStatus.ACCEPTING -> updatePaymentAcceptance("已更新尚差金額")
            else -> Unit
        }
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun cancelCashPayment(reason: String, notifyUser: Boolean = true) {
        val before = cashPayment.snapshot()
        if (!before.isActive) { toast("目前沒有進行中的付款"); return }
        val snapshot = cashPayment.cancel(reason)
        ticketOrder.stopPayment(reason)
        runCatching { persistTicketOrder("PAYMENT_CANCELED", reason) }
        notifyTicketPaymentStopped(reason)
        stopPaymentAcceptors(reason)
        if (notifyUser && snapshot.requiresReconciliation) showPaymentReconciliationWarning(snapshot)
        else if (notifyUser) toast("付款已取消，未收到現金")
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun timeoutCashPayment() {
        val snapshot = cashPayment.timeout()
        ticketOrder.stopPayment("付款逾時")
        runCatching { persistTicketOrder("PAYMENT_TIMEOUT", "付款逾時") }
        notifyTicketPaymentStopped("付款逾時")
        stopPaymentAcceptors("付款逾時")
        if (snapshot.requiresReconciliation) showPaymentReconciliationWarning(snapshot)
        else toast("付款逾時，未收到現金")
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun failCashPayment(reason: String) {
        val snapshot = cashPayment.fail(reason)
        ticketOrder.stopPayment(reason)
        runCatching { persistTicketOrder("PAYMENT_FAILED", reason) }
        notifyTicketPaymentStopped(reason)
        stopPaymentAcceptors(reason)
        if (snapshot.requiresReconciliation) showPaymentReconciliationWarning(snapshot)
        else toast("付款安全停止：$reason")
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun stopPaymentAcceptors(reason: String, source: CashKind? = null) {
        paymentDeadline = 0L
        paymentEnabledCoinTypes = emptySet()
        paymentEnabledBillTypeIndex = null
        val token = ++paymentCommandGeneration
        val coinDisable = PaymentMdbCommand(MdbCommands.COIN_DISABLE, "停止收幣", MdbSafetyPolicy.validate(MdbCommands.COIN_DISABLE))
        val billDisable = PaymentMdbCommand(MdbCommands.BILL_DISABLE, "停止收鈔", MdbSafetyPolicy.validate(MdbCommands.BILL_DISABLE))
        val commands = if (source == CashKind.BILL) listOf(billDisable, coinDisable) else listOf(coinDisable, billDisable)
        runPaymentMdbSequence(token, commands, failOnError = false)
        lastPaymentDescription = "$reason；收幣與收鈔均已排程停用"
    }

    private fun showPaymentReconciliationWarning(snapshot: CashPaymentSnapshot) {
        android.app.AlertDialog.Builder(this)
            .setTitle("需要人工處理現金")
            .setMessage("本筆已實收 NT$${snapshot.paid}，但付款狀態是${paymentStatusLabel(snapshot.status)}。\n\n請先人工退款或完成記帳；處理完再按『確認已人工處理』。系統不會自動出幣或出鈔。")
            .setPositiveButton("知道了", null)
            .show()
    }

    private fun confirmPaymentReconciliation() {
        val snapshot = cashPayment.snapshot()
        val order = ticketOrder.snapshot()
        if (!snapshot.requiresReconciliation && order?.requiresReconciliation != true) {
            toast("目前沒有待人工處理的款項")
            return
        }
        val paid = maxOf(snapshot.paid, order?.paid ?: 0)
        android.app.AlertDialog.Builder(this)
            .setTitle("確認現金已處理")
            .setMessage("確認 NT$$paid 已人工退款或完成記帳？確認後才會解除鎖定；此訂單仍禁止出票。")
            .setPositiveButton("已處理，清除") { _, _ ->
                if (cashPayment.snapshot().requiresReconciliation) cashPayment.acknowledgeReconciliation()
                if (ticketOrder.snapshot()?.requiresReconciliation == true) {
                    ticketOrder.acknowledgeReconciliation("操作人員已確認退款或記帳")
                }
                persistTicketOrder("RECONCILIATION_CONFIRMED", "operator confirmed")
                lastPaymentDescription = "人工處理已確認，可開始下一筆付款"
                refreshOrderPanel(); refreshPaymentPanel()
            }
            .setNegativeButton("尚未處理", null)
            .show()
    }

    private fun paymentStatusLabel(status: CashPaymentStatus): String = when (status) {
        CashPaymentStatus.IDLE -> "待機"
        CashPaymentStatus.PREPARING -> "準備中"
        CashPaymentStatus.ACCEPTING -> "收款中"
        CashPaymentStatus.COMPLETED -> "付款完成"
        CashPaymentStatus.CANCELED -> "已取消"
        CashPaymentStatus.TIMED_OUT -> "已逾時"
        CashPaymentStatus.ERROR -> "異常停止"
    }

    private fun persistTicketOrder(event: String, detail: String) {
        try {
            ticketOrderStore.save(ticketOrder.snapshot(), ticketOrder.usedOrderIds())
            ticketOrderStore.appendAudit(event, detail)
        } catch (t: Throwable) {
            ticketStorageFault = t.message ?: "售票訂單無法保存"
            throw t
        }
    }

    private fun dispatchPrintAuthorizationOnce() {
        val authorization = ticketOrder.claimAutomaticPrintAuthorization() ?: return
        try {
            persistTicketOrder(
                "PRINT_AUTHORIZATION_CLAIMED",
                "order=${authorization.orderId} authorization=${authorization.authorizationId} attempt=${authorization.dispatchAttempt}"
            )
        } catch (t: Throwable) {
            ticketOrder.forceReconciliation("出票授權無法持久保存")
            runCatching { persistTicketOrder("PRINT_AUTHORIZATION_SAVE_FAILED", t.message ?: t.javaClass.simpleName) }
            showOrderWarning("出票授權保存失敗，已禁止出票並要求人工處理")
            return
        }
        emitPrintAuthorization(authorization)
    }

    private fun dispatchRecoveredPrintAuthorizationIfNeeded() {
        if (ticketOrder.snapshot()?.status == TicketOrderStatus.PAID_WAITING_DISPATCH) {
            dispatchPrintAuthorizationOnce()
            refreshOrderPanel()
        }
    }

    private fun retryPrintAuthorization() {
        val authorization = ticketOrder.retryPrintAuthorization()
        if (authorization == null) {
            toast("目前沒有可重送的出票授權")
            return
        }
        persistTicketOrder(
            "PRINT_AUTHORIZATION_RETRY",
            "order=${authorization.orderId} authorization=${authorization.authorizationId} attempt=${authorization.dispatchAttempt}"
        )
        emitPrintAuthorization(authorization)
        toast("已重送同一出票授權；售票機不得重複列印")
        refreshOrderPanel()
    }

    private fun emitPrintAuthorization(authorization: PrintAuthorization) {
        if (authorization.ticketAppPackage == LocalTicketBridgeConfig.WEB_CLIENT_PACKAGE) {
            ticketOrderStore.appendAudit(
                "WEB_PRINT_AUTHORIZATION_READY",
                "order=${authorization.orderId} authorization=${authorization.authorizationId} attempt=${authorization.dispatchAttempt}"
            )
            handler.postDelayed({ moveTaskToBack(true) }, 350L)
            return
        }
        val intent = Intent(TicketCashContract.ACTION_PRINT_AUTHORIZED).apply {
            authorization.ticketAppPackage?.let { setPackage(it) }
            putExtra(TicketCashContract.EXTRA_ORDER_ID, authorization.orderId)
            putExtra(TicketCashContract.EXTRA_AMOUNT_NTD, authorization.amount)
            putExtra(TicketCashContract.EXTRA_PAID_NTD, authorization.amount)
            putExtra(TicketCashContract.EXTRA_PAYMENT_ID, authorization.paymentId)
            putExtra(TicketCashContract.EXTRA_PRINT_AUTHORIZATION_ID, authorization.authorizationId)
            putExtra(TicketCashContract.EXTRA_PAID_AT, authorization.paidAt)
            putExtra(TicketCashContract.EXTRA_DISPATCH_ATTEMPT, authorization.dispatchAttempt)
        }
        sendBroadcast(intent, TicketCashContract.BRIDGE_PERMISSION)
        ticketOrderStore.appendAudit(
            "PRINT_AUTHORIZATION_BROADCAST",
            "order=${authorization.orderId} authorization=${authorization.authorizationId} attempt=${authorization.dispatchAttempt}"
        )
    }

    private fun simulateTicketIssuedAcknowledgement() {
        val current = ticketOrder.snapshot()
        val authorizationId = current?.printAuthorizationId
        if (current == null || authorizationId == null) {
            toast("目前沒有出票授權")
            return
        }
        val result = ticketOrder.acknowledgeTicketIssued(current.orderId, authorizationId)
        when {
            result.accepted -> {
                persistTicketOrder("TICKET_ISSUED_TEST_ACK", "order=${current.orderId} authorization=$authorizationId")
                toast("測試成功：售票機已確認出票")
            }
            result.duplicate -> toast("此出票授權已完成，重複確認已忽略")
            else -> toast("目前狀態不可確認出票")
        }
        refreshOrderPanel(); refreshPaymentPanel()
    }

    private fun notifyTicketPaymentStopped(reason: String) {
        val order = ticketOrder.snapshot() ?: return
        if (order.ticketAppPackage == LocalTicketBridgeConfig.WEB_CLIENT_PACKAGE) {
            ticketOrderStore.appendAudit(
                "WEB_PAYMENT_STOPPED",
                "order=${order.orderId} paid=${order.paid} reason=$reason"
            )
            handler.postDelayed({ moveTaskToBack(true) }, 350L)
            return
        }
        sendBroadcast(Intent(TicketCashContract.ACTION_PAYMENT_STOPPED).apply {
            order.ticketAppPackage?.let { setPackage(it) }
            putExtra(TicketCashContract.EXTRA_ORDER_ID, order.orderId)
            putExtra(TicketCashContract.EXTRA_AMOUNT_NTD, order.amount)
            putExtra(TicketCashContract.EXTRA_PAID_NTD, order.paid)
            putExtra(TicketCashContract.EXTRA_REASON, reason)
        }, TicketCashContract.BRIDGE_PERMISSION)
    }

    private fun syncTicketOrderFromStore() {
        if (ticketStorageFault != null) return
        if (cashPayment.snapshot().isActive) return
        val disk = ticketOrderStore.loadCurrent() ?: return
        val memory = ticketOrder.snapshot()
        if (memory == null || disk.orderId != memory.orderId || disk.revision > memory.revision) {
            ticketOrder = TicketOrderCoordinator(disk, ticketOrderStore.loadUsedOrderIds())
        }
    }

    private fun pollPendingTicketOrderRequest() {
        if (ticketStorageFault != null) return
        val request = ticketOrderStore.loadPendingRequest() ?: return
        val current = ticketOrder.snapshot()
        if (current?.orderId == request.orderId) {
            ticketOrderStore.clearPendingRequest(request.requestId)
            ticketOrderStore.appendAudit(
                "REQUEST_ALREADY_HANDLED",
                "request=${request.requestId} order=${request.orderId} status=${current.status}"
            )
            return
        }
        if (request.orderId in ticketOrder.usedOrderIds()) {
            ticketOrderStore.clearPendingRequest(request.requestId)
            ticketOrderStore.appendAudit("REQUEST_REPLAY_BLOCKED", "request=${request.requestId} order=${request.orderId}")
            showOrderWarning("售票機重送已完成的訂單 ${request.orderId}，系統已封鎖重複收款")
            return
        }
        orderIdInput.setText(request.orderId)
        paymentAmountInput.setText(request.amount.toString())
        if (lastPendingRequestNotice != request.requestId) {
            lastPendingRequestNotice = request.requestId
            lastPaymentDescription = "已收到售票機訂單 ${request.orderId}／NT$${request.amount}，等待 ttyS1 安全連線"
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val canStart = controller.isOpen(port) && states[port.id].orEmpty().contains("@ 9600") &&
            mdbStartupSafetyReady && !cashPayment.snapshot().isActive &&
            (current == null || current.isTerminal) && !coinFillActive && !billTestActive && !billSetupPending
        if (canStart) startCashPayment(request.requestId, request.ticketAppPackage)
    }

    private fun refreshOrderPanel() {
        ticketStorageFault?.let { fault ->
            orderStatusText.text = "訂單保存資料錯誤｜已禁止收款與出票\n$fault"
            orderStatusText.setBackgroundColor(android.graphics.Color.parseColor("#FFCDD2"))
            retryPrintButton.isEnabled = false
            simulateTicketIssuedButton.isEnabled = false
            return
        }
        val order = ticketOrder.snapshot()
        if (order == null) {
            orderStatusText.text = "尚無售票訂單｜可由售票機送入，或手動輸入測試訂單"
            orderStatusText.setBackgroundColor(android.graphics.Color.parseColor("#E8EAF6"))
            retryPrintButton.isEnabled = false
            simulateTicketIssuedButton.isEnabled = false
            return
        }
        val breakdown = order.counts.entries.sortedBy { it.key }
            .joinToString("、") { "NT$${it.key}×${it.value}" }.ifEmpty { "尚無" }
        orderStatusText.text = "訂單 ${order.orderId}｜${ticketOrderStatusLabel(order.status)}｜版本 ${order.revision}\n" +
            "售票 App ${order.ticketAppPackage ?: "手動測試／未指定"}\n" +
            "應付 NT$${order.amount}｜實收 NT$${order.paid}｜$breakdown\n" +
            "付款ID ${order.paymentId ?: "尚未建立"}\n" +
            "出票授權 ${order.printAuthorizationId ?: "尚未建立"}｜通知 ${order.dispatchCount} 次\n" +
            "${order.message}"
        orderStatusText.setBackgroundColor(when (order.status) {
            TicketOrderStatus.TICKET_ISSUED -> android.graphics.Color.parseColor("#C8E6C9")
            TicketOrderStatus.PAID_WAITING_DISPATCH, TicketOrderStatus.PRINT_AUTHORIZED -> android.graphics.Color.parseColor("#FFF9C4")
            TicketOrderStatus.RECONCILIATION_REQUIRED -> android.graphics.Color.parseColor("#FFCDD2")
            TicketOrderStatus.CANCELED -> android.graphics.Color.parseColor("#EEEEEE")
            TicketOrderStatus.PAYMENT_PENDING -> android.graphics.Color.parseColor("#E3F2FD")
        })
        retryPrintButton.isEnabled = order.status == TicketOrderStatus.PRINT_AUTHORIZED
        simulateTicketIssuedButton.isEnabled = order.status == TicketOrderStatus.PRINT_AUTHORIZED
    }

    private fun ticketOrderStatusLabel(status: TicketOrderStatus): String = when (status) {
        TicketOrderStatus.PAYMENT_PENDING -> "等待／進行付款"
        TicketOrderStatus.PAID_WAITING_DISPATCH -> "已付款，等待出票授權"
        TicketOrderStatus.PRINT_AUTHORIZED -> "已通知出票，等待確認"
        TicketOrderStatus.TICKET_ISSUED -> "已出票"
        TicketOrderStatus.CANCELED -> "已取消，不可出票"
        TicketOrderStatus.RECONCILIATION_REQUIRED -> "需人工處理，不可出票"
    }

    private fun showOrderWarning(message: String) {
        android.app.AlertDialog.Builder(this)
            .setTitle("售票訂單安全警示")
            .setMessage(message)
            .setPositiveButton("知道了", null)
            .show()
    }

    private fun startCoinFill() {
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) { toast("請先將 ttyS1 以 9600 連線"); return }
        if (!states[port.id].orEmpty().contains("@ 9600")) { toast("安全限制：ttyS1 必須使用 9600 baud"); return }
        if (!mdbStartupSafetyReady) { toast("正在執行連線後安全停用，請稍候"); return }
        if (ticketOrder.snapshot()?.let { !it.isTerminal } == true) { toast("售票訂單尚未結束，禁止進入補幣模式"); return }
        if (cashPayment.snapshot().isActive) { toast("請先取消現金付款"); return }
        if (billTestActive || billSetupPending) {
            stopBillTest("切換到硬幣補幣")
            handler.postDelayed({ startCoinFill() }, 300L)
            return
        }
        if (coinFillActive) { toast("補幣模式已啟用"); return }
        synchronized(dataLock) {
            fillCoinCount = 0L; fillTubeCount = 0L; fillOverflowCount = 0L; fillValue = BigDecimal.ZERO
            fillCountsByType.indices.forEach { fillCountsByType[it] = 0L }
            lastMdbDescription = "正在讀取 Coin Setup…"
        }
        coinFillActive = true
        coinFillDeadline = System.currentTimeMillis() + COIN_FILL_TIMEOUT_MS
        mdbDecoder.expectSetup()
        sendSafeMdb(MdbCommands.COIN_SETUP, "Coin Setup")
        handler.postDelayed({
            if (!coinFillActive || !controller.isOpen(port)) return@postDelayed
            sendSafeMdb(MdbCommands.COIN_ENABLE_FILL, "啟用補幣")
            synchronized(dataLock) { lastMdbDescription = "補幣已啟用；可投入硬幣" }
            refreshMdbPanel()
        }, 350L)
        refreshMdbPanel()
    }

    private fun stopCoinFill(reason: String, sendDisable: Boolean = true) {
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val wasActive = coinFillActive
        coinFillActive = false
        coinFillDeadline = 0L
        if (sendDisable && controller.isOpen(port)) sendSafeMdb(MdbCommands.COIN_DISABLE, "停止補幣", enforceInterval = false)
        synchronized(dataLock) { lastMdbDescription = "補幣已停止：$reason" }
        refreshMdbPanel()
        if (wasActive) toast("補幣已停止：$reason")
    }

    private fun requestTubeInfo() {
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) { toast("請先將 ttyS1 以 9600 連線"); return }
        if (ticketOrder.snapshot()?.let { !it.isTerminal } == true) { toast("售票訂單尚未結束，暫停查詢 Tube"); return }
        mdbDecoder.expectTubeInfo()
        sendSafeMdb(MdbCommands.COIN_TUBE_INFO, "Tube Info")
        synchronized(dataLock) { lastMdbDescription = "正在查詢 Tube Info…" }
        refreshMdbPanel()
    }

    private fun startBillTest() {
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) { toast("請先將 ttyS1 以 9600 連線"); return }
        if (!states[port.id].orEmpty().contains("@ 9600")) { toast("安全限制：收鈔器位於 ttyS1，必須使用 9600 baud"); return }
        if (!mdbStartupSafetyReady) { toast("正在執行連線後安全停用，請稍候"); return }
        if (ticketOrder.snapshot()?.let { !it.isTerminal } == true) { toast("售票訂單尚未結束，禁止紙鈔測試"); return }
        if (cashPayment.snapshot().isActive) { toast("請先取消現金付款"); return }
        if (coinFillActive) {
            stopCoinFill("切換到紙鈔測試")
            handler.postDelayed({ startBillTest() }, 300L)
            return
        }
        if (billTestActive || billSetupPending) { toast("單張100元測試已啟動"); return }
        synchronized(dataLock) {
            billAcceptedCount = 0L
            billAcceptedValue = BigDecimal.ZERO
            billEnabledTypeIndex = null
            billSetupSummary = "正在讀取 Bill Setup…"
            lastBillDescription = "尚未啟用收鈔；正在確認100元類型"
        }
        billTestActive = true
        billSetupPending = true
        billTestDeadline = System.currentTimeMillis() + BILL_TEST_TIMEOUT_MS
        mdbDecoder.expectBillSetup()
        sendSafeMdb(MdbCommands.BILL_SETUP, "Bill Setup")
        handler.postDelayed({
            if (billTestActive && billSetupPending) stopBillTest("Bill Setup 逾時，未啟用收鈔")
        }, BILL_SETUP_TIMEOUT_MS)
        refreshBillPanel()
    }

    private fun finishStartBillTest(setup: BillSetup) {
        if (!billTestActive || !billSetupPending) return
        val typeIndex = setup.denominations.indexOfFirst { it?.compareTo(HUNDRED_DOLLARS) == 0 }
        if (typeIndex !in 0..15) {
            stopBillTest("Bill Setup 找不到100元面額")
            toast("安全停止：紙鈔機設定內找不到100元")
            return
        }
        val command = MdbCommands.billEnableSingleType(typeIndex)
        val decision = MdbSafetyPolicy.validateSingleBillEnable(command, typeIndex)
        if (!decision.allowed) {
            stopBillTest("100元 Enable 安全驗證失敗")
            return
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val delay = (MDB_COMMAND_INTERVAL_MS - (System.currentTimeMillis() - lastMdbTxAt)).coerceAtLeast(0L)
        handler.postDelayed({
            if (!billTestActive || !billSetupPending || !controller.isOpen(port)) return@postDelayed
            billEnabledTypeIndex = typeIndex
            val result = controller.write(port, command)
            if (result > 0) {
                lastMdbTxAt = System.currentTimeMillis()
                billSetupPending = false
                synchronized(dataLock) {
                    lastBillDescription = "只啟用 NT$100（類型#$typeIndex）；收到一張後自動停用"
                }
                refreshBillPanel()
            } else {
                stopBillTest("啟用100元失敗：$result", sendDisable = false)
            }
        }, delay)
    }

    private fun stopBillTest(reason: String, sendDisable: Boolean = true) {
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val wasActive = billTestActive || billSetupPending
        billTestActive = false
        billSetupPending = false
        billTestDeadline = 0L
        billEnabledTypeIndex = null
        if (sendDisable && controller.isOpen(port)) {
            sendSafeMdb(MdbCommands.BILL_DISABLE, "停止收鈔", enforceInterval = false)
        }
        synchronized(dataLock) { lastBillDescription = "收鈔已停止：$reason" }
        refreshBillPanel()
        if (wasActive) toast("收鈔已停止：$reason")
    }

    private fun sendSafeMdb(command: ByteArray, label: String, enforceInterval: Boolean = true) {
        val decision = MdbSafetyPolicy.validate(command)
        if (!decision.allowed) { toast("安全封鎖：${decision.message}"); return }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (!controller.isOpen(port)) { toast("ttyS1 尚未連線"); return }
        val now = System.currentTimeMillis()
        val delay = if (enforceInterval) (MDB_COMMAND_INTERVAL_MS - (now - lastMdbTxAt)).coerceAtLeast(0L) else 0L
        handler.postDelayed({
            if (!controller.isOpen(port)) return@postDelayed
            if (command.contentEquals(MdbCommands.COIN_ENABLE_FILL) && !coinFillActive) return@postDelayed
            val result = controller.write(port, command)
            if (result > 0) {
                lastMdbTxAt = System.currentTimeMillis()
            } else {
                toast("$label 傳送失敗：$result")
                if (command.contentEquals(MdbCommands.COIN_ENABLE_FILL)) stopCoinFill("啟用失敗", sendDisable = false)
            }
        }, delay)
    }

    private fun disconnectActivePort() {
        val port = activePort
        if (port.id == MDB_PORT_ID && controller.isOpen(port)) {
            if (cashPayment.snapshot().isActive) cancelCashPayment("手動中斷連線")
            if (coinFillActive) stopCoinFill("手動中斷連線")
            if (billTestActive || billSetupPending) handler.postDelayed({ stopBillTest("手動中斷連線") }, 250L)
            handler.postDelayed({ controller.close(port) }, 750L)
        } else controller.close(port)
    }

    private fun scheduleMdbStartupSafetyDisable() {
        mdbStartupSafetyReady = false
        val token = ++paymentCommandGeneration
        val commands = listOf(
            PaymentMdbCommand(MdbCommands.COIN_DISABLE, "連線後先停止收幣", MdbSafetyPolicy.validate(MdbCommands.COIN_DISABLE)),
            PaymentMdbCommand(MdbCommands.BILL_DISABLE, "連線後先停止收鈔", MdbSafetyPolicy.validate(MdbCommands.BILL_DISABLE))
        )
        runPaymentMdbSequence(token, commands, failOnError = false)
        handler.postDelayed({
            val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
            if (token == paymentCommandGeneration && controller.isOpen(port)) {
                mdbStartupSafetyReady = true
                lastPaymentDescription = "ttyS1 連線後已先排程停用收幣與收鈔，可安全建立訂單"
                refreshOrderPanel(); refreshPaymentPanel(); refreshMdbPanel(); refreshBillPanel()
            }
        }, 650L)
    }

    private fun recordUnexpectedMdbStop(reason: String) {
        if (!cashPayment.snapshot().isActive) return
        cashPayment.fail(reason)
        ticketOrder.stopPayment(reason)
        runCatching { persistTicketOrder("MDB_CONNECTION_LOST", reason) }
        notifyTicketPaymentStopped(reason)
    }

    override fun onState(port: PortProfile, state: String) = runOnUiThread {
        states[port.id] = state
        if (port.id == MDB_PORT_ID && state.contains("已連線") && state.contains("@ 9600")) {
            scheduleMdbStartupSafetyDisable()
        }
        if (port.id == MDB_PORT_ID && (state.contains("已中斷") || state.contains("錯誤"))) {
            mdbStartupSafetyReady = false
            coinFillActive = false
            coinFillDeadline = 0L
            billTestActive = false
            billSetupPending = false
            billTestDeadline = 0L
            paymentCommandGeneration++
            paymentDeadline = 0L
            paymentEnabledCoinTypes = emptySet()
            paymentEnabledBillTypeIndex = null
            recordUnexpectedMdbStop("ttyS1 已中斷")
            synchronized(dataLock) {
                lastMdbDescription = "ttyS1 已中斷；補幣模式已關閉"
                lastBillDescription = "ttyS1 已中斷；收鈔模式已關閉"
            }
        }
        refreshStatus(); refreshOrderPanel(); refreshPaymentPanel(); refreshMdbPanel(); refreshBillPanel()
    }
    override fun onError(port: PortProfile, message: String) = runOnUiThread {
        states[port.id] = "錯誤"
        if (port.id == MDB_PORT_ID) {
            mdbStartupSafetyReady = false
            coinFillActive = false
            coinFillDeadline = 0L
            billTestActive = false
            billSetupPending = false
            billTestDeadline = 0L
            paymentCommandGeneration++
            paymentDeadline = 0L
            paymentEnabledCoinTypes = emptySet()
            paymentEnabledBillTypeIndex = null
            recordUnexpectedMdbStop("ttyS1 錯誤：$message")
        }
        toast("${port.path}: $message"); refreshStatus(); refreshOrderPanel(); refreshPaymentPanel(); refreshMdbPanel(); refreshBillPanel()
    }

    // Called on each serial reader thread. Never touch Android Views here.
    override fun onPacket(event: PacketEvent) {
        val decoded = if (event.portId == MDB_PORT_ID && event.direction == PacketEvent.Direction.RX) {
            mdbDecoder.feed(event.data)
        } else emptyList()
        val interpretation = when {
            decoded.isNotEmpty() -> decoded.joinToString("｜") { it.description }
            event.portId == MDB_PORT_ID && event.direction == PacketEvent.Direction.TX -> {
                val billType = billEnabledTypeIndex ?: paymentEnabledBillTypeIndex
                val decision = if (billType != null && event.data.firstOrNull() == 0x34.toByte()) {
                    MdbSafetyPolicy.validateSingleBillEnable(event.data, billType)
                } else if (cashPayment.snapshot().isActive && event.data.firstOrNull() == 0x0C.toByte()) {
                    MdbSafetyPolicy.validateCoinPaymentEnable(event.data, paymentEnabledCoinTypes)
                } else {
                    MdbSafetyPolicy.validate(event.data)
                }
                if (decision.allowed) "安全 TX：${decision.message}" else "TX：${decision.message}"
            }
            else -> null
        }
        val enrichedEvent = if (interpretation != null) event.copy(interpretation = interpretation) else event
        var setupToEnable: BillSetup? = null
        var billEventToStop: BillEvent? = null
        var paymentSetupUpdated = false
        val paymentCashEvents = mutableListOf<Triple<CashKind, BigDecimal?, String>>()
        var paymentEscrowEvent = false
        synchronized(dataLock) {
            events.addLast(enrichedEvent)
            while (events.size > 2_000) events.removeFirst()
            val packetMap = if (enrichedEvent.direction == PacketEvent.Direction.RX) rxPackets else txPackets
            val byteMap = if (enrichedEvent.direction == PacketEvent.Direction.RX) rxBytes else txBytes
            packetMap[enrichedEvent.portId] = (packetMap[enrichedEvent.portId] ?: 0L) + 1L
            byteMap[enrichedEvent.portId] = (byteMap[enrichedEvent.portId] ?: 0L) + enrichedEvent.data.size
            if (enrichedEvent.direction == PacketEvent.Direction.RX) lastRxAt[enrichedEvent.portId] = enrichedEvent.timestamp
            decoded.forEachIndexed { decodedIndex, message ->
                message.setup?.let { setup ->
                    val values = setup.denominations.mapNotNull { it?.let { value -> "NT$${value.money()}" } }
                    mdbSetupSummary = "面額：${values.distinct().joinToString("、")}" 
                    if (cashPayment.snapshot().status == CashPaymentStatus.PREPARING) {
                        paymentCoinSetup = setup
                        paymentSetupUpdated = true
                    }
                }
                message.tubeStatus?.let { status ->
                    val setup = mdbDecoder.coinSetup
                    val values = status.counts.mapIndexedNotNull { index, count ->
                        setup?.denominations?.getOrNull(index)?.takeIf {
                            setup.tubeRouting.getOrElse(index) { false }
                        }?.let { value -> "NT$${value.money()}=$count" }
                    }
                    val zeroNote = if (values.isNotEmpty() && values.all { it.endsWith("=0") }) {
                        "（裝置全部回報 0；本次實收請看上方）"
                    } else ""
                    mdbTubeSummary = if (values.isEmpty()) {
                        "硬幣機 Tube 原始數量：${status.counts.joinToString()}"
                    } else {
                        "硬幣機 Tube 回報：${values.joinToString("、")}$zeroNote"
                    }
                }
                message.accepted?.let { accepted ->
                    if (coinFillActive) {
                        fillCoinCount++
                        if (accepted.typeIndex in fillCountsByType.indices) fillCountsByType[accepted.typeIndex]++
                        accepted.denomination?.let { fillValue = fillValue.add(it) }
                        if (accepted.route == CoinRoute.TUBE) fillTubeCount++ else fillOverflowCount++
                    }
                    if (cashPayment.snapshot().isActive) {
                        paymentCashEvents += Triple(
                            CashKind.COIN,
                            accepted.denomination,
                            "${sessionDir.name}:${event.sequence}:$decodedIndex"
                        )
                    }
                }
                message.billSetup?.let { setup ->
                    val values = setup.denominations.mapIndexedNotNull { index, value ->
                        value?.let { "#$index=NT$${it.money()}" }
                    }
                    billSetupSummary = "紙鈔面額：${values.joinToString("、")}｜鈔箱容量 ${setup.stackerCapacity}"
                    setupToEnable = setup
                    if (cashPayment.snapshot().status == CashPaymentStatus.PREPARING) {
                        paymentBillSetup = setup
                        paymentSetupUpdated = true
                    }
                }
                message.billEvent?.let { billEvent ->
                    lastBillDescription = message.description
                    if (billTestActive && billEvent.route == BillRoute.STACKED) {
                        billAcceptedCount++
                        billEvent.denomination?.let { billAcceptedValue = billAcceptedValue.add(it) }
                        billEventToStop = billEvent
                    } else if (billTestActive && billEvent.route == BillRoute.HELD_IN_ESCROW) {
                        billEventToStop = billEvent
                    }
                    if (cashPayment.snapshot().isActive && billEvent.route == BillRoute.STACKED) {
                        paymentCashEvents += Triple(
                            CashKind.BILL,
                            billEvent.denomination,
                            "${sessionDir.name}:${event.sequence}:$decodedIndex"
                        )
                    } else if (cashPayment.snapshot().isActive && billEvent.route == BillRoute.HELD_IN_ESCROW) {
                        paymentEscrowEvent = true
                    }
                }
                if (message.important) lastMdbDescription = message.description
            }
        }
        recorder.record(enrichedEvent)?.let { recorderError = it }
        setupToEnable?.let { setup -> handler.post { finishStartBillTest(setup) } }
        if (paymentSetupUpdated) handler.post { activateCashPaymentIfReady() }
        paymentCashEvents.forEach { cashEvent ->
            handler.post { processPaymentCash(cashEvent.first, cashEvent.second, cashEvent.third) }
        }
        if (paymentEscrowEvent) handler.post { failCashPayment("紙鈔意外進入 Escrow，已緊急停用") }
        billEventToStop?.let { billEvent ->
            handler.post {
                val reason = when {
                    billEvent.route == BillRoute.HELD_IN_ESCROW -> "意外進入 Escrow，已緊急停用"
                    billEvent.denomination?.compareTo(HUNDRED_DOLLARS) == 0 -> "已收到單張100元，自動停用"
                    else -> "收到非100元事件，已安全停用"
                }
                stopBillTest(reason)
            }
        }
    }

    private fun refreshAll(forceLog: Boolean = false) {
        refreshStatus(); refreshStats(); refreshQueue(); refreshOrderPanel(); refreshPaymentPanel(); refreshMdbPanel(); refreshBillPanel()
        if (!paused) { if (forceLog) lastRenderKey = ""; refreshLog() }
    }

    private fun refreshStatus() {
        statusText.text = ExplorerDefaults.ports.joinToString("   ") { "${it.path}: ${states[it.id]}" }
    }

    private fun refreshStats() {
        val lines = synchronized(dataLock) {
            ExplorerDefaults.ports.map { port ->
                val last = lastRxAt[port.id]?.let { clock.format(Date(it)) } ?: "-"
                "${port.path.padEnd(12)} RX ${rxPackets[port.id] ?: 0}/${rxBytes[port.id] ?: 0}B   TX ${txPackets[port.id] ?: 0}/${txBytes[port.id] ?: 0}B   Q ${queues.getValue(port.id).size}   Last $last"
            }
        }
        statsText.text = lines.joinToString("\n") + "\nUI: 500ms 批次更新（2 FPS）" + (recorderError?.let { "   Record ERROR: $it" } ?: "")
    }

    private fun refreshPaymentPanel() {
        val snapshot = cashPayment.snapshot()
        if (snapshot.isActive && paymentDeadline > 0L && System.currentTimeMillis() >= paymentDeadline) {
            timeoutCashPayment()
            return
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val connected = controller.isOpen(port)
        val seconds = if (snapshot.isActive && paymentDeadline > 0L) {
            ((paymentDeadline - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L
        } else 0L
        val breakdown = snapshot.counts.entries.sortedBy { it.key }
            .joinToString("、") { "NT$${it.key}×${it.value}" }
            .ifEmpty { "尚無" }
        val enabledCoins = paymentCoinSetup?.let {
            PaymentAcceptancePolicy.labels(it, paymentEnabledCoinTypes).joinToString("／")
        }.orEmpty().ifEmpty { "無" }
        val countdown = if (snapshot.isActive) "｜剩 ${seconds} 秒" else ""
        val moneyLine = if (snapshot.target > 0) {
            "應付 NT$${snapshot.target}｜已付 NT$${snapshot.paid}｜尚差 NT$${snapshot.remaining}" +
                if (snapshot.overpaid > 0) "｜超收 NT$${snapshot.overpaid}" else ""
        } else "應付金額尚未設定"
        paymentStatusText.text = "${paymentStatusLabel(snapshot.status)}$countdown｜$moneyLine\n" +
            "實收：$breakdown｜硬幣 ${snapshot.coinCount} 枚／紙鈔 ${snapshot.billCount} 張\n" +
            "目前入口：硬幣 $enabledCoins｜100元紙鈔${if (paymentEnabledBillTypeIndex == null) "停用" else "啟用"}\n" +
            "最後：$lastPaymentDescription\n安全限制：不找零；取消後若已收現金，必須人工退款或記帳"
        paymentStatusText.setBackgroundColor(when (snapshot.status) {
            CashPaymentStatus.COMPLETED -> android.graphics.Color.parseColor("#C8E6C9")
            CashPaymentStatus.CANCELED, CashPaymentStatus.TIMED_OUT, CashPaymentStatus.ERROR -> android.graphics.Color.parseColor("#FFCDD2")
            CashPaymentStatus.PREPARING, CashPaymentStatus.ACCEPTING -> android.graphics.Color.parseColor("#FFF9C4")
            CashPaymentStatus.IDLE -> android.graphics.Color.parseColor("#E3F2FD")
        })
        val order = ticketOrder.snapshot()
        val canCreateOrder = order == null || order.isTerminal
        startPaymentButton.isEnabled = ticketStorageFault == null && connected && mdbStartupSafetyReady && !snapshot.isActive &&
            !snapshot.requiresReconciliation && canCreateOrder && !coinFillActive && !billTestActive && !billSetupPending
        cancelPaymentButton.isEnabled = connected && snapshot.isActive
        reconcilePaymentButton.isEnabled = snapshot.requiresReconciliation || order?.requiresReconciliation == true
        paymentAmountInput.isEnabled = !snapshot.isActive && !snapshot.requiresReconciliation && canCreateOrder
        orderIdInput.isEnabled = !snapshot.isActive && !snapshot.requiresReconciliation && canCreateOrder
    }

    private fun refreshMdbPanel() {
        if (coinFillActive && System.currentTimeMillis() >= coinFillDeadline) {
            stopCoinFill("60 秒安全逾時")
            return
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val connected = controller.isOpen(port)
        val snapshot = synchronized(dataLock) {
            val seconds = if (coinFillActive) ((coinFillDeadline - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L else 0L
            val state = if (coinFillActive) "補幣中（剩 ${seconds} 秒）" else "補幣已停用"
            "$state｜本次已收 $fillCoinCount 枚／NT$${fillValue.money()}｜儲幣筒 $fillTubeCount｜溢幣箱 $fillOverflowCount\n" +
                "本次實收明細：${fillSessionBreakdown()}\n" +
                "$mdbSetupSummary\n$mdbTubeSummary\n最後：$lastMdbDescription"
        }
        mdbSafetyStatusText.text = snapshot
        val paymentActive = cashPayment.snapshot().isActive
        val orderBusy = ticketOrder.snapshot()?.let { !it.isTerminal } == true
        startCoinFillButton.isEnabled = connected && mdbStartupSafetyReady && !paymentActive && !orderBusy && !coinFillActive && !billTestActive && !billSetupPending
        stopCoinFillButton.isEnabled = connected && !paymentActive && !orderBusy
        tubeInfoButton.isEnabled = connected && mdbStartupSafetyReady && !paymentActive && !orderBusy && !billTestActive && !billSetupPending
    }

    private fun refreshBillPanel() {
        if (billTestActive && System.currentTimeMillis() >= billTestDeadline) {
            stopBillTest("60 秒安全逾時")
            return
        }
        val port = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        val connected = controller.isOpen(port)
        val snapshot = synchronized(dataLock) {
            val seconds = if (billTestActive) {
                ((billTestDeadline - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1000L
            } else 0L
            val state = when {
                billSetupPending -> "驗證紙鈔設定中（尚未啟用收鈔）"
                billTestActive -> "只收100元測試中（剩 ${seconds} 秒；收到一張即停）"
                else -> "收鈔已停用"
            }
            "$state｜本次已收 $billAcceptedCount 張／NT$${billAcceptedValue.money()}\n" +
                "$billSetupSummary\n最後：$lastBillDescription\n" +
                "安全限制：收鈔使用 ttyS1；ttyS3 是出鈔找零機，全部 TX 封鎖"
        }
        billSafetyStatusText.text = snapshot
        val paymentActive = cashPayment.snapshot().isActive
        val orderBusy = ticketOrder.snapshot()?.let { !it.isTerminal } == true
        startBillTestButton.isEnabled = connected && mdbStartupSafetyReady && !paymentActive && !orderBusy && !billTestActive && !billSetupPending && !coinFillActive
        stopBillTestButton.isEnabled = connected && !paymentActive && !orderBusy
    }

    private fun refreshQueue() {
        findViewById<TextView>(R.id.queueText).text = queues.getValue(activePort.id).let { q ->
            if (q.isEmpty()) "${activePort.label} Queue：空" else q.mapIndexed { i, b -> "${i + 1}. ${HexCodec.encode(b)}" }.joinToString("\n")
        }
    }

    private data class DisplayRow(var event: PacketEvent, var repeats: Int = 1)

    private fun refreshLog() {
        val selected = activePort.id
        val snapshot = synchronized(dataLock) { events.filter { it.portId == selected }.takeLast(1_000) }
        val renderKey = "$selected:${snapshot.lastOrNull()?.sequence ?: 0}:${snapshot.size}"
        if (renderKey == lastRenderKey) return
        lastRenderKey = renderKey
        val rows = ArrayList<DisplayRow>()
        snapshot.forEach { event ->
            val last = rows.lastOrNull()
            if (last != null && last.event.direction == event.direction && last.event.data.contentEquals(event.data)) {
                last.event = event; last.repeats++
            } else rows.add(DisplayRow(event))
        }
        logText.text = rows.takeLast(100).joinToString("\n") { row ->
            val event = row.event
            val delta = event.deltaMs?.let { " +${it}ms" } ?: ""
            val response = event.responseTo?.let { " RESPONSE→TX#$it" } ?: ""
            val repeated = if (row.repeats > 1) " REPEATED×${row.repeats}" else ""
            val decoded = event.interpretation?.let { "\n  解碼 $it" } ?: ""
            "[${clock.format(Date(event.timestamp))}] ${event.direction} #${event.sequence}$delta$response$repeated\n  HEX ${HexCodec.encode(event.data)}\n  ASCII ${HexCodec.ascii(event.data)} · ${event.data.size}B$decoded"
        }
        logScroll.post { logScroll.fullScroll(ScrollView.FOCUS_DOWN) }
    }

    private fun exportSession() {
        if (exportRunning) { toast("ZIP 還在建立中，請稍候"); return }
        exportRunning = true
        exportButton.isEnabled = false
        exportButton.text = "建立中…"
        exportStatusText.text = "匯出狀態：正在整理並驗證 Session ZIP…"
        Thread({
            try {
                recorder.flush()
                File(sessionDir, "commands.txt").writeText(ExplorerDefaults.commands.joinToString("\n") { "[${it.group}] ${it.name} | ${it.hex} | ${it.description}" })
                val mdbSummary = synchronized(dataLock) {
                    "Monster Hardware Explorer v1.0 Sprint 5 Ticket Cash Integration\n" +
                        "補幣啟用=${coinFillActive}\n已收枚數=$fillCoinCount\n已收金額=${fillValue.money()}\n" +
                        "本次實收明細=${fillSessionBreakdown()}\n" +
                        "進入儲幣筒=$fillTubeCount\n進入溢幣箱=$fillOverflowCount\n" +
                        "$mdbSetupSummary\n$mdbTubeSummary\n最後狀態=$lastMdbDescription\n" +
                        "庫存說明=Tube Info 是硬幣機自行回報；本次實收依收幣事件獨立統計，兩者不互相覆蓋\n" +
                        "安全政策=封鎖硬幣 Reset 08、出幣 0D、支付 0F 02、紙鈔 Reset 30、Escrow 35 與所有未知 MDB 指令\n"
                }
                File(sessionDir, "mdb_summary.txt").writeText(mdbSummary)
                val billSummary = synchronized(dataLock) {
                    "Monster Hardware Explorer v1.0 Sprint 5 Ticket Cash Integration\n" +
                        "收鈔啟用=${billTestActive && !billSetupPending}\n" +
                        "設定驗證中=$billSetupPending\n" +
                        "本次收鈔張數=$billAcceptedCount\n" +
                        "本次收鈔金額=${billAcceptedValue.money()}\n" +
                        "啟用類型=${billEnabledTypeIndex?.let { "#$it" } ?: "無"}\n" +
                        "$billSetupSummary\n最後狀態=$lastBillDescription\n" +
                        "架構說明=紙鈔收取與硬幣共用 ttyS1 MDB；ttyS3 是出鈔找零機\n" +
                        "安全政策=只允許 Bill Setup 31、Poll 33、Disable 34 00000000，專用流程僅啟用 Setup 對應的單一100元類型且 Escrow 關閉\n" +
                        "ttyS3政策=全部 TX 封鎖；未實作出鈔、退鈔或 Reset\n"
                }
                File(sessionDir, "bill_summary.txt").writeText(billSummary)
                val paymentSummary = cashPayment.snapshot().let { snapshot ->
                    val breakdown = snapshot.counts.entries.sortedBy { it.key }
                        .joinToString("、") { "NT$${it.key}×${it.value}" }.ifEmpty { "尚無" }
                    "Monster Hardware Explorer v1.0 Sprint 5 Ticket Cash Integration\n" +
                        "付款狀態=${paymentStatusLabel(snapshot.status)}\n" +
                        "應付金額=${snapshot.target}\n實收金額=${snapshot.paid}\n尚差金額=${snapshot.remaining}\n超收金額=${snapshot.overpaid}\n" +
                        "硬幣枚數=${snapshot.coinCount}\n紙鈔張數=${snapshot.billCount}\n實收明細=$breakdown\n" +
                        "開始時間=${snapshot.startedAt ?: "無"}\n結束時間=${snapshot.finishedAt ?: "無"}\n" +
                        "最後狀態=${snapshot.message}\n最後硬體動作=$lastPaymentDescription\n" +
                        "待人工處理=${snapshot.requiresReconciliation}\n" +
                        "安全政策=只收實機驗證的1、5、10、50元硬幣與100元紙鈔；依尚差金額動態停用過大面額；不找零、不出幣、不出鈔、不使用Escrow\n"
                }
                File(sessionDir, "payment_summary.txt").writeText(paymentSummary)
                val ticketSummary = ticketOrder.snapshot()?.let { order ->
                    val breakdown = order.counts.entries.sortedBy { it.key }
                        .joinToString("、") { "NT$${it.key}×${it.value}" }.ifEmpty { "尚無" }
                    "Monster Hardware Explorer v1.0 Sprint 5 Ticket Cash Integration\n" +
                        "訂單編號=${order.orderId}\n售票App=${order.ticketAppPackage ?: "未指定"}\n訂單狀態=${ticketOrderStatusLabel(order.status)}\n" +
                        "應付金額=${order.amount}\n實收金額=${order.paid}\n尚差金額=${order.remaining}\n超收金額=${order.overpaid}\n" +
                        "硬幣枚數=${order.coinCount}\n紙鈔張數=${order.billCount}\n實收明細=$breakdown\n" +
                        "付款ID=${order.paymentId ?: "無"}\n出票授權ID=${order.printAuthorizationId ?: "無"}\n" +
                        "出票通知次數=${order.dispatchCount}\n已記錄現金事件=${order.processedCashEventIds.size}\n" +
                        "建立時間=${order.createdAt}\n付款完成時間=${order.paidAt ?: "無"}\n" +
                        "最近通知時間=${order.lastDispatchAt ?: "無"}\n出票確認時間=${order.issuedAt ?: "無"}\n" +
                        "資料版本=${order.revision}\n最後狀態=${order.message}\n" +
                        "安全政策=訂單ID防重放；現金事件ID防重複入帳；付款剛好完成才建立唯一出票授權；重送沿用同一授權ID；App重啟不續收未完成現金\n"
                } ?: "Monster Hardware Explorer v1.0 Sprint 5 Ticket Cash Integration\n目前沒有售票訂單\n"
                File(sessionDir, "ticket_order_summary.txt").writeText(ticketSummary)
                File(sessionDir, "ticket_order_events.log").writeText(ticketOrderStore.readAudit())
                val zipFile = File(sessionDir.parentFile, "${sessionDir.name}.zip")
                val tempFile = File(sessionDir.parentFile, ".${sessionDir.name}.zip.tmp")
                if (tempFile.exists()) tempFile.delete()
                ZipOutputStream(FileOutputStream(tempFile)).use { zip ->
                    sessionDir.listFiles()?.filter { it.isFile }?.forEach { file ->
                        zip.putNextEntry(ZipEntry(file.name)); file.inputStream().use { it.copyTo(zip) }; zip.closeEntry()
                    }
                }
                ZipFile(tempFile).use { archive ->
                    check(archive.getEntry("session.log") != null) { "ZIP 缺少 session.log" }
                    check(archive.getEntry("commands.txt") != null) { "ZIP 缺少 commands.txt" }
                    check(archive.getEntry("mdb_summary.txt") != null) { "ZIP 缺少 mdb_summary.txt" }
                    check(archive.getEntry("bill_summary.txt") != null) { "ZIP 缺少 bill_summary.txt" }
                    check(archive.getEntry("payment_summary.txt") != null) { "ZIP 缺少 payment_summary.txt" }
                    check(archive.getEntry("ticket_order_summary.txt") != null) { "ZIP 缺少 ticket_order_summary.txt" }
                    check(archive.getEntry("ticket_order_events.log") != null) { "ZIP 缺少 ticket_order_events.log" }
                }
                if (zipFile.exists() && !zipFile.delete()) error("無法替換舊 ZIP")
                if (!tempFile.renameTo(zipFile)) { tempFile.copyTo(zipFile, overwrite = true); tempFile.delete() }
                check(zipFile.exists() && zipFile.length() > 0L) { "ZIP 檔案為空" }
                runOnUiThread { showExportSuccess(zipFile) }
            } catch (t: Throwable) {
                runOnUiThread {
                    exportRunning = false; exportButton.isEnabled = true; exportButton.text = "匯出 ZIP"
                    exportStatusText.text = "匯出狀態：失敗｜${t.message ?: t.javaClass.simpleName}"
                    android.app.AlertDialog.Builder(this).setTitle("Session ZIP 建立失敗")
                        .setMessage(t.message ?: t.javaClass.simpleName).setPositiveButton("確定", null).show()
                }
            }
        }, "ExplorerZipExporter").start()
    }

    private fun showExportSuccess(zipFile: File) {
        exportRunning = false
        lastZipFile = zipFile
        exportButton.isEnabled = true; exportButton.text = "重新匯出"
        shareLastButton.isEnabled = true; saveLastButton.isEnabled = true
        val sizeText = formatBytes(zipFile.length())
        exportStatusText.text = "匯出狀態：成功｜${zipFile.name}｜$sizeText"
        android.app.AlertDialog.Builder(this)
            .setTitle("Session ZIP 建立成功")
            .setMessage("檔名：${zipFile.name}\n大小：$sizeText\n\nApp 內部位置：\n${zipFile.absolutePath}\n\n你可以分享，或另存到自己選擇的資料夾。")
            .setPositiveButton("分享 ZIP") { _, _ -> shareZip(zipFile) }
            .setNeutralButton("儲存副本") { _, _ -> chooseSaveLocation(zipFile) }
            .setNegativeButton("稍後") { _, _ -> }
            .show()
    }

    private fun shareZip(zipFile: File) {
        try {
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", zipFile)
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "application/zip"; putExtra(Intent.EXTRA_STREAM, uri)
                clipData = ClipData.newRawUri(zipFile.name, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }, "分享 Explorer Session"))
        } catch (e: ActivityNotFoundException) {
            toast("系統沒有可分享 ZIP 的 App，請使用『儲存副本』")
        } catch (t: Throwable) { toast("無法分享：${t.message}") }
    }

    private fun chooseSaveLocation(zipFile: File) {
        pendingSaveZip = zipFile
        try {
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "application/zip"
                putExtra(Intent.EXTRA_TITLE, zipFile.name)
            }, REQUEST_SAVE_ZIP)
        } catch (e: ActivityNotFoundException) {
            pendingSaveZip = null
            toast("系統沒有檔案儲存程式；ZIP 仍已成功建立在 App 內部位置")
        }
    }

    @Deprecated("Android 8.1 compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_SAVE_ZIP) return
        val source = pendingSaveZip.also { pendingSaveZip = null } ?: return
        val target = data?.data
        if (resultCode != RESULT_OK || target == null) { toast("已取消儲存副本"); return }
        Thread({
            try {
                contentResolver.openOutputStream(target)?.use { output -> source.inputStream().use { it.copyTo(output) } }
                    ?: error("無法開啟儲存位置")
                runOnUiThread { toast("ZIP 副本儲存成功") }
            } catch (t: Throwable) { runOnUiThread { toast("儲存失敗：${t.message}") } }
        }, "ExplorerZipSaver").start()
    }

    private fun formatBytes(bytes: Long): String = when {
        bytes >= 1024L * 1024L -> String.format(Locale.US, "%.2f MB", bytes / (1024.0 * 1024.0))
        bytes >= 1024L -> String.format(Locale.US, "%.1f KB", bytes / 1024.0)
        else -> "$bytes B"
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    private fun fillSessionBreakdown(): String {
        val setup = mdbDecoder.coinSetup
        val entries = fillCountsByType.mapIndexedNotNull { index, count ->
            if (count <= 0L) return@mapIndexedNotNull null
            val label = setup?.denominations?.getOrNull(index)?.let { "NT$${it.money()}" } ?: "類型#$index"
            "$label×$count"
        }
        return entries.ifEmpty { listOf("尚無") }.joinToString("、")
    }

    override fun onPause() {
        if (cashPayment.snapshot().isActive) cancelCashPayment("App 進入背景", notifyUser = false)
        if (coinFillActive) stopCoinFill("App 進入背景")
        if (billTestActive || billSetupPending) stopBillTest("App 進入背景")
        super.onPause()
    }

    override fun onDestroy() {
        val mdbPort = ExplorerDefaults.ports.first { it.id == MDB_PORT_ID }
        if (controller.isOpen(mdbPort)) {
            controller.write(mdbPort, MdbCommands.COIN_DISABLE)
            runCatching { Thread.sleep(MDB_COMMAND_INTERVAL_MS) }
            controller.write(mdbPort, MdbCommands.BILL_DISABLE)
        }
        handler.removeCallbacksAndMessages(null)
        controller.closeAll()
        recorder.close()
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_SAVE_ZIP = 901
        private const val MDB_PORT_ID = "mdb"
        private const val NOTE_DISPENSER_PORT_ID = "note"
        private const val MDB_COMMAND_INTERVAL_MS = 200L
        private const val COIN_FILL_TIMEOUT_MS = 60_000L
        private const val BILL_TEST_TIMEOUT_MS = 60_000L
        private const val BILL_SETUP_TIMEOUT_MS = 5_500L
        private const val CASH_PAYMENT_TIMEOUT_MS = 120_000L
        private const val PAYMENT_SETUP_TIMEOUT_MS = 8_000L
        private val HUNDRED_DOLLARS = BigDecimal("100")
    }
}

private class Selected(private val run: () -> Unit) : android.widget.AdapterView.OnItemSelectedListener {
    override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: android.view.View?, position: Int, id: Long) = run()
    override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
}
