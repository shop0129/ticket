package com.littlemonster.hardwareconsole

import com.littlemonster.serial.HexCodec
import java.io.BufferedOutputStream
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter

/** Keeps disk I/O away from Android's main thread and preserves the full session. */
class SessionRecorder(private val directory: File) {
    private val rxStreams = mutableMapOf<String, BufferedOutputStream>()
    private val txStreams = mutableMapOf<String, BufferedOutputStream>()
    private val logWriter: BufferedWriter
    private var writesSinceFlush = 0
    private var lastFlushAt = System.currentTimeMillis()

    init {
        directory.mkdirs()
        ExplorerDefaults.ports.forEach { port ->
            rxStreams[port.id] = BufferedOutputStream(FileOutputStream(File(directory, "${port.id}_rx_raw.bin"), true), 16 * 1024)
            txStreams[port.id] = BufferedOutputStream(FileOutputStream(File(directory, "${port.id}_tx_raw.bin"), true), 16 * 1024)
        }
        logWriter = BufferedWriter(OutputStreamWriter(FileOutputStream(File(directory, "session.log"), true), Charsets.UTF_8), 32 * 1024)
        logWriter.appendLine("timestamp,port,direction,sequence,delta_ms,response_to,hex,interpretation")
        logWriter.flush()
    }

    @Synchronized
    fun record(event: PacketEvent): String? = try {
        val stream = if (event.direction == PacketEvent.Direction.RX) rxStreams[event.portId] else txStreams[event.portId]
        stream?.write(event.data)
        logWriter.append(event.timestamp.toString()).append(',')
            .append(event.portId).append(',')
            .append(event.direction.name).append(',')
            .append(event.sequence.toString()).append(',')
            .append(event.deltaMs?.toString() ?: "").append(',')
            .append(event.responseTo?.toString() ?: "").append(',')
            .append(HexCodec.encode(event.data)).append(',')
            .append(csvCell(event.interpretation ?: "")).append('\n')
        writesSinceFlush++
        val now = System.currentTimeMillis()
        if (writesSinceFlush >= 100 || now - lastFlushAt >= 2_000L) flushLocked(now)
        null
    } catch (t: Throwable) {
        t.message ?: t.javaClass.simpleName
    }

    @Synchronized
    fun flush() = flushLocked(System.currentTimeMillis())

    private fun flushLocked(now: Long) {
        rxStreams.values.forEach { it.flush() }
        txStreams.values.forEach { it.flush() }
        logWriter.flush()
        writesSinceFlush = 0
        lastFlushAt = now
    }

    @Synchronized
    fun close() {
        runCatching { flushLocked(System.currentTimeMillis()) }
        rxStreams.values.forEach { runCatching { it.close() } }
        txStreams.values.forEach { runCatching { it.close() } }
        runCatching { logWriter.close() }
    }

    private fun csvCell(value: String): String = "\"${value.replace("\"", "\"\"")}\""
}
