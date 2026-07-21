package com.littlemonster.serial

object HexCodec {
    fun encode(data: ByteArray): String =
        data.joinToString(" ") { "%02X".format(it.toInt() and 0xFF) }

    fun decode(input: String): ByteArray {
        val normalized = input
            .replace("0x", "", ignoreCase = true)
            .replace(Regex("[^0-9A-Fa-f]"), "")
        require(normalized.isNotEmpty()) { "請輸入 HEX，例如：33 30 0D 0A" }
        require(normalized.length % 2 == 0) { "HEX 位數必須是偶數" }
        return ByteArray(normalized.length / 2) { index ->
            normalized.substring(index * 2, index * 2 + 2).toInt(16).toByte()
        }
    }

    fun ascii(data: ByteArray): String = buildString {
        data.forEach { byte ->
            when (val value = byte.toInt() and 0xFF) {
                0x0D -> append("\\r")
                0x0A -> append("\\n")
                0x09 -> append("\\t")
                in 0x20..0x7E -> append(value.toChar())
                else -> append('.')
            }
        }
    }
}
