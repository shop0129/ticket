package com.littlemonster.serial

internal object NativeSerial {
    init { System.loadLibrary("monster_serial") }

    external fun open(path: String, baudRate: Int): Int
    external fun read(fd: Int, buffer: ByteArray, timeoutMs: Int): Int
    external fun write(fd: Int, data: ByteArray): Int
    external fun close(fd: Int)
}
