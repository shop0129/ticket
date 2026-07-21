package com.littlemonster.serial

import java.util.concurrent.atomic.AtomicBoolean

class SerialManager {
    interface Listener {
        fun onOpened(path: String, baudRate: Int)
        fun onBytes(data: ByteArray)
        fun onError(message: String)
        fun onClosed()
    }

    private val running = AtomicBoolean(false)
    private val fdLock = Any()
    @Volatile private var fd: Int = -1
    @Volatile private var worker: Thread? = null

    val isOpen: Boolean get() = fd >= 0 && running.get()

    @Synchronized
    fun open(path: String, baudRate: Int, listener: Listener) {
        close()
        val opened = NativeSerial.open(path, baudRate)
        if (opened < 0) {
            listener.onError("無法開啟 $path，錯誤碼 $opened。請確認 chmod、SELinux 與原廠 App 是否占用序列埠。")
            return
        }
        synchronized(fdLock) { fd = opened }
        running.set(true)
        listener.onOpened(path, baudRate)

        worker = Thread({
            val buffer = ByteArray(2048)
            try {
                while (running.get()) {
                    val count = NativeSerial.read(opened, buffer, 250)
                    when {
                        count > 0 -> listener.onBytes(buffer.copyOf(count))
                        count < -1 -> {
                            listener.onError("讀取失敗，錯誤碼 $count")
                            break
                        }
                    }
                }
            } catch (t: Throwable) {
                if (running.get()) listener.onError(t.message ?: t.javaClass.simpleName)
            } finally {
                running.set(false)
                synchronized(fdLock) {
                    if (fd == opened) {
                        NativeSerial.close(opened)
                        fd = -1
                    }
                }
                listener.onClosed()
            }
        }, "MonsterSerialReader").also { it.start() }
    }

    fun write(data: ByteArray): Int {
        require(data.isNotEmpty()) { "不可傳送空資料" }
        val current = synchronized(fdLock) { fd }
        if (current < 0 || !running.get()) return -9
        return NativeSerial.write(current, data)
    }

    @Synchronized
    fun close() {
        running.set(false)
        synchronized(fdLock) {
            val current = fd
            fd = -1
            if (current >= 0) NativeSerial.close(current)
        }
        worker?.interrupt()
        worker = null
    }
}
