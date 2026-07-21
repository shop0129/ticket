package com.littlemonster.hardwareconsole

import com.littlemonster.serial.SerialManager
import java.util.concurrent.ConcurrentHashMap

class MultiPortController(private val listener: Listener) {
    interface Listener {
        fun onState(port: PortProfile, state: String)
        fun onPacket(event: PacketEvent)
        fun onError(port: PortProfile, message: String)
    }

    private data class Channel(
        val manager: SerialManager = SerialManager(),
        var rxSequence: Long = 0,
        var txSequence: Long = 0,
        var lastRxAt: Long = 0,
        var lastTxAt: Long = 0,
        var lastTxSequence: Long = 0
    )

    private val channels = ConcurrentHashMap<String, Channel>()

    fun isOpen(port: PortProfile): Boolean = channels[port.id]?.manager?.isOpen == true

    fun open(port: PortProfile, baud: Int) {
        close(port)
        val channel = Channel()
        channels[port.id] = channel
        listener.onState(port, "連線中")
        channel.manager.open(port.path, baud, object : SerialManager.Listener {
            override fun onOpened(path: String, baudRate: Int) = listener.onState(port, "已連線 @ $baudRate")
            override fun onBytes(data: ByteArray) {
                val now = System.currentTimeMillis()
                val delta = channel.lastRxAt.takeIf { it > 0 }?.let { now - it }
                channel.lastRxAt = now
                channel.rxSequence++
                val response = channel.lastTxSequence.takeIf { channel.lastTxAt > 0 && now - channel.lastTxAt <= 1500 }
                listener.onPacket(PacketEvent(port.id, PacketEvent.Direction.RX, channel.rxSequence, now, data.copyOf(), delta, response))
            }
            override fun onError(message: String) = listener.onError(port, message)
            override fun onClosed() = listener.onState(port, "已中斷")
        })
    }

    fun write(port: PortProfile, data: ByteArray): Int {
        val channel = channels[port.id] ?: return -9
        val result = channel.manager.write(data)
        if (result > 0) {
            val now = System.currentTimeMillis()
            channel.txSequence++
            channel.lastTxAt = now
            channel.lastTxSequence = channel.txSequence
            listener.onPacket(PacketEvent(port.id, PacketEvent.Direction.TX, channel.txSequence, now, data.copyOf(result.coerceAtMost(data.size)), null, null))
        }
        return result
    }

    fun close(port: PortProfile) { channels.remove(port.id)?.manager?.close() }
    fun closeAll() { channels.values.forEach { it.manager.close() }; channels.clear() }
}
